const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — CAMPUS ARRIVAL CHECK-IN LOG MODEL
 * Records student gate/perimeter arrival events independently from classroom attendance.
 * Enforces campus scoping, authoritative server distance calculations, and duplicate protection.
 */
const CampusCheckInLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide user reference'],
    index: true
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Please provide campus reference'],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Submitted coordinates (accessed only for compliance and authorized security audit)
  latitude: {
    type: Number,
    default: null,
    min: [-90, 'Latitude must be between -90 and 90 degrees'],
    max: [90, 'Latitude must be between -90 and 90 degrees']
  },
  longitude: {
    type: Number,
    default: null,
    min: [-180, 'Longitude must be between -180 and 180 degrees'],
    max: [180, 'Longitude must be between -180 and 180 degrees']
  },
  accuracy: {
    type: Number,
    default: null
  },
  // Server-computed evaluation metrics
  calculatedDistanceMeters: {
    type: Number,
    default: null
  },
  configuredPerimeterRadiusMeters: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['VERIFIED', 'OUTSIDE_PERIMETER', 'INACCURATE_GPS', 'FAILED', 'PENDING_REVIEW', 'ABSENT'],
    default: 'VERIFIED',
    index: true
  },
  punctuality: {
    type: String,
    enum: ['ON_TIME', 'LATE', 'UNKNOWN'],
    default: 'ON_TIME',
    index: true
  },
  lateAlertSent: {
    type: Boolean,
    default: false,
    index: true
  },
  lateAlertSentAt: {
    type: Date,
    default: null
  },
  lateAlertStatus: {
    type: String,
    enum: ['NONE', 'SENT', 'FAILED', 'SKIPPED'],
    default: 'NONE'
  },
  absenceAlertSuperseded: {
    type: Boolean,
    default: false,
    index: true
  },
  absenceAlertSupersededAt: {
    type: Date,
    default: null
  },
  verificationMethod: {
    type: String,
    enum: ['DEVICE_GEOFENCE_PERIMETER', 'ADMINISTRATIVE_DESK', 'MANUAL_CONTINGENCY_RECONCILED', 'SYSTEM_EVALUATION', 'FACE_RECOGNITION_PERIMETER'],
    default: 'DEVICE_GEOFENCE_PERIMETER'
  },
  faceVerificationAudit: {
    verified: { type: Boolean, default: false },
    similarityScore: { type: Number, default: null },
    verifiedAt: { type: Date, default: null },
    fallbackReason: { type: String, default: null }
  },
  // Support Desk / Administrative Arrival Correction Lifecycle (Additive — Phase 3)
  correctionStatus: {
    type: String,
    enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED'],
    default: 'NONE',
    index: true
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
    default: null,
    index: true
  },
  correctionRequestedAt: {
    type: Date,
    default: null
  },
  correctionReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  correctionReviewedAt: {
    type: Date,
    default: null
  },
  // Supervisor Self-Submission & SLA Escalation Architecture
  isEscalatedToPrincipal: {
    type: Boolean,
    default: false,
    index: true
  },
  escalatedToRole: {
    type: String,
    enum: ['NONE', 'PRINCIPAL', 'DIRECTOR'],
    default: 'NONE',
    index: true
  },
  escalatedAt: {
    type: Date,
    default: null
  },
  escalationReason: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  referenceCode: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  // Institutional calendar date key (YYYY-MM-DD in IST), used for atomic duplicate prevention
  arrivalDateKey: {
    type: String,
    required: true,
    trim: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index guaranteeing maximum of one verified arrival record per student per calendar date
CampusCheckInLogSchema.index({ user: 1, arrivalDateKey: 1 }, { unique: true });

// Compound indexes for querying user arrivals over time
CampusCheckInLogSchema.index({ user: 1, timestamp: -1 });
CampusCheckInLogSchema.index({ campus: 1, timestamp: -1 });
CampusCheckInLogSchema.index({ user: 1, campus: 1, status: 1 });

module.exports = mongoose.model('CampusCheckInLog', CampusCheckInLogSchema);
