const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getEvents, createEvent, deleteEvent } = require('../controllers/placementEvents');

router.use(protect);

router.get('/', getEvents);
router.post('/', authorize('admin', 'faculty', 'student'), createEvent);
router.delete('/:id', authorize('admin', 'faculty', 'student'), deleteEvent);

module.exports = router;
