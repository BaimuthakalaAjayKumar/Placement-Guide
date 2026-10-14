const express = require('express');
const {
  submitScopeRequest,
  getMyScopeRequests,
  withdrawScopeRequest,
  getPendingScopeRequests,
  approveScopeRequest,
  rejectScopeRequest
} = require('../controllers/academicScopeRequests');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Student request submission, personal history retrieval, and cancellation
router.post('/', authorize('student'), submitScopeRequest);
router.get('/my', authorize('student'), getMyScopeRequests);
router.delete('/:id', authorize('student'), withdrawScopeRequest);

// Administrative roster of pending scope change requests
router.get(
  '/pending',
  authorize('admin', 'campus_admin', 'administrator', 'hod', 'director', 'principal', 'super_admin'),
  getPendingScopeRequests
);

// Tiered approval decisions (HOD for section-only; Campus Administrator for branch/year)
router.put(
  '/:id/approve',
  authorize('admin', 'campus_admin', 'administrator', 'hod', 'super_admin'),
  approveScopeRequest
);

router.put(
  '/:id/reject',
  authorize('admin', 'campus_admin', 'administrator', 'hod', 'super_admin'),
  rejectScopeRequest
);

module.exports = router;
