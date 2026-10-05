const express = require('express');
const router = express.Router();
const {
  getAllAchievements,
  getMyAchievements,
  evaluateMyAchievements
} = require('../controllers/achievementController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllAchievements);
router.get('/my', protect, getMyAchievements);
router.post('/evaluate', protect, evaluateMyAchievements);

module.exports = router;
