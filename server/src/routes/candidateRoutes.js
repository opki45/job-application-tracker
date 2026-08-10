const express = require('express');
const controller = require('../controllers/candidateController');
const authenticate = require('../middleware/auth');

// Review-queue routes, mounted at /api/candidates. No public routes here --
// every candidate belongs to exactly one user.
const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.post('/:id/accept', controller.accept);
router.post('/:id/dismiss', controller.dismiss);

module.exports = router;
