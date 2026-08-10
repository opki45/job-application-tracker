const express = require('express');
const controller = require('../controllers/reminderController');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
