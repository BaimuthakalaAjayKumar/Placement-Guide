const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDepartmentOverview,
  getDepartmentFaculties,
  addFacultyToDepartment,
  updateFacultyScope,
  getFacultyActivities,
  getDepartmentStudents,
  updateStudentRecord,
  broadcastDepartmentMessage,
  exportDepartmentReport
} = require('../controllers/hod');

// All HOD routes require authentication and HOD or Admin authorization
router.use(protect);
router.use(authorize('hod', 'admin'));

router.get('/overview', getDepartmentOverview);
router.get('/faculties', getDepartmentFaculties);
router.post('/faculties', addFacultyToDepartment);
router.put('/faculties/:id', updateFacultyScope);
router.get('/faculty-activities', getFacultyActivities);
router.get('/students', getDepartmentStudents);
router.put('/students/:id', updateStudentRecord);
router.post('/broadcast-message', broadcastDepartmentMessage);
router.get('/export-branch-report', exportDepartmentReport);

module.exports = router;
