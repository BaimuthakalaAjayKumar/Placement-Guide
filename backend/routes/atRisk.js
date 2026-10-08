const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAtRiskStudents,
  sendInterventionNotice,
  toggleStudentDashboardLock,
  autoLockInactiveStudents,
  autoLockHighRiskStudents
} = require('../controllers/atRisk');

router.use(protect);
router.use(authorize('faculty', 'admin', 'director', 'principal', 'placement_officer'));

router.get('/students', getAtRiskStudents);
router.get('/summary', getAtRiskStudents);
router.post('/notify', sendInterventionNotice);
router.post('/intervention', sendInterventionNotice);
router.post('/toggle-lock', toggleStudentDashboardLock);
router.post('/auto-lock-inactive', autoLockInactiveStudents);
router.post('/auto-lock-high-risk', autoLockHighRiskStudents);

module.exports = router;
