const express = require('express');
const controller = require('../controllers/integrationController');
const authenticate = require('../middleware/auth');

// Gmail integration routes, mounted at /api/integrations/gmail in app.js.
const router = express.Router();

// The callback is a redirect from Google, not a call from my own client --
// it has no Authorization header, so it stays public and verifies identity
// itself via the signed 'state' param instead (see integrationController.js).
router.get('/connect', authenticate, controller.connect);
router.get('/callback', controller.callback);
router.get('/status', authenticate, controller.status);
router.delete('/', authenticate, controller.disconnect);

module.exports = router;
