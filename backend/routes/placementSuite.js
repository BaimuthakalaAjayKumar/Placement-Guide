const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getKnowledgeHeatmap,
  getSmartRevisionSet,
  getResourceRecommendations,
  getPlacementCertificate,
  getDailyChallenge,
  completeDailyChallenge,
  getPlacementWallet
} = require('../controllers/placementSuite');

router.use(protect);

router.get('/heatmap', getKnowledgeHeatmap);
router.get('/revision-set', getSmartRevisionSet);
router.get('/recommendations', getResourceRecommendations);
router.get('/certificate', getPlacementCertificate);
router.get('/daily-challenge', getDailyChallenge);
router.post('/daily-challenge/complete', completeDailyChallenge);
router.get('/wallet', getPlacementWallet);

module.exports = router;
