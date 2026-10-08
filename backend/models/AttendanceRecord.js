const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — ATTENDANCE RECORD MODEL
 * Represents a single student's attendance record for an individual attendance session.
 * Enforces strict 1-student-to-1-session compound uniqueness to eliminate duplicate check-ins.
 * Stores minimum necessary geolocation telemetry for verifiable room-level audit trails.
 */
const AttendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: [true, 'Please provide sessionId'],
    index: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Please provide campusId for multi-campus isolation'],
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide studentId'],
    index: true
  },
  rollNumber: {
    type: String,
    required: [true, 'Please provide student roll number'],
    trim: true,
    index: true
  },
  studentName: {
    type: String,
    required: [true, 'Please provide student name'],
    trim: true
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
    default: 'ABSENT',
    index: true
  },
  verificationMethod: {
    type: String,
    enum: ['QR_SCAN', 'OTP', 'MANUAL_FACULTY'],
    default: 'QR_SCAN'
  },
  scannedAt: {
    type: Date,
    default: null
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remarks: {
    type: String,
    default: '',
    trim: true
  },
  isFlaggedForReview: {
    type: Boolean,
    default: false,
    index: true
  },
  flagReason: {
    type: String,
    default: '',
    trim: true
  },

  // ============================================================
  // ATTENDANCE CORRECTION & DISPUTE WORKFLOW (Additive - Phase 4)
  // ============================================================
  correctionStatus: {
    type: String,
    enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED'],
    default: 'NONE',
    index: true
  },
  correctionRequestedStatus: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
    default: null
  },
  correctionReason: {
    type: String,
    default: '',
    trim: true
  },
  correctionNotes: {
    type: String,
    default: '',
    trim: true
  },
  correctionRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  correctionRequestedAt: {
    type: Date,
    default: null
  },
  correctionReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  correctionReviewedAt: {
    type: Date,
    default: null
  },
  originalStatus: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', null],
    default: null
  },

  // ============================================================
  // LOCATION & AUDIT TELEMETRY (Backend-calculated & audited)
  // ============================================================
  latitude: {
    type: Number,
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90'],
    default: null
  },
  longitude: {
    type: Number,
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180'],
    default: null
  },
  accuracy: {
    type: Number,
    default: null
  },
  calculatedDistanceMeters: {
    type: Number,
    default: null
  },
  locationVerificationStatus: {
    type: String,
    enum: ['VERIFIED', 'OUTSIDE_GEOFENCE', 'LOCATION_UNAVAILABLE', 'LOW_ACCURACY', 'FAILED'],
    default: 'LOCATION_UNAVAILABLE',
    index: true
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// ============================================================
// UNIQUE ATTENDANCE CONSTRAINT (MANDATORY DUPLICATE PREVENTION)
// One student can have ONLY ONE attendance record per session.
// ============================================================
AttendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

// Campus isolation and performance querying indexes
AttendanceRecordSchema.index({ campusId: 1, studentId: 1 });
AttendanceRecordSchema.index({ studentId: 1, status: 1 });
AttendanceRecordSchema.index({ sessionId: 1, status: 1 });
AttendanceRecordSchema.index({ campusId: 1, rollNumber: 1 });

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);
