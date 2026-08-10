const { google } = require('googleapis');
const config = require('../config');

// I keep every direct call to Google's OAuth API in this one file. That gives
// tests a single boundary to mock (jest.mock this module) instead of having
// to stub out googleapis internals wherever OAuth is used.

// Read-only: Landed only ever reads mail to detect application-related
// updates, it never sends or modifies anything in the user's inbox.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function client() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
}

// Builds the Google consent-screen URL the client redirects the browser to.
// 'state' round-trips through Google unmodified and comes back on the
// callback request, which is how the callback knows who started the flow (it
// arrives as a browser redirect with no Authorization header of its own).
function getAuthUrl(state) {
  return client().generateAuthUrl({
    access_type: 'offline', // required to get a refresh_token back, not just a short-lived access_token
    prompt: 'consent', // force Google to reissue a refresh_token even on a repeat connect
    scope: SCOPES,
    state,
  });
}

// Exchanges the one-time 'code' Google sent back for real tokens.
async function getTokensFromCode(code) {
  const { tokens } = await client().getToken(code);
  return tokens; // { access_token, refresh_token?, expiry_date, ... }
}

// Revokes a token with Google so the grant is fully torn down, not just
// deleted from my own database.
async function revokeToken(token) {
  await client().revokeToken(token);
}

module.exports = { getAuthUrl, getTokensFromCode, revokeToken };
