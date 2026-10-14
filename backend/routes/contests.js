const express = require('express');
const { getUpcomingContests } = require('../controllers/contests');
const {
  createContest,
  getContests,
  getContestById,
  updateContest,
  publishContest,
  cancelContest,
  startContest,
  logViolation,
  submitQuestion,
  finishContest,
  getContestReport,
  getContestLeaderboard,
  disqualifyAttempt,
  dismissPlagiarism
} = require('../controllers/internalContests');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

// External platform contests
router.get('/upcoming', getUpcomingContests);

// Internal portal contests (Placement Officer & Admin manage; Students view)
router.route('/internal')
  .post(authorize('placement_officer', 'admin', 'super_admin'), createContest)
  .get(getContests);

router.route('/internal/:id')
  .get(getContestById)
  .put(authorize('placement_officer', 'admin', 'super_admin'), updateContest);

router.put('/internal/:id/publish', authorize('placement_officer', 'admin', 'super_admin'), publishContest);
router.put('/internal/:id/cancel', authorize('placement_officer', 'admin', 'super_admin'), cancelContest);

router.post('/internal/:id/start', startContest);
router.post('/internal/:id/log-violation', logViolation);
router.post('/internal/:id/submit-question', submitQuestion);
router.post('/internal/:id/finish', finishContest);
router.get('/internal/:id/report', authorize('placement_officer', 'admin', 'super_admin', 'faculty', 'hod', 'director', 'principal'), getContestReport);
router.get('/internal/:id/leaderboard', getContestLeaderboard);
router.put('/internal/:id/disqualify/:attemptId', disqualifyAttempt);
router.put('/internal/:id/dismiss-plagiarism/:attemptId', dismissPlagiarism);

module.exports = router;
