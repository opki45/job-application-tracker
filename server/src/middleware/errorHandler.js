// This is my central error handler. Express knows it's an error handler because
// it takes FOUR arguments (err first). It only runs when something calls
// next(err) — which my controllers do in their catch blocks.

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // MySQL raises ER_DUP_ENTRY when a UNIQUE constraint is violated (e.g. two
  // signups racing with the same email). I turn that into a clean 409.
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Anything else: log it on the server, but send the client a generic message
  // so I never leak stack traces or SQL details.
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
