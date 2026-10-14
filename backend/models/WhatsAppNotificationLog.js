const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — ATTENDANCE WHATSAPP NOTIFICATION LOG MODEL
 * Durable audit log and deduplication registry for WhatsApp attendance alerts.
 * Enforces atomic deduplication, safe error metadata storage (never tokens/secrets),
 * and separation between campus arrival and classroom session attendance events.
 */
const WhatsAppNotificationLogSchema = new mongoose.Schema({
  // Unique composite deduplication key preventing duplicate messages
  dedupKey: {
    type: String,
    required: [true, 'dedupKey is required'],
    unique: true,
    index: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'CAMPUS_LATE_ARRIVAL',
      'CAMPUS_ABSENCE',
      'CAMPUS_ARRIVAL_UPDATE',
      'CLASSROOM_ABSENCE'
    ],
    required: [true, 'Notification category is required'],
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    default: '',
    trim: true
  },
  guardianName: {
    type: String,
    default: 'Parent/Guardian',
    trim: true
  },
  guardianPhone: {
    type: String,
    default: '',
    trim: true
  },
  senderNumber: {
    type: String,
    required: true,
    trim: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  // Specific to classroom attendance notifications
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    default: null,
    index: true
  },
  subjectName: {
    type: String,
    default: ''
  },
  subjectCode: {
    type: String,
    default: ''
  },
  facultyName: {
    type: String,
    default: ''
  },
  // Calendar date key (YYYY-MM-DD in IST)
  dateKey: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED'],
    required: true,
    index: true
  },
  messageId: {
    type: String,
    index: true,
    sparse: true,
    trim: true,
    default: null
  },
  errorCode: {
    type: String,
    default: '',
    trim: true
  },
  errorMessage: {
    type: String,
    default: '',
    trim: true
  },
  messageBody: {
    type: String,
    required: true
  },
  providerResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

WhatsAppNotificationLogSchema.index({ studentId: 1, category: 1, dateKey: 1 });
WhatsAppNotificationLogSchema.index({ sessionId: 1, studentId: 1 });
WhatsAppNotificationLogSchema.index({ campusId: 1, dateKey: 1, category: 1 });
WhatsAppNotificationLogSchema.index({ 'providerResponse.messageId': 1 }, { sparse: true });

module.exports = mongoose.model('WhatsAppNotificationLog', WhatsAppNotificationLogSchema);
