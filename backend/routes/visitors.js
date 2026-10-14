const express = require('express');
const {
  getVisitorOverview,
  getVisitorPasses,
  registerVisitorAndIssuePass,
  revokeVisitorPass,
  searchHosts
} = require('../controllers/visitors');
const { protect, authorize } = require('../middleware/auth');
const { requireScope } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);

// Overview metrics & passes list
router.get(
  '/overview',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'auditor', 'director', 'principal', 'front_office'),
  getVisitorOverview
);

router.get(
  '/passes',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'auditor', 'director', 'principal', 'front_office'),
  getVisitorPasses
);

// Search hosts (typeahead)
router.get(
  '/search-hosts',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  searchHosts
);

// Register visitor & issue pass
router.post(
  '/register',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  requireScope('CAMPUS', { bodyKey: 'campusId' }),
  registerVisitorAndIssuePass
);

// Revoke visitor pass
router.put(
  '/passes/:id/revoke',
  authorize('admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'),
  revokeVisitorPass
);

module.exports = router;
