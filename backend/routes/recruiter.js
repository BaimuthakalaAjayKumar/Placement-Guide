const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createTemporaryCredentials,
  getRecruiterAccounts,
  revokeRecruiterAccount,
  extendRecruiterAccount,
  resetRecruiterPassword,
  resendRecruiterCredentials,
  getSuitableStudents,
  inviteStudentToDrive,
  getMyDrives,
  createDriveByRecruiter,
  updateCandidateRecruiterStage,
  exportRecruiterCSV,
  bulkAddCandidates,
  conductDriveExam,
  bulkImportTestCleared,
  bulkAdvanceCandidatesStage,
  checkDateConflict
} = require('../controllers/recruiter');

router.use(protect);

// Admin & Super Admin recruiter credential management
router.post('/create-temporary-credentials', authorize('admin', 'super_admin', 'campus_admin'), createTemporaryCredentials);
router.get('/accounts', authorize('admin', 'super_admin', 'campus_admin', 'director', 'principal'), getRecruiterAccounts);
router.delete('/accounts/:id', authorize('admin', 'super_admin', 'campus_admin'), revokeRecruiterAccount);
router.put('/accounts/:id/extend', authorize('admin', 'super_admin', 'campus_admin'), extendRecruiterAccount);
router.post('/accounts/:id/reset-password', authorize('admin', 'super_admin', 'campus_admin'), resetRecruiterPassword);
router.post('/accounts/:id/resend-credentials', authorize('admin', 'super_admin', 'campus_admin'), resendRecruiterCredentials);

// Recruiter & Admin shared operations
const { cancelDrive, deleteDrive } = require('../controllers/placementDrives');

router.get('/check-date-conflict', authorize('recruiter', 'admin'), checkDateConflict);
router.get('/suitable-students', authorize('recruiter', 'admin'), getSuitableStudents);
router.post('/invite-student', authorize('recruiter', 'admin'), inviteStudentToDrive);
router.get('/my-drives', authorize('recruiter', 'admin'), getMyDrives);
router.post('/drives', authorize('recruiter', 'admin'), createDriveByRecruiter);
router.put('/drives/:id/cancel', authorize('recruiter', 'admin'), cancelDrive);
router.delete('/drives/:id', authorize('recruiter', 'admin'), deleteDrive);
router.put('/candidates/:driveId/:studentId/stage', authorize('recruiter', 'admin'), updateCandidateRecruiterStage);
router.get('/export-csv', authorize('recruiter', 'admin'), exportRecruiterCSV);

// Candidate selection, conducting exam, and bulk stage advancement
router.post('/drives/:driveId/bulk-add-candidates', authorize('recruiter', 'admin'), bulkAddCandidates);
router.post('/drives/:driveId/conduct-exam', authorize('recruiter', 'admin'), conductDriveExam);
router.post('/drives/:driveId/bulk-import-test-cleared', authorize('recruiter', 'admin'), bulkImportTestCleared);
router.post('/drives/:driveId/bulk-advance-stage', authorize('recruiter', 'admin'), bulkAdvanceCandidatesStage);

module.exports = router;
