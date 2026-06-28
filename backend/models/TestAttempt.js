const mongoose = require('mongoose');

const TestAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  test: {
    type: mongoose.Schema.ObjectId,
    ref: 'AptitudeTest',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  answers: {
    type: [Number], // Indecies of user's chosen options
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TestAttempt', TestAttemptSchema);
