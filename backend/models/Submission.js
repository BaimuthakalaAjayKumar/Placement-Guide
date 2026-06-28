const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  code: {
    type: String,
    required: [true, 'Please add submitted code']
  },
  language: {
    type: String,
    enum: ['c', 'cpp', 'java', 'python', 'javascript'],
    required: true
  },
  status: {
    type: String,
    enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compilation Error'],
    required: true
  },
  executionTime: {
    type: Number, // in ms
    default: 0
  },
  memoryUsage: {
    type: Number, // in KB
    default: 0
  },
  passedTestCasesCount: {
    type: Number,
    default: 0
  },
  failedTestCasesCount: {
    type: Number,
    default: 0
  },
  totalScore: {
    type: Number,
    default: 0
  },
  plagiarismPercentage: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Submission', SubmissionSchema);
