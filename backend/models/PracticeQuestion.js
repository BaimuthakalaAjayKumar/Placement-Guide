const mongoose = require('mongoose');

const PracticeQuestionSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['leetcode', 'codeforces', 'codechef', 'hackerrank'],
    required: true
  },
  id: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  acceptance: {
    type: String,
    default: '50%'
  },
  slug: {
    type: String,
    required: true
  },
  solution: {
    type: String,
    default: ''
  },
  tags: {
    type: [String],
    default: []
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to guarantee uniqueness of ID per platform & company
PracticeQuestionSchema.index({ platform: 1, id: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('PracticeQuestion', PracticeQuestionSchema);
