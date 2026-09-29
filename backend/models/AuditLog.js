const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  rollNumber: {
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
  academicYear: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    default: 'General',
    index: true
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
