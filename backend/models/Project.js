const mongoose = require('mongoose');

const ProjectFileSchema = new mongoose.Schema({
  path: { type: String, required: true, trim: true },
  content: { type: String, default: '' }
}, { _id: false });

const MilestoneSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed'],
    default: 'planned'
  },
  dueDate: { type: Date }
}, { _id: true });

const TeamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rollNumber: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  role: { type: String, default: 'Developer', trim: true },
  contribution: { type: String, default: '', trim: true },
  grade: { type: Number, min: 0, max: 100, default: null },
  feedback: { type: String, default: '' }
}, { _id: true });

const ProjectVersionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  summary: { type: String, default: 'Code snapshot' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: 'Student' },
  authorEmail: { type: String, default: '' },
  files: { type: [ProjectFileSchema], default: [] },
  deploymentUrl: { type: String, default: '' },
  previewUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const FacultySuggestionSchema = new mongoose.Schema({
  faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyName: { type: String, default: '' },
  facultyRole: { type: String, default: 'faculty' },
  codeSuggestion: { type: String, default: '' },
  techSuggestion: { type: String, default: '' },
  generalFeedback: { type: String, default: '' },
  suggestedAt: { type: Date, default: Date.now }
}, { _id: true });

const ProjectSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  goals: { type: String, default: '' },
  technologies: { type: [String], default: [] },
  teamMembers: { type: [TeamMemberSchema], default: [] },
  files: { type: [ProjectFileSchema], default: [] },
  repositoryUrl: { type: String, default: '' },
  previewUrl: { type: String, default: '' },
  deploymentUrl: { type: String, default: '' },
  milestones: { type: [MilestoneSchema], default: [] },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'changes_requested', 'approved'],
    default: 'draft'
  },
  feedback: { type: String, default: '' },
  codeSuggestions: { type: String, default: '' },
  techSuggestions: { type: String, default: '' },
  facultySuggestions: { type: [FacultySuggestionSchema], default: [] },
  grade: { type: Number, min: 0, max: 100, default: null },
  leadStudentGrade: { type: Number, min: 0, max: 100, default: null },
  leadStudentContribution: { type: String, default: '' },
  leadStudentFeedback: { type: String, default: '' },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastUpdatedByName: { type: String, default: '' },
  versionHistory: { type: [ProjectVersionSchema], default: [] },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

ProjectSchema.index({ student: 1, academicYear: 1, updatedAt: -1 });
ProjectSchema.index({ 'teamMembers.email': 1 });
ProjectSchema.index({ 'teamMembers.rollNumber': 1 });

module.exports = mongoose.model('Project', ProjectSchema);

