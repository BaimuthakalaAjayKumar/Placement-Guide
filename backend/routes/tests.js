const express = require('express');
const {
  getTests,
  getTestById,
  submitTestAttempt,
  getAttemptsHistory,
  createTest,
  deleteTest,
  getTestQuestionsAdmin,
  addQuestion,
  editQuestion,
  deleteQuestion,
  getAdminAttempts,
  getSubjectTestReports,
  uploadQuestionImage,
  uploadImage,
  getPracticeQuestions,
  getPlatformQuotaStatus,
  getAllPlatformsQuotaStatus,
  addPracticeQuestion,
  deletePracticeQuestion,
  editPracticeQuestion,
  archivePracticeQuestion,
  unarchivePracticeQuestion,
  bulkCreatePracticeQuestions,
  syncPlatformPractice,
  getPracticeReport,
  getStudentPracticeStats,
  getIndividualPracticeReport
} = require('../controllers/tests');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes are protected

router.get('/', getTests);
router.get('/attempts/history', getAttemptsHistory);
router.get('/:id', getTestById);
router.post('/:id/submit', submitTestAttempt);

// Practice questions & student stats route for students & placement officers
router.get('/practice-stats/me', getStudentPracticeStats);
router.get('/practice-questions/summary/quota', getAllPlatformsQuotaStatus);
router.get('/practice-questions/:platform', getPracticeQuestions);
router.get('/practice-questions/:platform/quota-status', getPlatformQuotaStatus);
router.post('/practice-sync/:platform', syncPlatformPractice);

// Subject Test Reports (Admin, Faculty, HOD, Director & Principal)
router.get('/subject/:subjectId/reports', authorize('admin', 'faculty', 'hod', 'director', 'principal'), getSubjectTestReports);

// Admin, HOD and Faculty Test & Question Management
router.get('/admin/attempts', authorize('admin', 'faculty', 'hod', 'director', 'principal'), getAdminAttempts);
router.post('/', authorize('admin', 'faculty', 'hod'), createTest);
router.delete('/:id', authorize('admin', 'faculty', 'hod'), deleteTest);
router.get('/:id/questions', authorize('admin', 'faculty', 'hod'), getTestQuestionsAdmin);
router.post('/:id/questions', authorize('admin', 'faculty', 'hod'), addQuestion);
router.put('/:id/questions/:qId', authorize('admin', 'faculty', 'hod'), editQuestion);
router.delete('/:id/questions/:qId', authorize('admin', 'faculty', 'hod'), deleteQuestion);

// Image Upload
router.post('/upload-image', authorize('admin', 'faculty', 'hod'), uploadQuestionImage, uploadImage);

// Practice Platform Question Bank Management (Strictly Placement Officer & Admin)
router.post('/practice-questions/:platform', authorize('placement_officer', 'admin'), addPracticeQuestion);
router.delete('/practice-questions/:platform/:id', authorize('placement_officer', 'admin'), deletePracticeQuestion);
router.put('/practice-questions/:platform/:id', authorize('placement_officer', 'admin'), editPracticeQuestion);
router.put('/practice-questions/:platform/:id/archive', authorize('placement_officer', 'admin'), archivePracticeQuestion);
router.put('/practice-questions/:platform/:id/unarchive', authorize('placement_officer', 'admin'), unarchivePracticeQuestion);
router.post('/practice-questions/:platform/bulk', authorize('placement_officer', 'admin'), bulkCreatePracticeQuestions);

// Aggregate Progress Reports (Placement Officer, Admin, Faculty, Leadership & Auditors)
router.get('/practice-reports/student/:studentId', authorize('placement_officer', 'admin', 'faculty', 'hod', 'director', 'principal', 'auditor'), getIndividualPracticeReport);
router.get('/practice-reports/:platform', authorize('placement_officer', 'admin', 'faculty', 'hod', 'director', 'principal', 'auditor'), getPracticeReport);

module.exports = router;
