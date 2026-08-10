const gmailClient = require('../integrations/gmailClient');
const oauthAccountModel = require('../models/oauthAccountModel');
const processedEmailModel = require('../models/processedEmailModel');
const candidateModel = require('../models/candidateModel');
const tokenCrypto = require('../utils/tokenCrypto');
const { isLikelyJobRelated } = require('../utils/emailPrefilter');
const { extractApplication } = require('../llm/extractApplication');

const PROVIDER = 'google';

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

// Runs the LLM step for one shortlisted message and reconciles the result:
//   - not job-related (per the LLM, not the prefilter) -> mark processed, drop.
//   - job-related -> create a candidate (matching against existing
//     applications is reconciliation, a later step -- for now every
//     job-related extraction is a new candidate) and mark processed.
// IMPORTANT: an infrastructure failure (Ollama down, bad response) is left
// UNprocessed on purpose -- see the note on extractApplication() for why:
// "couldn't reach the LLM" must never be recorded the same way as "the LLM
// looked at this and it's not job-related", or a temporary outage would
// permanently drop mail that was never actually evaluated.
async function processShortlistedMessage(userId, gmail, summary) {
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

  await candidateModel.createCandidate(userId, {
    sourceMessageId: summary.id,
    company: extraction.company,
    role: extraction.role,
    status: extraction.status,
    confidence: extraction.confidence,
  });
  await processedEmailModel.markProcessed(userId, summary.id);
  return { candidateCreated: true };
}

// POST /api/sync/gmail (protected)
//
// Steps 2-3 of the pipeline in docs/PHASE2.md: list recent messages, skip
// ones already seen, prefilter the rest, then run the LLM on whatever passed
// the prefilter and write a candidate for anything it says is job-related.
// Matching against existing applications (reconciliation) isn't built yet --
// every job-related extraction becomes a new candidate for now.
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

    const messageIds = await gmailClient.listMessageIds(gmail);
    const unseenIds = await processedEmailModel.filterUnprocessed(userId, messageIds);

    let shortlistedCount = 0;
    let candidatesCreated = 0;
    for (const id of unseenIds) {
      const summary = await gmailClient.getMessageSummary(gmail, id);
      if (!isLikelyJobRelated(summary)) {
        // Decided for good without an LLM call: never look at this one again.
        await processedEmailModel.markProcessed(userId, id);
        continue;
      }
      shortlistedCount += 1;
      const { candidateCreated } = await processShortlistedMessage(userId, gmail, summary);
      if (candidateCreated) candidatesCreated += 1;
    }

    console.log(
      `Gmail sync for user ${userId}: ${messageIds.length} scanned, ` +
        `${messageIds.length - unseenIds.length} already processed, ${shortlistedCount} shortlisted, ` +
        `${candidatesCreated} candidates created`
    );

    return res.json({ scanned: messageIds.length, shortlisted: shortlistedCount, candidates: candidatesCreated });
  } catch (err) {
    next(err);
  }
}

module.exports = { syncGmail };
