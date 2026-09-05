const gmailClient = require('../integrations/gmailClient');
const oauthAccountModel = require('../models/oauthAccountModel');
const processedEmailModel = require('../models/processedEmailModel');
const candidateModel = require('../models/candidateModel');
const applicationModel = require('../models/applicationModel');
const tokenCrypto = require('../utils/tokenCrypto');
const { isLikelyJobRelated } = require('../utils/emailPrefilter');
const { extractApplication } = require('../llm/extractApplication');
const { findMatchingApplication, isForwardMove } = require('../reconcile');

const PROVIDER = 'google';

// Google rejects a refresh_token with invalid_grant once it's dead -- most
// commonly here because the OAuth consent screen is still in Testing mode,
// which caps refresh tokens at 7 days regardless of how recently they were
// used. gaxios/googleapis surfaces this a few different ways depending on
// where in the request it fails, so I check the shapes I've actually seen
// rather than relying on one.
function isExpiredGrantError(err) {
  return (
    err?.response?.data?.error === 'invalid_grant' ||
    err?.cause?.message === 'invalid_grant' ||
    err?.message === 'invalid_grant'
  );
}

// Gmail's Date header is RFC 2822 (e.g. "Mon, 10 Aug 2026 00:00:00 +0000"),
// one of the formats JS's Date constructor is spec-guaranteed to parse. I
// store just the date part -- a DATE column, not a DATETIME -- since that's
// all "date applied" ever needs. Returns null (rather than throwing) on a
// missing or unparseable header, so one malformed email can't crash the
// sync; the caller falls back to something else when this is null.
function parseEmailDate(rawDate) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

// Persists a refreshed access token back onto the account row. googleapis
// calls this itself (via the 'tokens' event on the OAuth2 client) whenever
// it had to use the refresh_token mid-request -- this is the only place that
// happens, so it's the only place I need to catch it and save the result.
function makeTokenRefreshHandler(userId) {
  return async (newTokens) => {
    try {
      const accessToken = tokenCrypto.encrypt(newTokens.access_token);
      const expiresAt = new Date(newTokens.expiry_date);
      if (newTokens.refresh_token) {
        // Rare: Google issued a new refresh_token too. Store both.
        await oauthAccountModel.upsertTokens(userId, PROVIDER, {
          accessToken,
          refreshToken: tokenCrypto.encrypt(newTokens.refresh_token),
          expiresAt,
        });
      } else {
        // The normal case: only the access token rotated.
        await oauthAccountModel.updateAccessToken(userId, PROVIDER, { accessToken, expiresAt });
      }
    } catch (err) {
      // Not fatal to the sync in progress -- worst case the next sync
      // refreshes again. But I do want this visible if it keeps happening.
      console.error('Failed to persist a refreshed Gmail token', err);
    }
  };
}

// Runs the LLM step for one shortlisted message and reconciles the result
// against the user's existing applications (docs/PHASE2.md's "Reconcile"
// step):
//   - not job-related (per the LLM, not the prefilter) -> mark processed, drop.
//   - job-related, no matching application (normalized company + role) ->
//     create a candidate proposing a NEW application.
//   - job-related, matches an application, and the extracted status is a
//     forward move (applied < interviewing < offer/rejected < accepted) ->
//     create a candidate with matched_application_id set, proposing a
//     status update.
//   - job-related, matches an application, but NOT a forward move (same
//     stage restated, or a status this ordering can't place) -> nothing to
//     propose. Mark processed, drop.
//   - job-related, matches a candidate ALREADY sitting in the review queue
//     (not yet accepted/dismissed) -> merge into that candidate in place
//     instead of proposing a second one. This is the common real case: an
//     "application received" email and an interview invite both land before
//     the user has reviewed the first -- see mergeIntoPendingCandidate.
// IMPORTANT: an infrastructure failure (Ollama down, bad response) is left
// UNprocessed on purpose -- see the note on extractApplication() for why:
// "couldn't reach the LLM" must never be recorded the same way as "the LLM
// looked at this and it's not job-related", or a temporary outage would
// permanently drop mail that was never actually evaluated.
//
// pendingCandidates is mutated in place (a new candidate is pushed onto it,
// a merged one has its fields updated) so later messages in the SAME sync
// run also reconcile correctly against each other, not just against what
// was already in the review queue when the sync started.
async function processShortlistedMessage(userId, gmail, summary, existingApplications, pendingCandidates) {
  let extraction;
  try {
    const body = await gmailClient.getMessageBody(gmail, summary.id);
    const emailText = `Subject: ${summary.subject}\nFrom: ${summary.from}\n\n${body}`;
    extraction = await extractApplication(emailText);
  } catch (err) {
    console.error(`LLM extraction failed for message ${summary.id}, leaving unprocessed for retry`, err);
    return { candidateCreated: false };
  }

  if (!extraction.is_job_related) {
    await processedEmailModel.markProcessed(userId, summary.id);
    return { candidateCreated: false };
  }

  // Pending candidates take priority over the applications table: one still
  // awaiting review reflects a MORE RECENT known status than applications
  // (which only ever changes when a candidate is accepted), so if this
  // company/role already has one sitting in the queue, that's the state to
  // reconcile against.
  const matchedCandidate = findMatchingApplication(pendingCandidates, {
    company: extraction.company,
    role: extraction.role,
  });

  if (matchedCandidate) {
    if (!isForwardMove(matchedCandidate.status, extraction.status)) {
      await processedEmailModel.markProcessed(userId, summary.id);
      return { candidateCreated: false };
    }
    await candidateModel.mergeIntoPendingCandidate(userId, matchedCandidate.id, {
      company: extraction.company,
      role: extraction.role,
      status: extraction.status,
      confidence: extraction.confidence,
      sourceMessageId: summary.id,
      emailDate: parseEmailDate(summary.date),
    });
    matchedCandidate.status = extraction.status;
    matchedCandidate.company = matchedCandidate.company || extraction.company;
    matchedCandidate.role = matchedCandidate.role || extraction.role;
    await processedEmailModel.markProcessed(userId, summary.id);
    return { candidateCreated: false, candidateUpdated: true };
  }

  const matchedApplication = findMatchingApplication(existingApplications, {
    company: extraction.company,
    role: extraction.role,
  });

  if (matchedApplication && !isForwardMove(matchedApplication.status, extraction.status)) {
    // Matches something the user already has, but doesn't move it forward
    // (a re-confirmation of the same stage, or a status this ordering can't
    // place). Nothing new to propose.
    await processedEmailModel.markProcessed(userId, summary.id);
    return { candidateCreated: false };
  }

  const created = await candidateModel.createCandidate(userId, {
    sourceMessageId: summary.id,
    company: extraction.company,
    role: extraction.role,
    status: extraction.status,
    confidence: extraction.confidence,
    matchedApplicationId: matchedApplication ? matchedApplication.id : null,
    emailDate: parseEmailDate(summary.date),
  });
  // Register it so a later message in this same sync (or a future one, once
  // it's reloaded fresh) reconciles against it instead of duplicating it.
  pendingCandidates.push({
    id: created.id,
    company: created.company,
    role: created.role,
    status: created.status,
    matched_application_id: created.matched_application_id,
  });
  await processedEmailModel.markProcessed(userId, summary.id);
  return { candidateCreated: true };
}

