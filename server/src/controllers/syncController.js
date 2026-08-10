const gmailClient = require('../integrations/gmailClient');
const oauthAccountModel = require('../models/oauthAccountModel');
const processedEmailModel = require('../models/processedEmailModel');
const tokenCrypto = require('../utils/tokenCrypto');
const { isLikelyJobRelated } = require('../utils/emailPrefilter');

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

// POST /api/sync/gmail (protected)
//
// This is step 2 of the pipeline in docs/PHASE2.md: list recent messages,
// skip ones I've already looked at, and prefilter the rest so only
// plausibly-job-related mail would go to the LLM. The LLM call itself and
// candidate creation land in the next step -- for now, prefilter rejects are
// recorded as processed (so I never re-fetch them), and shortlisted messages
// are reported back but left unprocessed until step 3 decides what to do
// with them.
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

    const shortlisted = [];
    for (const id of unseenIds) {
      const summary = await gmailClient.getMessageSummary(gmail, id);
      if (isLikelyJobRelated(summary)) {
        shortlisted.push(summary);
      } else {
        // Decided for good without an LLM call: never look at this one again.
        await processedEmailModel.markProcessed(userId, id);
      }
    }

    console.log(
      `Gmail sync for user ${userId}: ${messageIds.length} scanned, ` +
        `${messageIds.length - unseenIds.length} already processed, ${shortlisted.length} shortlisted`
    );

    return res.json({
      scanned: messageIds.length,
      shortlisted: shortlisted.map(({ id, from, subject, date }) => ({ id, from, subject, date })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { syncGmail };
