const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — VISITOR PASS MODEL
 * Time-bounded physical and digital visitor access pass.
 * Enforces cryptographic opaque tokens, campus isolation, and anti-duplicate check-in state.
 */
const VisitorPassSchema = new mongoose.Schema({
  passNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  visitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VisitorRegistration',
    required: true,
    index: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },

  // Permitted Time Window (strictly validated server-side)
  validDateKey: {
    type: String,
    required: true,
    index: true // YYYY-MM-DD (IST)
  },
  permittedStartTime: {
    type: Date,
    required: true,
    index: true
  },
  permittedEndTime: {
    type: Date,
    required: true,
    index: true
  },

  // Cryptographic, opaque validation token (Never embeds PII)
  qrTokenNonce: {
    type: String,
    required: true,
    select: false
  },
  qrTokenHash: {
    type: String,
    required: true,
    index: true // SHA-256 hash of nonce
  },

  // Pass Lifecycle State
  status: {
    type: String,
    enum: ['ISSUED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED', 'REVOKED'],
    default: 'ISSUED',
    index: true
  },

  // Re-entry Governance
  allowReentry: {
    type: Boolean,
    default: false
  },

  // Concurrency & Duplicate Protection
  activeCheckInCount: {
    type: Number,
    default: 0
  },
  totalEntries: {
    type: Number,
    default: 0
  },
  lastCheckInAt: {
    type: Date,
    default: null
  },
  lastCheckOutAt: {
    type: Date,
    default: null
  },
  lastGateLocation: {
    type: String,
    default: ''
  },

  // Revocation Governance
  isRevoked: {
    type: Boolean,
    default: false,
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
    default: '',
    trim: true
  },

  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Test Harness Metadata (Additive)
  isSyntheticTest: {
    type: Boolean,
    default: false,
    index: true
  },
  testRunId: {
    type: String,
    default: '',
    index: true
  }
}, {
  timestamps: true
});

VisitorPassSchema.index({ campusId: 1, validDateKey: 1, status: 1 });
VisitorPassSchema.index({ campusId: 1, isRevoked: 1 });

module.exports = mongoose.model('VisitorPass', VisitorPassSchema);
