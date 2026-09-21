const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploaderName: {
    type: String,
    default: ''
  },
  uploaderRole: {
    type: String,
    default: ''
  },
  academicYear: {
    type: String,
    default: '',
    trim: true
  },
  branch: {
    type: String,
    default: '',
    trim: true
  },
  section: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  academicYear: {
    type: String,
    required: true,
    trim: true
  },
  branch: { type: String, default: '', trim: true },
  section: { type: String, default: '', trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: [NoteSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

SubjectSchema.index({ academicYear: 1, branch: 1, section: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
