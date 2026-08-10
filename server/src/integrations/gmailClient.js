const { google } = require('googleapis');
const config = require('../config');

// Same reasoning as googleClient.js: every direct Gmail API call lives in
// this one file, so tests can mock the whole module at this boundary instead
// of hitting real Google or stubbing out googleapis internals.

// How far back I look on every sync. Wide enough to catch a slow-moving
// application, narrow enough that a first connect doesn't try to ingest
// someone's entire mailbox history.
const LOOKBACK = 'newer_than:30d';

// A light Gmail search-query filter, purely to keep the initial result set
// down before I even look at message content. This is NOT the real filter --
// the actual decision happens in utils/emailPrefilter.js against each
// message's headers/snippet. This is just cheaper than listing everything.
const SEARCH_KEYWORDS =
  '(application OR applied OR interview OR offer OR rejected OR "thank you for applying")';

// Builds an authenticated Gmail client for one user. If onTokensRefreshed is
// given, it's called whenever googleapis rotates the access token mid-use
// (it does this itself, using the refresh_token, whenever expiry_date has
// passed) -- that's my only hook to persist the new token, so callers should
// always pass one if they want the refresh to stick for next time.
function createClient({ accessToken, refreshToken, expiresAt, onTokensRefreshed }) {
  const oauth2Client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: new Date(expiresAt).getTime(),
  });
  if (onTokensRefreshed) {
    oauth2Client.on('tokens', onTokensRefreshed);
  }
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Lists candidate message ids from the last LOOKBACK window. Gmail's list
// endpoint only returns ids/threadIds -- details are a separate call per id.
async function listMessageIds(gmail) {
  const { data } = await gmail.users.messages.list({
    userId: 'me',
    q: `${LOOKBACK} ${SEARCH_KEYWORDS}`,
    maxResults: 100,
  });
  return (data.messages || []).map((m) => m.id);
}

// Fetches just enough of a message to run the heuristic prefilter: sender,
// subject, and Gmail's own snippet. format: 'metadata' keeps this cheap and
// avoids pulling a full message body I don't need at this stage.
async function getMessageSummary(gmail, messageId) {
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['From', 'Subject', 'Date'],
  });
  const headers = Object.fromEntries(
    (data.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value])
  );
  return {
    id: data.id,
    from: headers.from || '',
    subject: headers.subject || '',
    date: headers.date || '',
    snippet: data.snippet || '',
  };
}

// Fetches the full body of one message. Only called for messages that
// already passed the prefilter -- pulling a full body for every message in
// the lookback window would be wasteful when most never reach the LLM.
async function getMessageBody(gmail, messageId) {
  const { data } = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  return extractPlainText(data.payload) || data.snippet || '';
}

function decodeBase64Url(data) {
  return Buffer.from(data, 'base64url').toString('utf8');
}

// Depth-first search for the first part of a given MIME type anywhere in the
// message's part tree (Gmail bodies are a tree, not a flat list -- a
// multipart/alternative can nest a further multipart/related, etc).
function findPart(payload, mimeType) {
  if (!payload) return null;
  if (payload.mimeType === mimeType && payload.body?.data) return payload.body.data;
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = findPart(part, mimeType);
      if (found) return found;
    }
  }
  return null;
}

// I always prefer text/plain when a message has one. Falling back to
// text/html (common from ATS platforms that only send HTML), I strip tags
// crudely rather than feed raw markup to the LLM -- good enough for
// extraction, not meant to preserve formatting.
function extractPlainText(payload) {
  const plain = findPart(payload, 'text/plain');
  if (plain) return decodeBase64Url(plain);

  const html = findPart(payload, 'text/html');
  if (html) {
    return decodeBase64Url(html)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return null;
}

module.exports = { createClient, listMessageIds, getMessageSummary, getMessageBody };
