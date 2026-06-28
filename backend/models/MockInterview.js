const mongoose = require('mongoose');

const InterviewQA = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    default: 'technical'
  },
  technology: {
    type: String,
    default: 'General'
  },
  userResponse: {
    type: String,
    default: ''
  },
  feedback: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    default: 0
  }
});

const MockInterviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  jobRole: {
    type: String,
    required: true
  },
  technology: {
    type: String,
    default: 'General'
  },
  questionCount: {
    type: Number,
    default: 10
  },
  questions: [InterviewQA],
  overallScore: {
    type: Number,
    default: 0
  },
  generalFeedback: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'in-progress'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('MockInterview', MockInterviewSchema);
