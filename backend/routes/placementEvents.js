const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getEvents, createEvent, deleteEvent } = require('../controllers/placementEvents');

router.use(protect);

router.get('/', getEvents);
router.post('/', authorize('admin', 'faculty'), createEvent);
router.delete('/:id', authorize('admin', 'faculty'), deleteEvent);

module.exports = router;
