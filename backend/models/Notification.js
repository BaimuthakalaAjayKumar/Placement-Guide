const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['plagiarism_alert', 'general'],
    default: 'plagiarism_alert'
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
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
