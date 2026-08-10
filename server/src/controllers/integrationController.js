const jwt = require('jsonwebtoken');
const config = require('../config');
const google = require('../integrations/googleClient');
const oauthAccountModel = require('../models/oauthAccountModel');
const tokenCrypto = require('../utils/tokenCrypto');

const PROVIDER = 'google';

// The callback below is a browser redirect FROM Google -- it carries no
// Authorization header, so my normal 'authenticate' middleware can't run on
// it. Instead, when an authenticated user starts the flow (connect), I
// encode their id in a short-lived signed 'state' value; Google round-trips
// it unmodified, and the callback verifies it to recover who's connecting.
// Reusing jwtSecret keeps this to one secret instead of introducing a second.
const STATE_EXPIRES_IN = '10m';

function signState(userId) {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: STATE_EXPIRES_IN });
}

// GET /api/integrations/gmail/connect (protected)
// Hands back a Google consent URL for the client to redirect the browser to.
async function connect(req, res, next) {
  try {
    const state = signState(req.user.id);
    const url = google.getAuthUrl(state);
    return res.json({ url });
  } catch (err) {
    next(err);
  }
}

// GET /api/integrations/gmail/callback (public -- see note above)
// Exchanges the code for tokens, encrypts them, and stores them against
// whichever user the 'state' value names. Always ends in a redirect back to
// the client app (never a JSON error) since a real browser lands here.
async function callback(req, res) {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect(`${config.clientUrl}/?gmail=error`);
  }

  let userId;
  try {
    userId = jwt.verify(state, config.jwtSecret).sub;
  } catch {
    // Expired or tampered state -- I don't distinguish why on this public
    // endpoint, I just treat it as a failed connect attempt.
    return res.redirect(`${config.clientUrl}/?gmail=error`);
  }

  try {
    const tokens = await google.getTokensFromCode(code);
    if (!tokens.refresh_token) {
      // I request prompt=consent specifically so this always comes back on
      // a full consent flow -- if it's ever missing, upsertTokens' INSERT
      // would fail the column's NOT NULL constraint anyway, so I fail fast
      // here with a clearer reason logged.
      throw new Error('Google did not return a refresh_token on this consent flow');
    }
    await oauthAccountModel.upsertTokens(userId, PROVIDER, {
      accessToken: tokenCrypto.encrypt(tokens.access_token),
      refreshToken: tokenCrypto.encrypt(tokens.refresh_token),
      expiresAt: new Date(tokens.expiry_date),
    });
    return res.redirect(`${config.clientUrl}/?gmail=connected`);
  } catch (err) {
    // A failed exchange (bad/reused code, Google outage, a DB error) should
    // never 500 in the user's browser mid-redirect -- send them back to the
    // app with a visible error state instead. Logged here since next(err)
    // would otherwise hide it behind the generic redirect.
    console.error(err);
    return res.redirect(`${config.clientUrl}/?gmail=error`);
  }
}

// GET /api/integrations/gmail/status (protected)
async function status(req, res, next) {
  try {
    const account = await oauthAccountModel.findAccount(req.user.id, PROVIDER);
    return res.json({ connected: !!account });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/integrations/gmail (protected)
// Revokes with Google, then deletes my own copy of the tokens either way.
async function disconnect(req, res, next) {
  try {
    const account = await oauthAccountModel.findAccount(req.user.id, PROVIDER);
    if (account) {
      try {
        await google.revokeToken(tokenCrypto.decrypt(account.refresh_token));
      } catch (err) {
        // Revoking with Google is best-effort: if it's already revoked or
        // Google is down, I still want my own stored tokens gone.
        console.error(err);
      }
      await oauthAccountModel.deleteAccount(req.user.id, PROVIDER);
    }
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { connect, callback, status, disconnect };
