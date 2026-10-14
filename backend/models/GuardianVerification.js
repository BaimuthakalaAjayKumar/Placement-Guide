const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — GUARDIAN VERIFICATION & DIGITAL CARD MODEL
 * Institutional legal guardian audit record and server-validated digital card.
 * A self-declared guardianContact in student profile remains strictly UNVERIFIED
 * until a formal physical evidence audit is conducted by registrar or authorized administrator.
 */
const GuardianVerificationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },

  guardianName: {
    type: String,
    required: [true, 'Guardian name is required'],
    trim: true
  },
  relationship: {
    type: String,
    enum: ['FATHER', 'MOTHER', 'LEGAL_GUARDIAN', 'FAMILY_REPRESENTATIVE'],
    required: true
  },
  phone: {
    type: String,
    required: [true, 'Guardian phone is required'],
    trim: true
  },
  email: {
    type: String,
    default: '',
    trim: true
  },

  // Verification Governance
  verificationStatus: {
    type: String,
    enum: [
      'UNVERIFIED',
      'PENDING_DOCUMENT_AUDIT',
      'VERIFIED',
      'REVOKED',
      'EXPIRED'
    ],
    default: 'UNVERIFIED',
    index: true
  },
  proofDocumentType: {
    type: String,
    enum: [
      'GOVERNMENT_ID',
      'BIRTH_CERTIFICATE',
      'LEGAL_GUARDIANSHIP_DECREE',
      'GOVERNMENT_RELATION_PROOF',
      'ADMISSION_RECORD_VERIFIED',
      'NONE'
    ],
    default: 'NONE'
  },
  proofReferenceMasked: {
    type: String,
    default: '',
    trim: true
  },
  verificationNotes: {
    type: String,
    default: '',
    trim: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },

  // Digital Guardian Card Lifecycle
  isCardIssued: {
    type: Boolean,
    default: false,
    index: true
  },
  cardNumber: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    index: true
  },
  cardExpiresAt: {
    type: Date,
    default: null,
    index: true
  },
  cardStatus: {
    type: String,
    enum: ['INACTIVE', 'ACTIVE', 'REVOKED', 'EXPIRED'],
    default: 'INACTIVE',
    index: true
  },
  cardQrNonce: {
    type: String,
    select: false
  },
  cardQrHash: {
    type: String,
    default: null,
    index: true
  },

  reverificationRequiredAt: {
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

GuardianVerificationSchema.index({ student: 1, campusId: 1 });
GuardianVerificationSchema.index({ campusId: 1, verificationStatus: 1 });
GuardianVerificationSchema.index({ campusId: 1, cardStatus: 1 });

module.exports = mongoose.model('GuardianVerification', GuardianVerificationSchema);
