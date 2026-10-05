const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['plagiarism_alert', 'job_update', 'general', 'test_assigned', 'lab_assigned', 'academic_update', 'achievement_unlocked'],
    default: 'general'
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeTest' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabTask' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'AchievementDefinition' },
    badgeName: { type: String },
    badgeIcon: { type: String },
    subjectName: { type: String },
    expiresAt: { type: Date },
    plagiarismPercentage: { type: Number },
    studentName: { type: String }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
