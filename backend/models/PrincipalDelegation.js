const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — PRINCIPAL DELEGATION MODEL
 * Represents formal, audited delegation of administrative authorization powers
 * during Principal absence. Delegate cannot be a Librarian (enforces separation of duties).
 */
const PrincipalDelegationSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Campus reference is mandatory'],
    index: true
  },
  principal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Authorizing Principal reference is mandatory'],
    index: true
  },
  delegate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Designated delegate reference is mandatory'],
    index: true
  },
  delegateName: {
    type: String,
    required: true
  },
  delegateRole: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    required: [true, 'Official delegation purpose/justification required'],
    trim: true
  },
  permittedScopes: {
    type: [String],
    default: ['LIBRARY_FINE_AUTHORIZATION']
  },
  startDate: {
    type: Date,
    required: [true, 'Delegation start timestamp is mandatory']
  },
  endDate: {
    type: Date,
    required: [true, 'Delegation expiration timestamp is mandatory'],
    index: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
    default: 'ACTIVE',
    index: true
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  revocationReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

PrincipalDelegationSchema.index({ campusId: 1, delegate: 1, status: 1 });
PrincipalDelegationSchema.index({ campusId: 1, status: 1, endDate: 1 });

module.exports = mongoose.model('PrincipalDelegation', PrincipalDelegationSchema);
