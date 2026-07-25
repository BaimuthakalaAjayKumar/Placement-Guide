const express = require('express');
const {
  getTests,
  getTestById,
  submitTestAttempt,
  getAttemptsHistory,
  createTest,
  getTestQuestionsAdmin,
  addQuestion,
  editQuestion,
  deleteQuestion,
  getAdminAttempts,
  uploadQuestionImage,
  uploadImage,
  getPracticeQuestions,
  addPracticeQuestion,
  deletePracticeQuestion,
  getPracticeReport,
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

// Practice questions route for students & admins
router.get('/practice-questions/:platform', getPracticeQuestions);

// Admin only routes
router.get('/admin/attempts', authorize('admin'), getAdminAttempts);
router.post('/', authorize('admin'), createTest);
router.get('/:id/questions', authorize('admin'), getTestQuestionsAdmin);
router.post('/:id/questions', authorize('admin'), addQuestion);
router.put('/:id/questions/:qId', authorize('admin'), editQuestion);
router.delete('/:id/questions/:qId', authorize('admin'), deleteQuestion);

// Image Upload
router.post('/upload-image', authorize('admin'), uploadQuestionImage, uploadImage);

// Practice Platform Coordinator
router.post('/practice-questions/:platform', authorize('admin'), addPracticeQuestion);
router.delete('/practice-questions/:platform/:id', authorize('admin'), deletePracticeQuestion);
router.put('/practice-questions/:platform/:id', authorize('admin'), editPracticeQuestion);
router.post('/practice-questions/:platform/bulk', authorize('admin'), bulkCreatePracticeQuestions);
router.get('/practice-reports/:platform', authorize('admin'), getPracticeReport);

module.exports = router;
