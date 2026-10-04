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
  exportDepartmentReport,
  getDepartmentSubjects,
  createDepartmentSubject,
  assignSubjectTeacher,
  deleteDepartmentSubject,
  getDepartmentProjects,
  gradeStudentProject,
  getDepartmentLabTasks,
  createDepartmentLabTask,
  getLabTaskSubmissions,
  deleteDepartmentLabTask
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

// Academic Subjects & Assignment (HOD & Faculty)
router.get('/subjects', getDepartmentSubjects);
router.post('/subjects', createDepartmentSubject);
router.put('/subjects/:id/assign', assignSubjectTeacher);
router.delete('/subjects/:id', deleteDepartmentSubject);

// Student Projects & Grading
router.get('/projects', getDepartmentProjects);
router.put('/projects/:id/grade', gradeStudentProject);

// Lab Tasks & Practice
router.get('/labs', getDepartmentLabTasks);
router.post('/labs', createDepartmentLabTask);
router.get('/labs/:id/reports', getLabTaskSubmissions);
router.delete('/labs/:id', deleteDepartmentLabTask);

module.exports = router;
