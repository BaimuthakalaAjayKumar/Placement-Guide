const express = require('express');
const {
  getLibrarySummary,
  getBooks,
  getBookById,
  createBook,
  addBookCopies,
  updateBook,
  updateCopyStatus,
  issueBook,
  returnBook,
  renewBook,
  payFine,
  authorizeFineSettlement,
  recordSettlement,
  getFineAuthorizations,
  createPrincipalDelegation,
  getPrincipalDelegations,
  revokePrincipalDelegation,
  reserveBook,
  cancelReservation,
  getReservations,
  getTransactions,
  getMyLoans,
  getLibraryConfig,
  updateLibraryConfig
} = require('../controllers/library');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const ADMIN_STAFF_ROLES = ['admin', 'super_admin', 'campus_admin', 'administrator', 'librarian'];
const AUDIT_LEADERSHIP_ROLES = ['admin', 'super_admin', 'campus_admin', 'administrator', 'auditor', 'director', 'principal', 'librarian'];

// Summary KPI overview
router.get('/summary', authorize(...AUDIT_LEADERSHIP_ROLES), getLibrarySummary);

// Book Catalog
router.get('/books', getBooks);
router.get('/books/:id', getBookById);
router.post('/books', authorize(...ADMIN_STAFF_ROLES), createBook);
router.put('/books/:id', authorize(...ADMIN_STAFF_ROLES), updateBook);
router.post('/books/:id/copies', authorize(...ADMIN_STAFF_ROLES), addBookCopies);
router.put('/copies/:copyId', authorize(...ADMIN_STAFF_ROLES), updateCopyStatus);

// Circulation Desk (Issue, Return, Renewal, Fines)
router.post('/issue', authorize(...ADMIN_STAFF_ROLES), issueBook);
router.post('/return', authorize(...ADMIN_STAFF_ROLES), returnBook);
router.post('/renew', renewBook);

// Mandatory Principal Fine Authorization & Settlement Workflow
router.post(
  '/fines/:id/authorize',
  authorize('principal', 'super_admin', 'campus_admin', 'director', 'administrator', 'faculty'),
  authorizeFineSettlement
);
router.put(
  '/transactions/:id/record-settlement',
  authorize(...ADMIN_STAFF_ROLES),
  recordSettlement
);
router.put(
  '/transactions/:id/pay-fine',
  authorize(...ADMIN_STAFF_ROLES),
  recordSettlement
);
router.get(
  '/fines/authorizations',
  authorize(...AUDIT_LEADERSHIP_ROLES),
  getFineAuthorizations
);

// Principal Delegations Workflow
router.post(
  '/delegations',
  authorize('principal', 'super_admin'),
  createPrincipalDelegation
);
router.get(
  '/delegations',
  authorize(...AUDIT_LEADERSHIP_ROLES),
  getPrincipalDelegations
);
router.put(
  '/delegations/:id/revoke',
  authorize('principal', 'super_admin'),
  revokePrincipalDelegation
);

// Circulation History & Personal Loans
router.get('/transactions', authorize(...AUDIT_LEADERSHIP_ROLES), getTransactions);
router.get('/my-loans', getMyLoans);

// Reservations
router.post('/reservations', reserveBook);
router.put('/reservations/:id/cancel', cancelReservation);
router.get('/reservations', authorize(...AUDIT_LEADERSHIP_ROLES), getReservations);

// Config
router.get('/config', authorize(...AUDIT_LEADERSHIP_ROLES), getLibraryConfig);
router.put('/config', authorize(...ADMIN_STAFF_ROLES), updateLibraryConfig);

module.exports = router;
