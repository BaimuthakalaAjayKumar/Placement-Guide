const mongoose = require('mongoose');

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
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

SubjectSchema.index({ academicYear: 1, branch: 1, section: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
