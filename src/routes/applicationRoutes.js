const express = require('express');
const controller = require('../controllers/applicationController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Protect EVERY route in this file. router.use() applies the middleware to all
// routes below it, so I don't repeat 'authenticate' on each line. There are no
// public application routes — you must be logged in to do anything here.
router.use(authenticate);

router.get('/', controller.list);          // list (optionally ?status=)
router.post('/', controller.create);       // create
router.get('/:id', controller.getOne);     // read one
router.put('/:id', controller.update);     // update
router.delete('/:id', controller.remove);  // delete

module.exports = router;
