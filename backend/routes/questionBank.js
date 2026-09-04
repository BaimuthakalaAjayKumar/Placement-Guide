const express = require('express');
const {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  runCode,
  submitCode,
  getSubmissions,
  getDetailedReport,
  getAdminSubmissionReport,
  bulkCreateQuestions,
  runSandboxCode
} = require('../controllers/questionBank');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getQuestions)
  .post(protect, authorize('admin'), createQuestion);

router.post('/bulk', protect, authorize('admin'), bulkCreateQuestions);

router.route('/submissions/report')
  .get(protect, authorize('admin', 'faculty'), getAdminSubmissionReport);

router.route('/submissions/:submissionId/report')
  .get(protect, getDetailedReport);

router.route('/run-sandbox')
  .post(protect, runSandboxCode);

router.route('/:id')
  .get(protect, getQuestion)
  .put(protect, authorize('admin'), updateQuestion)
  .delete(protect, authorize('admin'), deleteQuestion);

router.route('/:id/run')
  .post(protect, runCode);

router.route('/:id/submit')
  .post(protect, submitCode);

router.route('/:id/submissions')
  .get(protect, getSubmissions);

module.exports = router;