// POST /api/sync/gmail (protected)
//
// The full pipeline from docs/PHASE2.md: list recent messages, skip ones
// already seen, prefilter the rest, run the LLM on whatever passed, and
// reconcile each job-related result against the user's existing
// applications (new candidate vs. status-update candidate vs. nothing to
// propose -- see processShortlistedMessage above).
async function syncGmail(req, res, next) {
  try {
    const userId = req.user.id;
    const account = await oauthAccountModel.findAccount(userId, PROVIDER);
    if (!account) {
      return res.status(400).json({ error: 'Gmail is not connected' });
    }

    const gmail = gmailClient.createClient({
      accessToken: tokenCrypto.decrypt(account.access_token),
      refreshToken: tokenCrypto.decrypt(account.refresh_token),
      expiresAt: account.expires_at,
      onTokensRefreshed: makeTokenRefreshHandler(userId),
    });

    // Loaded once per sync, not per message -- nothing in this run writes to
    // applications (that only happens later, when a candidate is accepted),
    // so the set of existing applications can't change mid-sync.
    const existingApplications = await applicationModel.findApplications(userId);
    // Unlike existingApplications, THIS list does change mid-sync -- new
    // entries are pushed and matched ones updated in place by
    // processShortlistedMessage, so two emails about the same not-yet-
    // reviewed job in one backlog reconcile against each other instead of
    // both becoming separate candidates.
    const pendingCandidates = await candidateModel.findPendingCandidates(userId);

    const messageIds = await gmailClient.listMessageIds(gmail);
    const unseenIds = await processedEmailModel.filterUnprocessed(userId, messageIds);

    // Gemini's free tier is paced to ~1 call per ~6.5s (see extractApplication.js),
    // so working through a big backlog in one sync would turn into a multi-minute
    // HTTP request -- which Render/the browser would likely time out on anyway.
    // I cap LLM calls per invocation and leave the rest genuinely untouched (not
    // marked processed), so the next Sync Gmail click just picks up where this
    // one stopped.
    const MAX_LLM_CALLS_PER_SYNC = 8;
    let llmCallsMade = 0;
    let shortlistedCount = 0;
    let candidatesCreated = 0;
    let candidatesUpdated = 0;
    for (const id of unseenIds) {
      const summary = await gmailClient.getMessageSummary(gmail, id);
      if (!isLikelyJobRelated(summary)) {
        // Decided for good without an LLM call: never look at this one again.
        await processedEmailModel.markProcessed(userId, id);
        continue;
      }
      if (llmCallsMade >= MAX_LLM_CALLS_PER_SYNC) break;

      shortlistedCount += 1;
      llmCallsMade += 1;
      const { candidateCreated, candidateUpdated } = await processShortlistedMessage(
        userId,
        gmail,
        summary,
        existingApplications,
        pendingCandidates
      );
      if (candidateCreated) candidatesCreated += 1;
      if (candidateUpdated) candidatesUpdated += 1;
    }

    console.log(
      `Gmail sync for user ${userId}: ${messageIds.length} scanned, ` +
        `${messageIds.length - unseenIds.length} already processed, ${shortlistedCount} shortlisted, ` +
        `${candidatesCreated} candidates created, ${candidatesUpdated} merged into existing candidates`
    );

    return res.json({
      scanned: messageIds.length,
      shortlisted: shortlistedCount,
      candidates: candidatesCreated,
      candidatesUpdated,
    });
  } catch (err) {
    if (isExpiredGrantError(err)) {
      // The stored connection is unusable and re-authorizing (not retrying)
      // is the only way forward -- delete it so /status correctly reports
      // "not connected" and the client's normal "connect Gmail" flow is what
      // the user sees next, instead of a generic 500 with no way out.
      await oauthAccountModel.deleteAccount(req.user.id, PROVIDER);
      return res.status(400).json({ error: 'Your Gmail connection has expired. Please reconnect Gmail.' });
    }
    next(err);
  }
}

module.exports = { syncGmail };
