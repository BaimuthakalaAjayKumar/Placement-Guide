const express = require('express');
const {
  validatePassOrCard,
  processCheckIn,
  processCheckOut,
  getGateAccessEvents,
  reconcileContingencyManifest
} = require('../controllers/securityGate');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Checkpoint pass & card scan validation
router.post(
  '/validate',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  validatePassOrCard
);

// Check-in and check-out execution
router.post(
  '/check-in',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  processCheckIn
);

router.post(
  '/check-out',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  processCheckOut
);

// Offline contingency batch reconciliation
router.post(
  '/reconcile-contingency',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office', 'support_desk_supervisor'),
  reconcileContingencyManifest
);

// Immutable gate access event audit log
router.get(
  '/events',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'auditor', 'director', 'principal', 'front_office'),
  getGateAccessEvents
);

module.exports = router;
