const express = require('express');
const { getTasks, createTask, updateTask, deleteTask, submitAttempt, getReports, getAllLabReports, reviewAttempt } = require('../controllers/labs');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/tasks', getTasks);
router.post('/tasks', authorize('admin', 'faculty', 'hod'), createTask);
router.put('/tasks/:id', authorize('admin', 'faculty', 'hod'), updateTask);
router.delete('/tasks/:id', authorize('admin', 'faculty', 'hod'), deleteTask);
router.get('/reports', authorize('admin', 'faculty', 'hod', 'director', 'principal'), getAllLabReports);
router.post('/tasks/:id/submit', authorize('student', 'faculty', 'admin', 'hod'), submitAttempt);
router.get('/tasks/:id/reports', authorize('admin', 'faculty', 'hod', 'director', 'principal'), getReports);
router.put('/attempts/:attemptId/review', authorize('admin', 'faculty', 'hod'), reviewAttempt);

module.exports = router;
