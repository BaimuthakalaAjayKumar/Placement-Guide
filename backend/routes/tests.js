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
  addPracticeQuestion,
  deletePracticeQuestion,
  getPracticeReport,
  getStudentPracticeStats,
  getIndividualPracticeReport,
  editPracticeQuestion,
  bulkCreatePracticeQuestions
} = require('../controllers/tests');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes are protected

router.get('/', getTests);
router.get('/attempts/history', getAttemptsHistory);
router.get('/:id', getTestById);
router.post('/:id/submit', submitTestAttempt);

// Practice questions & student stats route for students & admins
router.get('/practice-stats/me', getStudentPracticeStats);
router.get('/practice-questions/:platform', getPracticeQuestions);

// Subject Test Reports (Admin & Faculty & HOD)
router.get('/subject/:subjectId/reports', authorize('admin', 'faculty', 'hod'), getSubjectTestReports);

// Admin, HOD and Faculty Test & Question Management
router.get('/admin/attempts', authorize('admin', 'faculty', 'hod'), getAdminAttempts);
router.post('/', authorize('admin', 'faculty', 'hod'), createTest);
router.delete('/:id', authorize('admin', 'faculty', 'hod'), deleteTest);
router.get('/:id/questions', authorize('admin', 'faculty', 'hod'), getTestQuestionsAdmin);
router.post('/:id/questions', authorize('admin', 'faculty', 'hod'), addQuestion);
router.put('/:id/questions/:qId', authorize('admin', 'faculty', 'hod'), editQuestion);
router.delete('/:id/questions/:qId', authorize('admin', 'faculty', 'hod'), deleteQuestion);

// Image Upload
router.post('/upload-image', authorize('admin', 'faculty', 'hod'), uploadQuestionImage, uploadImage);

// Practice Platform Coordinator & Reports (Admin, Faculty & HOD)
router.post('/practice-questions/:platform', authorize('admin', 'hod'), addPracticeQuestion);
router.delete('/practice-questions/:platform/:id', authorize('admin', 'hod'), deletePracticeQuestion);
router.put('/practice-questions/:platform/:id', authorize('admin', 'hod'), editPracticeQuestion);
router.post('/practice-questions/:platform/bulk', authorize('admin', 'hod'), bulkCreatePracticeQuestions);
router.get('/practice-reports/student/:studentId', authorize('admin', 'faculty', 'hod'), getIndividualPracticeReport);
router.get('/practice-reports/:platform', authorize('admin', 'faculty', 'hod'), getPracticeReport);

module.exports = router;
