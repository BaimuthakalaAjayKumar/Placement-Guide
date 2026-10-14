const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: [
      'student',
      'faculty',
      'admin',
      'recruiter',
      'hod',
      'super_admin',
      'campus_admin',
      'administrator',
      'placement_officer',
      'auditor',
      'director',
      'principal',
      'front_office',
      'support_desk',
      'support_desk_supervisor',
      'librarian'
    ],
    default: 'student'
  },
  authorizedRoles: {
    type: [String],
    default: function() { return [this.role]; }
  },
  activeRole: {
    type: String,
    default: function() { return this.role; }
  },
  companyName: {
    type: String,
    default: ''
  },
  companyWebsite: {
    type: String,
    default: ''
  },
  companyLogo: {
    type: String,
    default: ''
  },
  recruiterExpiresAt: {
    type: Date,
    default: null
  },
  isTemporaryAccount: {
    type: Boolean,
    default: false
  },
  tempPasswordPlain: {
    type: String,
    default: ''
  },
  credentialEmailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  credentialEmailError: {
    type: String,
    default: ''
  },
  lastPasswordChangeAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  recruiterNotes: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  targetRole: {
    type: String,
    default: 'Software Engineer'
  },
  rollNumber: {
    type: String,
    default: ''
  },
  mobileNumber: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  section: {
    type: String,
    default: ''
  },
  year: {
    type: String,
    default: ''
  },
  academicYear: {
    type: String,
    default: ''
  },
  // Professional & Academic Profile Fields (Director, Principal, HOD, Faculty, Super Admin)
  employeeId: {
    type: String,
    default: ''
  },
  designation: {
    type: String,
    default: ''
  },
  qualifications: {
    type: String,
    default: ''
  },
  specialization: {
    type: String,
    default: ''
  },
  experience: {
    type: String,
    default: ''
  },
  experienceYears: {
    type: Number,
    default: 0
  },
  officeLocation: {
    type: String,
    default: ''
  },
  reportingAuthority: {
    type: String,
    default: ''
  },
  institutionalResponsibilities: {
    type: [String],
    default: []
  },
  teachingResponsibilities: {
    type: [String],
    default: []
  },
  classAdvisor: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  managedAcademicYears: {
    type: [String],
    default: []
  },
  managedScopes: [{
    academicYear: { type: String, required: true },
    branch: { type: String, default: '' },
    section: { type: String, default: '' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }
  }],
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    default: null,
    index: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  customPermissions: {
    type: [String],
    default: []
  },
  readinessScore: {
    type: Number,
    default: 0
  },
  leetcodeUsername: {
    type: String,
    default: ''
  },
  leetcodeStats: {
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    totalSolved: { type: Number, default: 0 },
    solvedSlugs: { type: [String], default: [] },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, default: 'idle' },
    lastSyncMessage: { type: String, default: '' },
    verifiedSolvedCount: { type: Number, default: 0 },
    verifiedEasyCount: { type: Number, default: 0 },
    verifiedMediumCount: { type: Number, default: 0 },
    verifiedHardCount: { type: Number, default: 0 }
  },
  codeforcesUsername: {
    type: String,
    default: ''
  },
  codeforcesStats: {
    rating: { type: Number, default: 0 },
    maxRating: { type: Number, default: 0 },
    rank: { type: String, default: 'Unrated' },
    solvedCount: { type: Number, default: 0 },
    solvedSlugs: { type: [String], default: [] },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, default: 'idle' },
    lastSyncMessage: { type: String, default: '' },
    verifiedSolvedCount: { type: Number, default: 0 },
    verifiedEasyCount: { type: Number, default: 0 },
    verifiedMediumCount: { type: Number, default: 0 },
    verifiedHardCount: { type: Number, default: 0 }
  },
  codechefUsername: {
    type: String,
    default: ''
  },
  codechefStats: {
    rating: { type: Number, default: 0 },
    stars: { type: String, default: '1★' },
    globalRank: { type: Number, default: 0 },
    countryRank: { type: Number, default: 0 },
    solvedCount: { type: Number, default: 0 },
    solvedSlugs: { type: [String], default: [] },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, default: 'idle' },
    lastSyncMessage: { type: String, default: '' },
    verifiedSolvedCount: { type: Number, default: 0 },
    verifiedEasyCount: { type: Number, default: 0 },
    verifiedMediumCount: { type: Number, default: 0 },
    verifiedHardCount: { type: Number, default: 0 }
  },
  hackerrankUsername: {
    type: String,
    default: ''
  },
  hackerrankStats: {
    solvedCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    badgesCount: { type: Number, default: 0 },
    solvedSlugs: { type: [String], default: [] },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, default: 'idle' },
    lastSyncMessage: { type: String, default: '' },
    verifiedSolvedCount: { type: Number, default: 0 },
    verifiedEasyCount: { type: Number, default: 0 },
    verifiedMediumCount: { type: Number, default: 0 },
    verifiedHardCount: { type: Number, default: 0 }
  },
  githubUsername: {
    type: String,
    default: ''
  },
  githubAvatar: {
    type: String,
    default: ''
  },
  githubProfileUrl: {
    type: String,
    default: ''
  },
  sgpaSem1: { type: Number, default: 0 },
  sgpaSem2: { type: Number, default: 0 },
  sgpaSem3: { type: Number, default: 0 },
  sgpaSem4: { type: Number, default: 0 },
  sgpaSem5: { type: Number, default: 0 },
  sgpaSem6: { type: Number, default: 0 },
  sgpaSem7: { type: Number, default: 0 },
  sgpaSem8: { type: Number, default: 0 },
  cgpa: { type: Number, default: 0 },
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
  appliedJobs: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    status: {
      type: String,
      enum: ['applied', 'under_review', 'under review', 'interviewing', 'offered', 'rejected', 'withdrawn'],
      default: 'applied'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalActiveSeconds: {
    type: Number,
    default: 0
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  lastIpAddress: {
    type: String,
    default: '127.0.0.1'
  },
  lastLoginIp: {
    type: String,
    default: '127.0.0.1'
  },
  currentPage: {
    type: String,
    default: ''
  },
  currentDevice: {
    type: String,
    default: ''
  },
  currentSessionStartedAt: {
    type: Date,
    default: Date.now
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockReason: {
    type: String,
    default: ''
  },
  lockedAt: {
    type: Date,
    default: null
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lockedByName: {
    type: String,
    default: ''
  },
  inactivityWarningSentAt: {
    type: Date,
    default: null
  },
  riskScore: {
    type: Number,
    default: 0
  },
  riskLevel: {
    type: String,
    default: 'Low'
  },
  riskWarningSentAt: {
    type: Date,
    default: null
  },
  lastRiskWarningScore: {
    type: Number,
    default: 0
  },
  lockExemptionUntil: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  guardianContacts: [{
    name: { type: String, default: '' },
    relationship: { type: String, default: 'Parent' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    enabled: { type: Boolean, default: false }
  }],
  attendanceNotificationPreferences: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    parentOptIn: { type: Boolean, default: false },
    dailyDigest: { type: Boolean, default: false }
  },
  biometricProfile: {
    isEnrolled: {
      type: Boolean,
      default: false
    },
    enrolledAt: {
      type: Date,
      default: null
    },
    consentGiven: {
      type: Boolean,
      default: false
    },
    consentDate: {
      type: Date,
      default: null
    },
    encryptedEmbedding: {
      type: String,
      default: null,
      select: false
    },
    authTag: {
      type: String,
      default: null,
      select: false
    },
    iv: {
      type: String,
      default: null,
      select: false
    },
    modelVersion: {
      type: String,
      default: 'cb-facenet-128d-v1'
    },
    enrolledByIp: {
      type: String,
      default: ''
    },
    lastVerifiedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedReason: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
