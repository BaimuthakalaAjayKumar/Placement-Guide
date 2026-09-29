const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  text: {
    type: String,
    required: true
  },
  replies: [ReplySchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const DiscussionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  userRollNumber: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: [true, 'Please add a discussion title'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Please add post content']
  },
  forumType: {
    type: String,
    enum: ['general', 'subject'],
    default: 'general',
    index: true
  },
  category: {
    type: String,
    default: 'Placement'
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
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
  academicYear: {
    type: String,
    default: '',
    trim: true
  },
  branch: {
    type: String,
    default: '',
    trim: true
  },
  section: {
    type: String,
    default: '',
    trim: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema],
  reported: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

DiscussionSchema.index({ forumType: 1, subject: 1, createdAt: -1 });
DiscussionSchema.index({ academicYear: 1, branch: 1, section: 1 });

module.exports = mongoose.model('Discussion', DiscussionSchema);
