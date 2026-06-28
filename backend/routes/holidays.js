const express = require('express');
const { getHolidays, createHoliday, deleteHoliday } = require('../controllers/holidays');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.route('/')
    .get(protect, getHolidays)
    .post(protect, authorize('admin'), createHoliday);

router.route('/:id')
    .delete(protect, authorize('admin'), deleteHoliday);

module.exports = router;
