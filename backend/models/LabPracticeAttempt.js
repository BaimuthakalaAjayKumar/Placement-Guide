const mongoose = require('mongoose');

const LabPracticeAttemptSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTask', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  submission: { type: String, default: '' },
  code: { type: String, default: '' },
  language: { type: String, default: 'cpp' },
  report: { type: String, default: '' },
  score: { type: Number, default: 0, min: 0 },
  feedback: { type: String, default: '' },
  evaluationDetails: {
    logicMatchPercentage: { type: Number, default: 0 },
    structuralMatch: { type: Number, default: 0 },
    remarks: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false }
  },
  plagiarismPercentage: { type: Number, default: 0 },
  plagiarismStatus: {
    type: String,
    enum: ['Original', 'Low Similarity', 'Moderate Similarity', 'High Plagiarism'],
    default: 'Original'
  },
  plagiarizedWith: {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String, default: '' },
    percentage: { type: Number, default: 0 }
  },
  matchedLines: [{
    line: { type: Number },
    matchedCode: { type: String }
  }],
  status: { type: String, enum: ['submitted', 'reviewed'], default: 'submitted' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

LabPracticeAttemptSchema.index({ task: 1, student: 1 }, { unique: true });
module.exports = mongoose.model('LabPracticeAttempt', LabPracticeAttemptSchema);
