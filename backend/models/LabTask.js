const mongoose = require('mongoose');

const LabTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  instructions: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYear: { type: String, required: true, trim: true },
  branch: { type: String, default: '' },
  section: { type: String, default: '' },
  maxScore: { type: Number, default: 100, min: 1 },
  dueDate: { type: Date },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

LabTaskSchema.index({ subject: 1, academicYear: 1, branch: 1, section: 1 });
module.exports = mongoose.model('LabTask', LabTaskSchema);
