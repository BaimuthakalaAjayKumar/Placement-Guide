const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDrives,
  getDriveById,
  createDrive,
  applyToDrive,
  updateCandidateStage,
  cancelDrive,
  deleteDrive,
  updateDrive,
  extendDriveDeadline
} = require('../controllers/placementDrives');

router.use(protect);

router.get('/', getDrives);
router.get('/:id', getDriveById);
router.post('/', authorize('admin', 'placement_officer'), createDrive);
router.put('/:id', authorize('admin', 'recruiter', 'placement_officer'), updateDrive);
router.put('/:id/extend-deadline', authorize('admin', 'recruiter', 'placement_officer'), extendDriveDeadline);
router.put('/:id/cancel', authorize('admin', 'recruiter', 'placement_officer'), cancelDrive);
router.delete('/:id', authorize('admin', 'recruiter'), deleteDrive);
router.post('/:id/apply', authorize('student'), applyToDrive);
router.put('/:id/candidates/stage', authorize('admin', 'placement_officer'), updateCandidateStage);
router.put('/:id/candidates/:studentId/stage', authorize('admin', 'placement_officer'), updateCandidateStage);

module.exports = router;
