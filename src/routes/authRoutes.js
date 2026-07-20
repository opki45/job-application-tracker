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

// GET /me -> who am I? Protected: 'authenticate' runs first, and only calls the
// controller if the token is valid.
router.get('/me', authenticate, authController.me);

module.exports = router;
