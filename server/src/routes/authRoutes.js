const express = require('express');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

// A Router is a mini-app I can group related routes on, then mount under one
// path prefix in app.js. These are my auth routes.
const router = express.Router();

// POST /register -> create a new account. (Public: no auth needed.)
router.post('/register', authController.register);

// POST /login -> check credentials and hand back a JWT. (Public.)
router.post('/login', authController.login);

// Sign-in with Google -- all public, same reasoning as the Gmail OAuth
// routes: googleLogin/googleCallback are browser redirects with no
// Authorization header of their own to check.
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.post('/google/exchange', authController.googleExchange);

// GET /me -> who am I? Protected: 'authenticate' runs first, and only calls the
// controller if the token is valid.
router.get('/me', authenticate, authController.me);

// PUT /password -> change password (requires the current one). Protected.
router.put('/password', authenticate, authController.changePassword);

// DELETE /me -> delete my account (requires the current password).
// Protected. Cascades to every other table via ON DELETE CASCADE.
router.delete('/me', authenticate, authController.deleteAccount);

module.exports = router;
