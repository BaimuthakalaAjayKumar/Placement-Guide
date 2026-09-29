const mongoose = require('mongoose');

const CandidateApplicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  studentRollNumber: { type: String, default: '' },
  studentBranch: { type: String, default: '' },
  studentCgpa: { type: Number, default: 0 },
  studentPhone: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
  currentStage: {
    type: String,
    enum: [
      'applied',
      'shortlisted',
      'online_test_cleared',
      'interview_round_1',
      'interview_round_2',
      'hr_round',
      'selected',
      'rejected',
      'withdrawn'
    ],
    default: 'applied'
  },
  interviewSchedule: {
    roundName: { type: String, default: '' },
    scheduledAt: { type: Date },
    venue: { type: String, default: '' },
    meetingLink: { type: String, default: '' },
    interviewerNotes: { type: String, default: '' }
  },
  offerDetails: {
    offeredPackage: { type: String, default: '' }, // e.g. "12.5 LPA"
    offeredRole: { type: String, default: '' },
    offerLetterUrl: { type: String, default: '' },
    offerDate: { type: Date },
    accepted: { type: Boolean, default: false }
  },
  matchScore: { type: Number, default: 0 }
});

const PlacementDriveSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Please provide company name'],
    trim: true
  },
  companyLogo: {
    type: String,
    default: ''
  },
  companyWebsite: {
    type: String,
    default: ''
  },
  tier: {
    type: String,
    enum: ['Super Dream (10+ LPA)', 'Dream (6-10 LPA)', 'Regular (3-6 LPA)', 'Internship'],
    default: 'Dream (6-10 LPA)'
  },
  title: {
    type: String,
    required: [true, 'Please provide drive title'],
    trim: true
  },
  role: {
    type: String,
    required: true
  },
  packageDetails: {
    type: String, // e.g. "9.5 LPA (Full-time) + 40k/mo Internship"
    required: true
  },
  location: {
    type: String,
    default: 'Hyderabad / Pan India'
  },
  jobDescription: {
    type: String,
    required: true
  },
  skillsRequired: {
    type: [String],
    default: []
  },
  // Eligibility Rules
  eligibility: {
    minCgpa: { type: Number, default: 6.5 },
    maxActiveBacklogs: { type: Number, default: 0 },
    allowedBranches: {
      type: [String],
      default: ['CSE', 'IT', 'CSIT', 'AIML', 'AIDS', 'ECE', 'EEE']
    },
    allowedBatches: {
      type: [String],
      default: ['2026', '2025', '4th Year', '3rd Year']
    },
    min10thPercentage: { type: Number, default: 60 },
    min12thPercentage: { type: Number, default: 60 }
  },
  // Workflow Deadlines
  dates: {
    registrationDeadline: { type: Date, required: true },
    onlineTestDate: { type: Date },
    interviewStartDate: { type: Date },
    driveDate: { type: Date }
  },
  // Drive Status
  status: {
    type: String,
    enum: ['upcoming', 'applications_open', 'applications_closed', 'shortlisting', 'interviews_in_progress', 'completed', 'cancelled'],
    default: 'applications_open'
  },
  driveStages: {
    type: [String],
    default: ['Online Application', 'Aptitude & Coding Test', 'Technical Interview', 'HR Interview', 'Final Selection']
  },
  applications: [CandidateApplicationSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PlacementDrive', PlacementDriveSchema);
