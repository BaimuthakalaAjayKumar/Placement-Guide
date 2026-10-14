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
  closeAttendance,
  closeSession,
  finalizeSessionRectification,
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
  updateNotificationPreferences,
  getCampusArrivalConfig,
  updateCampusArrivalConfig,
  recordCampusArrival,
  getStudentCampusArrivalStatus,
  requestCampusArrivalCorrection,
  reviewCampusArrivalCorrection,
  getCampusArrivalCorrections,
  getTodayArrivalSummary,
  getBiometricStatus,
  requestBiometricChallenge,
  enrollBiometricProfile,
  verifyBiometricFace,
  withdrawBiometricEnrollment
} = require('../controllers/attendance');

// All attendance routes require authentication
router.use(protect);

// ============================================================
// BIOMETRIC FACE IDENTITY & RECOGNITION (STUDENTS & FACULTY)
// ============================================================
router.get('/biometrics/status', getBiometricStatus);
router.post('/biometrics/challenge', requestBiometricChallenge);
router.post('/biometrics/enroll', enrollBiometricProfile);
router.post('/biometrics/verify', verifyBiometricFace);
router.delete('/biometrics/enrollment', withdrawBiometricEnrollment);

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
router.get('/sessions/active', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getActiveSessions);
router.get('/sessions/history', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getSessionHistory);
router.get('/sessions/:id', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getSessionById);
router.post('/sessions/:id/rotate-token', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), rotateToken);
router.post('/sessions/:id/close-attendance', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), closeAttendance);
router.post('/sessions/:id/close', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), closeSession);
router.post('/sessions/:id/finalize-rectification', requirePermission(PERMISSIONS.ATTENDANCE_WRITE), finalizeSessionRectification);


// ============================================================
// STUDENT CHECK-IN & HISTORY & ANALYTICS
// ============================================================
router.post('/sessions/:id/checkin', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), studentCheckIn);
router.get('/student/history', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getStudentAttendanceHistory);
router.get('/student/analytics', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getStudentAttendanceAnalytics);

// ============================================================
// CAMPUS-LEVEL ARRIVAL GEOFENCE CHECK-IN & ADMINISTRATIVE CONFIGURATION
// ============================================================
router.get('/campus-arrival/config', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getCampusArrivalConfig);
router.get('/campus-arrival/config/:campusId', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getCampusArrivalConfig);
router.put('/campus-arrival/config/:campusId', requirePermission(PERMISSIONS.CAMPUS_UPDATE), updateCampusArrivalConfig);
router.post('/campus-arrival', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), recordCampusArrival);

// ============================================================
// SUPPORT DESK & AUTHORIZED ARRIVAL ASSISTANCE WORKFLOW
// ============================================================
router.get('/campus-arrival/today-summary', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getTodayArrivalSummary);
router.get('/campus-arrival/status/:studentId', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getStudentCampusArrivalStatus);
router.post('/campus-arrival/correction', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), requestCampusArrivalCorrection);
router.put('/campus-arrival/correction/:logId/review', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), reviewCampusArrivalCorrection);
router.get('/campus-arrival/corrections', requirePermission(PERMISSIONS.ATTENDANCE_VIEW), getCampusArrivalCorrections);

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
router.get('/audit', requirePermission(PERMISSIONS.AUDIT_LOG_VIEW), getAttendanceAudit);

module.exports = router;
