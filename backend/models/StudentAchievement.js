const mongoose = require('mongoose');

const StudentAchievementSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  achievement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AchievementDefinition',
    required: true
  },
  isUnlocked: {
    type: Boolean,
    default: false
  },
  earnedAt: {
    type: Date,
    default: null
  },
  progress: {
    current: {
      type: Number,
      default: 0
    },
    target: {
      type: Number,
      default: 1
    },
    percentage: {
      type: Number,
      default: 0
    },
    detail: {
      type: String,
      default: ''
    }
  },
  metadata: {
    verifiedSource: {
      type: String,
      default: ''
    },
    metricValue: {
      type: Number,
      default: 0
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }
}, {
  timestamps: true
});

StudentAchievementSchema.index({ student: 1, achievement: 1 }, { unique: true });

module.exports = mongoose.model('StudentAchievement', StudentAchievementSchema);
