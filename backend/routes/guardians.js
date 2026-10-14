const express = require('express');
const {
  getGuardianVerifications,
  verifyGuardianAndIssueCard,
  revokeGuardianCard,
  getStudentGuardianCard
} = require('../controllers/guardians');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// List guardian verification records
router.get(
  '/verifications',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'auditor', 'director', 'principal', 'front_office'),
  getGuardianVerifications
);

// Formally verify relationship and issue digital card
router.post(
  '/verify',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  verifyGuardianAndIssueCard
);

// Revoke digital guardian card
router.put(
  '/:id/revoke',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  revokeGuardianCard
);

// Student self-view of their verified guardian card
router.get(
  '/my-card',
  authorize('student'),
  getStudentGuardianCard
);

module.exports = router;
