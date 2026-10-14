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
    type: String
  },
  code: {
    type: String
  },
  solution: {
    type: String
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

UserSolutionSchema.pre('validate', function(next) {
  const codeVal = this.solutionCode || this.code || this.solution;
  if (codeVal) {
    this.solutionCode = codeVal;
  }
  if (!this.solutionCode) {
    this.invalidate('solutionCode', 'Path `solutionCode` is required.');
  }
  next();
});

UserSolutionSchema.virtual('solutionText')
  .get(function() { return this.solutionCode; })
  .set(function(val) { this.solutionCode = val; });

// Enforce single solution per user/platform/problem
UserSolutionSchema.index({ user: 1, platform: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.model('UserSolution', UserSolutionSchema);
