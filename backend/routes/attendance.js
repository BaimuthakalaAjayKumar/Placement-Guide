const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

const {
  createSession,
  getActiveSessions,
  getSessionHistory,
  getSessionById,
  rotateToken,
  studentCheckIn,
  closeSession,
  getRooms,
  getStudentAttendanceHistory,
  getStudentAttendanceAnalytics,
  getDepartmentReport,
  getCampusReport,
  getShortageReport,
  exportShortageCsv,
  requestOrReviewCorrection,
  getAttendanceAudit,
  dispatchAtRiskAlerts,
  getAttendanceNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
} = require('../controllers/attendance');

// All attendance routes require authentication
router.use(protect);

// ============================================================
// ROOMS ROUTE
// ============================================================
router.get('/rooms', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getRooms);

// ============================================================
// ATTENDANCE NOTIFICATION & ALERT MANAGEMENT (PHASE 5)
// ============================================================
router.get('/notifications/preferences', getNotificationPreferences);
router.put('/notifications/preferences', updateNotificationPreferences);
router.post('/notifications/dispatch-at-risk', dispatchAtRiskAlerts);
router.get('/notifications', getAttendanceNotifications);

// ============================================================
// ATTENDANCE SESSION MANAGEMENT ROUTES
// ============================================================
router.post('/sessions', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), createSession);
router.get('/sessions/active', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), getActiveSessions);
router.get('/sessions/history', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getSessionHistory);
router.get('/sessions/:id', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getSessionById);
router.post('/sessions/:id/rotate-token', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), rotateToken);
router.post('/sessions/:id/close', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), closeSession);

// ============================================================
// STUDENT CHECK-IN & HISTORY & ANALYTICS
// ============================================================
router.post('/sessions/:id/checkin', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), studentCheckIn);
router.get('/student/history', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getStudentAttendanceHistory);
router.get('/student/analytics', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getStudentAttendanceAnalytics);

// ============================================================
// REPORTS & ANALYTICS
// ============================================================
router.get('/reports/department', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getDepartmentReport);
router.get('/reports/campus', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getCampusReport);
router.get('/reports/shortage.csv', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), exportShortageCsv);
router.get('/reports/shortage', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getShortageReport);

// ============================================================
// ATTENDANCE DISPUTES & CORRECTION WORKFLOW
// ============================================================
router.post('/records/:recordId/correction', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), requestOrReviewCorrection);

// ============================================================
// AUDIT LOGS
// ============================================================
router.get('/audit', getAttendanceAudit);

module.exports = router;
