const express = require('express');
const {
  getJobs,
  getJobRecommendations,
  createJob,
  deleteJob,
  updateJobExpiry,
  bulkCreateJobs,
  toggleSaveJob,
  getSavedJobs,
  applyJob,
  getAppliedJobs,
  updateApplicationStatus,
  getAppliedJobsReport,
  exportAppliedJobsCsv
} = require('../controllers/jobs');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/', getJobs);
router.get('/recommendations', getJobRecommendations);
router.get('/saved', getSavedJobs);
router.get('/applied', getAppliedJobs);
router.post('/:id/save', toggleSaveJob);
router.post('/:id/apply', applyJob);

// Admin / Faculty report routes
router.get('/admin/applications-report', authorize('admin', 'faculty'), getAppliedJobsReport);
router.get('/admin/applications-report/export-csv', authorize('admin', 'faculty'), exportAppliedJobsCsv);

// Admin only routes
router.post('/', authorize('admin'), createJob);
router.post('/bulk', authorize('admin'), bulkCreateJobs);
router.put('/:id/expiry', authorize('admin'), updateJobExpiry);
router.delete('/:id', authorize('admin'), deleteJob);
router.put('/:id/status', authorize('admin'), updateApplicationStatus);

module.exports = router;

