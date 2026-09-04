const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true
  },
  questionImage: {
    type: String,
    default: ''
  },
  options: {
    type: [String],
    required: true,
    validate: [opts => opts.length >= 2, 'Options must have at least 2 choices']
  },
  correctOptionIndex: {
    type: Number,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  explanation: {
    type: String,
    default: ''
  },
  explanationImage: {
    type: String,
    default: ''
  }
});

const AptitudeTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a test title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: [true, 'Please add duration in minutes'],
    default: 30
  },
  difficulty: {
    type: String,
    default: 'general'
  },
  company: {
    type: String,
    default: ''
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  questions: [QuestionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AptitudeTest', AptitudeTestSchema);
