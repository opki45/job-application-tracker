const express = require('express');
const controller = require('../controllers/syncController');
const authenticate = require('../middleware/auth');

// Sync routes, mounted at /api/sync/gmail in app.js. Just one action for now.
const router = express.Router();

router.post('/', authenticate, controller.syncGmail);

module.exports = router;
