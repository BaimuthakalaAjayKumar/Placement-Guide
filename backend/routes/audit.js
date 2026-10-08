const express = require('express');
const {
  recordHeartbeat,
  recordActivity,
  getAuditLogs,
  getStudentSessions,
  getStudentTimeline,
  getAuditStats,
  clearAuditLogs
} = require('../controllers/audit');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// All audit routes require authentication
router.use(protect);

// Student/User actions
router.post('/heartbeat', recordHeartbeat);
router.post('/activity', recordActivity);

// Admin, Auditor, Director, and Principal inspection routes
router.get('/logs', authorize('admin', 'auditor', 'director', 'principal'), getAuditLogs);
router.get('/student-sessions', authorize('admin', 'auditor', 'director', 'principal'), getStudentSessions);
router.get('/student/:id/timeline', authorize('admin', 'auditor', 'director', 'principal'), getStudentTimeline);
router.get('/stats', authorize('admin', 'auditor', 'director', 'principal'), getAuditStats);
router.delete('/logs', authorize('admin'), clearAuditLogs);

module.exports = router;
