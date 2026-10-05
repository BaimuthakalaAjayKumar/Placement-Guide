const mongoose = require('mongoose');

const AchievementDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide achievement name'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: [true, 'Please provide achievement slug identifier'],
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Please provide achievement description'],
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Coding',
      'Projects',
      'Learning',
      'Interviews',
      'Resume',
      'Contests',
      'Placement',
      'GitHub',
      'Academic',
      'Community'
    ],
    required: true
  },
  icon: {
    type: String,
    default: '🏆'
  },
  rarity: {
    type: String,
    enum: ['Common', 'Rare', 'Epic', 'Legendary'],
    default: 'Common'
  },
  criteria: {
    type: {
      type: String,
      required: true,
      // e.g.: 'problems_solved', 'coding_streak', 'problems_by_difficulty',
      // 'projects_created', 'projects_submitted', 'projects_approved', 'outstanding_project',
      // 'github_connected', 'github_sync', 'github_commits',
      // 'mock_interviews_completed', 'interview_score_master',
      // 'resume_uploaded', 'resume_score',
      // 'contest_participated', 'contest_completed', 'contest_top10', 'contest_top3', 'contest_winner',
      // 'roadmap_completed', 'learning_modules_completed',
      // 'job_applications', 'job_shortlisted', 'job_selected',
      // 'semester_completed', 'academic_sgpa', 'academic_cgpa',
      // 'community_posts', 'doubt_resolved'
    },
    threshold: {
      type: Number,
      default: 1
    },
    difficulty: {
      type: String,
      default: '' // 'Easy', 'Medium', 'Hard'
    },
    minScore: {
      type: Number,
      default: 0
    }
  },
  points: {
    type: Number,
    default: 50,
    min: 10
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AchievementDefinition', AchievementDefinitionSchema);
