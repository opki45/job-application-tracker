const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userModel = require('../models/userModel');
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

    // IMPORTANT: I use the SAME 401 message whether the email is unknown or the
    // password is wrong. Different messages would let an attacker discover which
    // emails have accounts (user enumeration).
    if (!user) {
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

module.exports = { register, login, me };
