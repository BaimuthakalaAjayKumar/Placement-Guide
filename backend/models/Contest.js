const mongoose = require('mongoose');

const ContestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a contest title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    enum: ['internal', 'leetcode', 'codeforces', 'codechef', 'hackerrank'],
    default: 'internal'
  },
  officialContestUrl: {
    type: String,
    default: ''
  },
  contestCode: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    required: [true, 'Please add a start time']
  },
  endTime: {
    type: Date,
    required: [true, 'Please add an end time']
  },
  duration: {
    type: Number,
    required: [true, 'Please add a duration in minutes']
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  curatedQuestions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PracticeQuestion'
    }
  ],
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

ContestSchema.index({ platform: 1, isPublished: 1, startTime: -1 });

module.exports = mongoose.model('Contest', ContestSchema);
