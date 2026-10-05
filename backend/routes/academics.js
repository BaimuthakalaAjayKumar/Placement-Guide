const express = require('express');
const {
  getMyAcademicRecord,
  getStudentAcademicRecord,
  saveSemesterMarks,
  getCurriculum,
  getFacultyStudents
} = require('../controllers/academics');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Student route for their own record
router.get('/my-record', getMyAcademicRecord);

// Route to get a specific student's academic record
router.get('/student/:studentId', getStudentAcademicRecord);

// Faculty & Admin: Enter marks with automatic Grade, SGPA, Credits, and CGPA calculation
router.post('/save-marks', authorize('faculty', 'admin', 'hod'), saveSemesterMarks);

// Branch & semester default curriculum
router.get('/curriculum/:branch/:semester', getCurriculum);

// Faculty list of scoped students with academic records
router.get('/students', authorize('faculty', 'admin', 'hod'), getFacultyStudents);

module.exports = router;
