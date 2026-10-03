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
  deleteDrive
} = require('../controllers/placementDrives');

router.use(protect);

router.get('/', getDrives);
router.get('/:id', getDriveById);
router.post('/', authorize('admin'), createDrive);
router.put('/:id/cancel', authorize('admin', 'recruiter'), cancelDrive);
router.delete('/:id', authorize('admin', 'recruiter'), deleteDrive);
router.post('/:id/apply', authorize('student'), applyToDrive);
router.put('/:id/candidates/stage', authorize('admin'), updateCandidateStage);
router.put('/:id/candidates/:studentId/stage', authorize('admin'), updateCandidateStage);

module.exports = router;
