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
  isArchived: {
    type: Boolean,
    default: false
  },
  officialProblemId: {
    type: String,
    default: ''
  },
  officialUrl: {
    type: String,
    default: ''
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
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to guarantee uniqueness of ID per platform & company
PracticeQuestionSchema.index({ platform: 1, id: 1, company: 1 }, { unique: true });
PracticeQuestionSchema.index({ platform: 1, isArchived: 1, difficulty: 1 });
PracticeQuestionSchema.index({ platform: 1, slug: 1 });
PracticeQuestionSchema.index({ platform: 1, officialProblemId: 1 });

module.exports = mongoose.model('PracticeQuestion', PracticeQuestionSchema);
