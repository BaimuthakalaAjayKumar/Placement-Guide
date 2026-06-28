const mongoose = require('mongoose');

const PlagiarismReportSchema = new mongoose.Schema({
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  plagiarismPercentage: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Original', 'Low Similarity', 'Moderate Similarity', 'High Plagiarism'],
    required: true
  },
  matchedSubmissions: [
    {
      submission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      percentage: { type: Number }
    }
  ],
  matchedLines: [
    {
      line: { type: Number },
      matchedCode: { type: String }
    }
  ],
  similarityGraphData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PlagiarismReport', PlagiarismReportSchema);
