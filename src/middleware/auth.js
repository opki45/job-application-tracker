const jwt = require('jsonwebtoken');
const config = require('../config');

// This middleware guards protected routes. It expects the token in the header:
//   Authorization: Bearer <token>
// If the token is valid, I attach the user to req.user and call next() so the
// real handler runs. If not, I stop here with 401 and the handler never runs.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  // Must look like "Bearer <token>".
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    // verify() throws if the signature is wrong or the token has expired.
    const payload = jwt.verify(token, config.jwtSecret);
    // I trust the token, not the client: identity comes from the verified payload.
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
