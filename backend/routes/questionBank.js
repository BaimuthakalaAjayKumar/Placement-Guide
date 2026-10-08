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
  .post(protect, authorize('admin', 'faculty', 'hod'), createQuestion);

router.post('/bulk', protect, authorize('admin', 'faculty', 'hod'), bulkCreateQuestions);

router.route('/submissions/report')
  .get(protect, authorize('admin', 'faculty', 'hod', 'director', 'principal'), getAdminSubmissionReport);

router.route('/submissions/:submissionId/report')
  .get(protect, getDetailedReport);

router.route('/run-sandbox')
  .post(protect, runSandboxCode);

router.route('/:id')
  .get(protect, getQuestion)
  .put(protect, authorize('admin', 'faculty', 'hod'), updateQuestion)
  .delete(protect, authorize('admin', 'faculty', 'hod'), deleteQuestion);

router.route('/:id/run')
  .post(protect, runCode);

router.route('/:id/submit')
  .post(protect, submitCode);

router.route('/:id/submissions')
  .get(protect, getSubmissions);

module.exports = router;
