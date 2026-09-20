const mongoose = require('mongoose');

const LabPracticeAttemptSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTask', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submission: { type: String, default: '' },
  report: { type: String, default: '' },
  score: { type: Number, default: 0, min: 0 },
  feedback: { type: String, default: '' },
  status: { type: String, enum: ['submitted', 'reviewed'], default: 'submitted' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

LabPracticeAttemptSchema.index({ task: 1, student: 1 }, { unique: true });
module.exports = mongoose.model('LabPracticeAttempt', LabPracticeAttemptSchema);
