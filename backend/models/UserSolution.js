const mongoose = require('mongoose');

const UserSolutionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['leetcode', 'codeforces', 'codechef', 'hackerrank'],
    required: true
  },
  problemId: {
    type: String,
    required: true
  },
  solutionCode: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'javascript'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Enforce single solution per user/platform/problem
UserSolutionSchema.index({ user: 1, platform: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.model('UserSolution', UserSolutionSchema);
