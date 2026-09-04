const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a question title'],
    trim: true,
    unique: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Easy'
  },
  description: {
    type: String,
    required: [true, 'Please add a problem description']
  },
  constraints: {
    type: String,
    default: ''
  },
  inputFormat: {
    type: String,
    default: ''
  },
  outputFormat: {
    type: String,
    default: ''
  },
  sampleInput: {
    type: String,
    default: ''
  },
  sampleOutput: {
    type: String,
    default: ''
  },
  explanation: {
    type: String,
    default: ''
  },
  visibleTestCases: [
    {
      input: { type: String, default: '' },
      output: { type: String, default: '' }
    }
  ],
  hiddenTestCases: [
    {
      input: { type: String, default: '' },
      output: { type: String, default: '' }
    }
  ],
  timeLimit: {
    type: Number,
    default: 2000 // in ms
  },
  memoryLimit: {
    type: Number,
    default: 256 // in MB
  },
  tags: {
    type: [String],
    default: []
  },
  allowedLanguages: {
    type: [String],
    default: ['c', 'cpp', 'java', 'python', 'javascript']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  company: {
    type: String,
    default: ''
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Question', QuestionSchema);
