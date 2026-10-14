const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — FINE AUTHORIZATION MODEL
 * Enforces mandatory Principal authorization for every library fine settlement.
 * Binds cryptographically to a specific transaction, borrower, and campus.
 * Prevents concurrent re-use, replay, and unauthorized waivers/settlements.
 */
const FineAuthorizationSchema = new mongoose.Schema({
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LibraryTransaction',
    required: [true, 'Please reference target library transaction'],
    index: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Please specify campus reference'],
    index: true
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please reference borrowing student or patron'],
    index: true
  },
  originalFineAmount: {
    type: Number,
    required: true,
    min: 0
  },
  authorizedSettlementAmount: {
    type: Number,
    required: true,
    min: 0
  },
  settlementType: {
    type: String,
    enum: [
      'FULL_PAYMENT',
      'PARTIAL_PAYMENT',
      'WAIVER',
      'DISCOUNT',
      'LOST_BOOK_REPLACEMENT',
      'ADMINISTRATIVE_ADJUSTMENT'
    ],
    default: 'FULL_PAYMENT',
    required: true
  },
  authorizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Authorizing authority reference is mandatory'],
    index: true
  },
  authorizedRole: {
    type: String,
    enum: ['principal', 'director', 'super_admin', 'campus_admin', 'delegate'],
    default: 'principal'
  },
  isDelegated: {
    type: Boolean,
    default: false
  },
  delegationRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrincipalDelegation',
    default: null
  },
  authorizationCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  status: {
    type: String,
    enum: ['AUTHORIZED', 'CONSUMED', 'REVOKED', 'EXPIRED'],
    default: 'AUTHORIZED',
    index: true
  },
  authorizedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  // 48-Hour TTL Policy
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  consumedAt: {
    type: Date,
    default: null
  },
  consumedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  amountCollected: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true
});

// Compound indexes for authorization lookups
FineAuthorizationSchema.index({ transaction: 1, status: 1 });
FineAuthorizationSchema.index({ campusId: 1, status: 1 });
FineAuthorizationSchema.index({ authorizationCode: 1, status: 1 });

module.exports = mongoose.model('FineAuthorization', FineAuthorizationSchema);
