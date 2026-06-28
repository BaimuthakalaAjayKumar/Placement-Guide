const express = require('express');
const {
  startInterview,
  submitInterview,
  getInterviewHistory,
  getAdminInterviewReports,
  getMetadata,
  addRole,
  addTechnology
} = require('../controllers/interviews');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect); // All routes protected

router.get('/metadata', getMetadata);
router.post('/roles', authorize('admin'), addRole);
router.post('/technologies', authorize('admin'), addTechnology);
router.get('/admin/reports', getAdminInterviewReports);
router.post('/start', startInterview);
router.post('/:id/submit', submitInterview);
router.get('/history', getInterviewHistory);

module.exports = router;
