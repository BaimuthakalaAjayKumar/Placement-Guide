const express = require('express');
const { getTasks, createTask, submitAttempt, getReports, getAllLabReports, reviewAttempt } = require('../controllers/labs');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/tasks', getTasks);
router.post('/tasks', authorize('admin', 'faculty'), createTask);
router.get('/reports', authorize('admin', 'faculty'), getAllLabReports);
router.post('/tasks/:id/submit', authorize('student'), submitAttempt);
router.get('/tasks/:id/reports', authorize('admin', 'faculty'), getReports);
router.put('/attempts/:attemptId/review', authorize('admin', 'faculty'), reviewAttempt);

module.exports = router;
