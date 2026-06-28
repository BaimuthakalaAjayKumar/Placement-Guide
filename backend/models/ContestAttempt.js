const mongoose = require('mongoose');

const ContestAttemptSchema = new mongoose.Schema({
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  isFinished: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  fullscreenExits: {
    type: Number,
    default: 0
  },
  proctoringLogs: [
    {
      timestamp: { type: Date, default: Date.now },
      message: { type: String, required: true },
      type: { type: String, enum: ['info', 'warning', 'violation'], default: 'info' }
    }
  ],
  disqualifiedQuestions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    }
  ],
  submissions: [
    {
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
        required: true
      },
      code: {
        type: String,
        required: true
      },
      language: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['Accepted', 'Wrong Answer', 'Plagiarized', 'Disqualified'],
        default: 'Wrong Answer'
      },
      score: {
        type: Number,
        default: 0
      },
      submittedAt: {
        type: Date,
        default: Date.now
      },
      similarityRefUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ]
});

module.exports = mongoose.model('ContestAttempt', ContestAttemptSchema);
