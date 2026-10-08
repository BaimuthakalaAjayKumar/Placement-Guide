const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — ATTENDANCE SESSION MODEL
 * Represents a single lecture or lab attendance session initiated by a faculty member.
 * Enforces campus and department isolation and supports dynamic rotating QR tokens
 * and room-level geofencing.
 */
const AttendanceSessionSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Please provide campusId for campus-isolated session'],
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Please provide departmentId for department isolation'],
    index: true
  },
  branch: {
    type: String,
    required: [true, 'Please provide branch (e.g. IT, CSE, ECE)'],
    trim: true,
    index: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  section: {
    type: String,
    required: [true, 'Please provide section (e.g. A, B, C)'],
    trim: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Please provide subjectId'],
    index: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide facultyId'],
    index: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
    index: true
  },
  // Future timetable reference (safe additive integration)
  timetableId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  academicYear: {
    type: String,
    required: [true, 'Please provide academicYear (e.g. 2024-2025)'],
    trim: true,
    index: true
  },
  semester: {
    type: Number,
    default: 1,
    min: 1,
    max: 8
  },
  period: {
    type: String,
    default: '1',
    trim: true
  },
  sessionDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  scheduledStartTime: {
    type: Date,
    default: null
  },
  scheduledEndTime: {
    type: Date,
    default: null
  },
  actualStartTime: {
    type: Date,
    default: null
  },
  actualEndTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'ACTIVE', 'LOCKED', 'FINALIZED', 'CANCELLED'],
    default: 'SCHEDULED',
    index: true
  },

  // ============================================================
  // ANTI-PROXY SECURITY & DYNAMIC QR METADATA
  // ============================================================
  qrSessionIdentifier: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  qrExpiresAt: {
    type: Date,
    default: null
  },
  qrRefreshInterval: {
    type: Number,
    default: 15, // seconds interval for rolling dynamic QR
    min: [5, 'Refresh interval must be at least 5 seconds'],
    max: [60, 'Refresh interval cannot exceed 60 seconds']
  },
  // Rotating token nonce - never exposed in standard queries (select: false)
  tokenNonce: {
    type: String,
    select: false,
    default: ''
  },
  // Verbal fallback OTP code for students with device/camera issues (select: false)
  otpFallbackCode: {
    type: String,
    select: false,
    default: ''
  },
  geofenceEnforced: {
    type: Boolean,
    default: true
  },

  // ============================================================
  // AGGREGATE SUMMARY COUNTERS
  // ============================================================
  totalEnrolled: {
    type: Number,
    default: 0
  },
  totalPresent: {
    type: Number,
    default: 0
  },
  totalAbsent: {
    type: Number,
    default: 0
  },
  totalLate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Campus-isolated queries and performance indexes
AttendanceSessionSchema.index({ campusId: 1, sessionDate: -1 });
AttendanceSessionSchema.index({ campusId: 1, departmentId: 1, branch: 1, section: 1, academicYear: 1 });
AttendanceSessionSchema.index({ facultyId: 1, status: 1 });
AttendanceSessionSchema.index({ subjectId: 1, sessionDate: -1 });

module.exports = mongoose.model('AttendanceSession', AttendanceSessionSchema);
