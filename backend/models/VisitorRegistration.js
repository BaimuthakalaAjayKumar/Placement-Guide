const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — VISITOR REGISTRATION MODEL
 * Master profile for campus visitors with data minimization and institutional retention controls.
 */
const VisitorRegistrationSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Associated campus is required'],
    index: true
  },
  visitorName: {
    type: String,
    required: [true, 'Visitor name is required'],
    trim: true,
    maxlength: [100, 'Visitor name cannot exceed 100 characters']
  },
  visitorPhone: {
    type: String,
    required: [true, 'Visitor phone number is required'],
    trim: true,
    index: true
  },
  visitorEmail: {
    type: String,
    default: '',
    trim: true,
    lowercase: true
  },
  organization: {
    type: String,
    default: '',
    trim: true
  },

  // Identity Verification Type Enum (Includes GOVERNMENT_ID as default)
  idDocumentType: {
    type: String,
    enum: [
      'GOVERNMENT_ID',
      'AADHAAR',
      'PAN_CARD',
      'DRIVING_LICENSE',
      'PASSPORT',
      'INSTITUTIONAL_ID',
      'OTHER'
    ],
    default: 'GOVERNMENT_ID',
    required: true
  },
  // Data Minimization: Strictly last 4 characters stored (e.g. "••••••••4921"). Raw ID is never persisted.
  maskedIdNumber: {
    type: String,
    required: [true, 'Masked ID reference is required'],
    trim: true,
    maxlength: [20, 'Masked ID reference cannot exceed 20 characters']
  },

  purpose: {
    type: String,
    enum: [
      'OFFICIAL_MEETING',
      'PARENT_GUARDIAN_VISIT',
      'VENDOR_SERVICE',
      'CAMPUS_TOUR',
      'GUEST_LECTURE',
      'PLACEMENT_DRIVE',
      'OTHER'
    ],
    required: [true, 'Visit purpose is required']
  },
  purposeDetails: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Purpose details cannot exceed 500 characters']
  },

  // Host Attribution (Campus Scoped)
  hostType: {
    type: String,
    enum: ['STUDENT', 'FACULTY', 'ADMINISTRATOR', 'DEPARTMENT_OFFICE'],
    required: true
  },
  hostUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  hostDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  hostName: {
    type: String,
    required: [true, 'Host name is required'],
    trim: true
  },

  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FLAGGED'],
    default: 'APPROVED',
    index: true
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // 90-Day Operational Retention Governance
  retentionPurged: {
    type: Boolean,
    default: false,
    index: true
  },
  retentionPurgedAt: {
    type: Date,
    default: null
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

VisitorRegistrationSchema.index({ campusId: 1, createdAt: -1 });
VisitorRegistrationSchema.index({ campusId: 1, visitorPhone: 1 });

module.exports = mongoose.model('VisitorRegistration', VisitorRegistrationSchema);
