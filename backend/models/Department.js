const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Please provide associated campus ID'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please provide department name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide department code'],
    uppercase: true,
    trim: true
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  branches: [{
    type: String,
    trim: true
  }],
  academicYears: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

DepartmentSchema.index({ campusId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Department', DepartmentSchema);
