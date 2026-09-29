const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMentors,
  becomeMentor,
  requestMentorship,
  respondToRequest,
  getMyMentorships
} = require('../controllers/peerMentors');

router.use(protect);

router.get('/', getMentors);
router.post('/register', becomeMentor);
router.get('/my', getMyMentorships);
router.post('/:id/request', requestMentorship);
router.put('/requests/:requestId', respondToRequest);

module.exports = router;
