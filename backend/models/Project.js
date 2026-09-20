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
  technologies: { type: [String], default: [] },
  files: { type: [ProjectFileSchema], default: [] },
  repositoryUrl: { type: String, default: '' },
  previewUrl: { type: String, default: '' },
  milestones: { type: [MilestoneSchema], default: [] },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'changes_requested', 'approved'],
    default: 'draft'
  },
  feedback: { type: String, default: '' },
  grade: { type: Number, min: 0, max: 100, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

ProjectSchema.index({ student: 1, academicYear: 1, updatedAt: -1 });

module.exports = mongoose.model('Project', ProjectSchema);
