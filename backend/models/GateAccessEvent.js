const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — GATE ACCESS EVENT MODEL
 * Append-only immutable log for all gate validation, check-in, and check-out events.
 * Enforces driver-level pre-hooks to permanently reject update and delete operations.
 */
const GateAccessEventSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  gateName: {
    type: String,
    default: 'Main Gate',
    trim: true
  },

  passType: {
    type: String,
    enum: ['VISITOR_PASS', 'GUARDIAN_CARD', 'EMERGENCY_OVERRIDE'],
    required: true,
    index: true
  },
  passIdentifier: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  passReferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },

  eventType: {
    type: String,
    enum: ['CHECK_IN', 'CHECK_OUT', 'VALIDATION_SCAN_ONLY'],
    required: true
  },
  decision: {
    type: String,
    enum: ['GRANTED', 'DENIED'],
    required: true,
    index: true
  },
  denialReason: {
    type: String,
    enum: [
      'NONE',
      'EXPIRED',
      'REVOKED',
      'NOT_YET_VALID',
      'OUT_OF_SCOPE_CAMPUS',
      'ALREADY_CHECKED_IN',
      'ALREADY_CHECKED_OUT',
      'INVALID_TOKEN',
      'UNVERIFIED_GUARDIAN',
      'PASS_ALREADY_USED'
    ],
    default: 'NONE',
    index: true
  },

  // Minimal Verification Record (Zero student academic PII)
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  hostOrStudentRoll: {
    type: String,
    default: '',
    trim: true
  },

  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  scannedByName: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: '',
    trim: true
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

// Compound indexes for rapid gatehouse security audits
GateAccessEventSchema.index({ campusId: 1, timestamp: -1 });
GateAccessEventSchema.index({ campusId: 1, decision: 1, timestamp: -1 });
GateAccessEventSchema.index({ passIdentifier: 1, timestamp: -1 });

// Driver-level immutable log protection: Prevent all updates and deletes
const immutableError = function (next) {
  const err = new Error('IMMUTABLE_LOG_VIOLATION: GateAccessEvent records are strictly append-only and cannot be modified or deleted.');
  if (typeof next === 'function') {
    return next(err);
  }
  throw err;
};

GateAccessEventSchema.pre('updateOne', immutableError);
GateAccessEventSchema.pre('updateMany', immutableError);
GateAccessEventSchema.pre('findOneAndUpdate', immutableError);
GateAccessEventSchema.pre('deleteOne', immutableError);
GateAccessEventSchema.pre('deleteMany', immutableError);
GateAccessEventSchema.pre('findOneAndDelete', immutableError);

module.exports = mongoose.model('GateAccessEvent', GateAccessEventSchema);
