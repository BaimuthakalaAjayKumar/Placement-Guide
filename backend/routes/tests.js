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

// Subject Test Reports (Admin & Faculty)
router.get('/subject/:subjectId/reports', authorize('admin', 'faculty'), getSubjectTestReports);

// Admin and Faculty Test & Question Management
router.get('/admin/attempts', authorize('admin'), getAdminAttempts);
router.post('/', authorize('admin', 'faculty'), createTest);
router.delete('/:id', authorize('admin', 'faculty'), deleteTest);
router.get('/:id/questions', authorize('admin', 'faculty'), getTestQuestionsAdmin);
router.post('/:id/questions', authorize('admin', 'faculty'), addQuestion);
router.put('/:id/questions/:qId', authorize('admin', 'faculty'), editQuestion);
router.delete('/:id/questions/:qId', authorize('admin', 'faculty'), deleteQuestion);

// Image Upload
router.post('/upload-image', authorize('admin', 'faculty'), uploadQuestionImage, uploadImage);

// Practice Platform Coordinator & Reports (Admin & Faculty)
router.post('/practice-questions/:platform', authorize('admin'), addPracticeQuestion);
router.delete('/practice-questions/:platform/:id', authorize('admin'), deletePracticeQuestion);
router.put('/practice-questions/:platform/:id', authorize('admin'), editPracticeQuestion);
router.post('/practice-questions/:platform/bulk', authorize('admin'), bulkCreatePracticeQuestions);
router.get('/practice-reports/student/:studentId', authorize('admin', 'faculty'), getIndividualPracticeReport);
router.get('/practice-reports/:platform', authorize('admin', 'faculty'), getPracticeReport);

module.exports = router;
