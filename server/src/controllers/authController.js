const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userModel = require('../models/userModel');
const google = require('../integrations/googleClient');
const { validateRegister } = require('../utils/validation');

// bcrypt "cost factor". Higher = slower to hash = harder to brute-force, but
// slower logins. 10 is the common default and a good balance.
const SALT_ROUNDS = 10;

// I build a signed token here so register and login don't duplicate it. I put
// the user id in the standard "sub" (subject) claim, plus email for convenience.
// The token is signed with my secret and expires after JWT_EXPIRES_IN.
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// A short-lived, single-purpose code googleCallback hands the browser
// instead of the real session token -- see googleCallback's comment for why.
const EXCHANGE_EXPIRES_IN = '60s';

function signExchangeToken(userId) {
  return jwt.sign({ sub: userId, purpose: 'google-exchange' }, config.jwtSecret, {
    expiresIn: EXCHANGE_EXPIRES_IN,
  });
}

async function register(req, res, next) {
  try {
    // 1. Validate the input. If it's bad, stop with 400 Bad Request.
    const errors = validateRegister(req.body);
    if (errors.length) {
      return res.status(400).json({ errors });
    }

    // 2. Normalise the email so 'Dayo@X.com' and 'dayo@x.com' are the same account.
    const email = req.body.email.toLowerCase().trim();

    // 3. Reject if the email is already taken (409 Conflict).
    const existing = await userModel.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 4. Hash the password. I never store the raw password, only this hash.
    const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);

    // 5. Create the user and respond with 201 Created. I return the user but
    //    NEVER the password hash.
    const user = await userModel.createUser({ email, passwordHash });
    return res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    // Anything unexpected (e.g. a DB error) gets handed to my error handler.
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const password = req.body.password || '';

    // Look up the user. findUserByEmail includes password_hash so I can compare.
    const user = await userModel.findUserByEmail(email);

    // IMPORTANT: I use the SAME 401 message whether the email is unknown, the
    // account has no password (Google-only -- see userModel.createUserFromGoogle),
    // or the password is wrong. Different messages would let an attacker
    // discover which emails have accounts, or which are Google-only.
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // bcrypt.compare re-hashes the incoming password (with the salt stored in
    // the hash) and checks it matches. I never decrypt the stored hash.
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Credentials good -> issue a token.
    const token = signToken(user);
    return res.json({ user: { id: user.id, email: user.email }, token });
  } catch (err) {
    next(err);
  }
}

// Protected route handler. By the time this runs, the authenticate middleware
// has already verified the token and set req.user. I re-fetch from the database
// so the response reflects the current record (and never the password hash).
async function me(req, res, next) {
  try {
    const user = await userModel.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch (err) {
    next(err);
  }
}

// PUT /api/auth/password (protected)
// A valid JWT alone isn't proof the requester still knows the password --
// the token could be hours old and the tab left open on a shared machine --
// so I re-verify currentPassword before ever touching the stored hash.
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ errors: ['New password must be at least 8 characters'] });
    }

    const user = await userModel.findUserByIdWithPassword(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // A Google-only account (see userModel.createUserFromGoogle) has no
    // password_hash to compare against -- bcrypt.compare requires a string,
    // so this has to be checked explicitly rather than let it throw.
    if (!user.password_hash) {
      return res.status(400).json({
        error: 'This account signed up with Google and has no password to change.',
      });
    }

    const match = await bcrypt.compare(currentPassword || '', user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await userModel.updatePassword(req.user.id, passwordHash);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// DELETE /api/auth/me (protected)
// Same re-verification reasoning as changePassword: deleting an account is
// irreversible (every application, candidate, and OAuth token cascades away
// with it), so a password confirmation is required, not just a valid token.
async function deleteAccount(req, res, next) {
  try {
    const user = await userModel.findUserByIdWithPassword(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Same Google-only case as changePassword above. Deleting a Google-only
    // account without a password to re-verify is a real gap (a valid but
    // stale token is the only proof available) -- surfacing it clearly
    // rather than silently allowing or crashing is the right amount of
    // scope for now; a Google-reauth confirmation step is future work.
    if (!user.password_hash) {
      return res.status(400).json({
        error: 'This account signed up with Google. Account deletion for Google accounts isn\'t supported yet -- contact support.',
      });
    }

    const match = await bcrypt.compare(req.body.password || '', user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    await userModel.deleteUser(req.user.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/google (public)
// Straight redirect to Google's consent screen -- unlike the Gmail connect
// flow, there's no authenticated user yet to attach a signed 'state' to, so
// this doesn't need to be a JSON endpoint the frontend fetches first; the
// "Continue with Google" button just links here directly.
async function googleLogin(req, res) {
  return res.redirect(google.getLoginAuthUrl());
}

// GET /api/auth/google/callback (public -- a browser redirect from Google,
// same reasoning as the Gmail callback: no Authorization header of its own)
// Exchanges the code, verifies Google's ID token, finds-or-creates the user,
// then redirects back to the client with a short-lived one-time exchange
// code -- NOT the real session token. Putting a day-long bearer token
// straight into a URL (browser history, Referer headers, server logs) is
// worse than a 60-second code the client immediately trades for the real
// token over a normal POST body (see googleExchange below).
async function googleCallback(req, res) {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${config.clientUrl}/login?google=error`);
  }

  try {
    const payload = await google.verifyLoginCode(code);
    if (!payload.email || !payload.email_verified) {
      return res.redirect(`${config.clientUrl}/login?google=error`);
    }
    const email = payload.email.toLowerCase().trim();

    let user = await userModel.findUserByGoogleId(payload.sub);
    if (!user) {
      const existing = await userModel.findUserByEmail(email);
      if (existing) {
        // Same verified email as an existing password account -- link
        // rather than reject, so either method logs this person in from
        // now on. Google itself vouches for email ownership via
        // email_verified, which is why this linking is safe.
        await userModel.linkGoogleId(existing.id, payload.sub);
        user = existing;
      } else {
        user = await userModel.createUserFromGoogle({ email, googleId: payload.sub });
      }
    }

    const exchangeCode = signExchangeToken(user.id);
    return res.redirect(`${config.clientUrl}/login?google_code=${exchangeCode}`);
  } catch (err) {
    // Never let a failed exchange 500 in the user's browser mid-redirect --
    // same reasoning as the Gmail callback.
    console.error(err);
    return res.redirect(`${config.clientUrl}/login?google=error`);
  }
}

// POST /api/auth/google/exchange (public)
// Trades the short-lived code from googleCallback's redirect for a real
// session token, in the same { user, token } shape login() returns. The
// code is signed, purpose-tagged, and expires in 60s -- this isn't a
// general "log in as any id" endpoint, it only accepts what googleCallback
// itself just issued.
async function googleExchange(req, res) {
  try {
    const payload = jwt.verify(req.body.code || '', config.jwtSecret);
    if (payload.purpose !== 'google-exchange') {
      return res.status(401).json({ error: 'Invalid code' });
    }
    const user = await userModel.findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    const token = signToken(user);
    return res.json({ user: { id: user.id, email: user.email }, token });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired code' });
  }
}

module.exports = {
  register,
  login,
  me,
  changePassword,
  deleteAccount,
  googleLogin,
  googleCallback,
  googleExchange,
};
