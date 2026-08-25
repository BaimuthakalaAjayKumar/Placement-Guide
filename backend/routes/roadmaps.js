const express = require('express');
const {
  getMyRoadmap,
  regenerateMyRoadmap,
  updateStepStatus
} = require('../controllers/roadmaps');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.use(protect); // All roadmap routes require auth

router.get('/me', getMyRoadmap);
router.post('/me/regenerate', regenerateMyRoadmap);
router.put('/steps/:stepId', updateStepStatus);

module.exports = router;
