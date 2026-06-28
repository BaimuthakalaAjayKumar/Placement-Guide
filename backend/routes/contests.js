const express = require('express');
const { getUpcomingContests } = require('../controllers/contests');
const {
  createContest,
  getContests,
  getContestById,
  startContest,
  logViolation,
  submitQuestion,
  finishContest,
  getContestReport,
  getContestLeaderboard
} = require('../controllers/internalContests');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

// External platform contests
router.get('/upcoming', getUpcomingContests);

// Internal portal contests
router.route('/internal')
  .post(createContest)
  .get(getContests);

router.route('/internal/:id')
  .get(getContestById);

router.post('/internal/:id/start', startContest);
router.post('/internal/:id/log-violation', logViolation);
router.post('/internal/:id/submit-question', submitQuestion);
router.post('/internal/:id/finish', finishContest);
router.get('/internal/:id/report', getContestReport);
router.get('/internal/:id/leaderboard', getContestLeaderboard);

module.exports = router;
