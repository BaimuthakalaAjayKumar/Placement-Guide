const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createTemporaryCredentials,
  getRecruiterAccounts,
  revokeRecruiterAccount,
  extendRecruiterAccount,
  getSuitableStudents,
  inviteStudentToDrive,
  getMyDrives,
  createDriveByRecruiter,
  updateCandidateRecruiterStage,
  exportRecruiterCSV
} = require('../controllers/recruiter');

router.use(protect);

// Admin-only recruiter management
router.post('/create-temporary-credentials', authorize('admin'), createTemporaryCredentials);
router.get('/accounts', authorize('admin'), getRecruiterAccounts);
router.delete('/accounts/:id', authorize('admin'), revokeRecruiterAccount);
router.put('/accounts/:id/extend', authorize('admin'), extendRecruiterAccount);

// Recruiter & Admin shared operations
router.get('/suitable-students', authorize('recruiter', 'admin'), getSuitableStudents);
router.post('/invite-student', authorize('recruiter', 'admin'), inviteStudentToDrive);
router.get('/my-drives', authorize('recruiter', 'admin'), getMyDrives);
router.post('/drives', authorize('recruiter', 'admin'), createDriveByRecruiter);
router.put('/candidates/:driveId/:studentId/stage', authorize('recruiter', 'admin'), updateCandidateRecruiterStage);
router.get('/export-csv', authorize('recruiter', 'admin'), exportRecruiterCSV);

module.exports = router;
