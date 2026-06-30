const express = require('express');
const {
  getJobs,
  getJobRecommendations,
  createJob,
  deleteJob,
  bulkCreateJobs
} = require('../controllers/jobs');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/', getJobs);
router.get('/recommendations', getJobRecommendations);

// Admin only routes
router.post('/', authorize('admin'), createJob);
router.post('/bulk', authorize('admin'), bulkCreateJobs);
router.delete('/:id', authorize('admin'), deleteJob);

module.exports = router;
