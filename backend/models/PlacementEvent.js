const mongoose = require('mongoose');

const PlacementEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add event title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  eventType: {
    type: String,
    enum: [
      'training',
      'mock_interview',
      'company_drive',
      'aptitude_test',
      'deadline',
      'workshop',
      'admin_task',
      'faculty_task',
      'personal_task',
      'general'
    ],
    required: [true, 'Please select event type']
  },
  colorTag: {
    type: String,
    enum: ['green', 'blue', 'purple', 'orange', 'red', 'yellow', 'gold', 'emerald'],
    default: function() {
      const mapping = {
        training: 'green',
        mock_interview: 'blue',
        company_drive: 'purple',
        aptitude_test: 'orange',
        deadline: 'red',
        workshop: 'yellow',
        admin_task: 'gold',
        faculty_task: 'blue',
        personal_task: 'emerald',
        general: 'blue'
      };
      return mapping[this.eventType] || 'blue';
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'students', 'faculty_only', 'private'],
    default: 'public'
  },
  isVisibleToStudents: {
    type: Boolean,
    default: true
  },
  creatorRole: {
    type: String,
    enum: ['admin', 'faculty', 'student'],
    default: 'admin'
  },
  creatorName: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDateTime: {
    type: Date,
    required: [true, 'Please provide start date and time']
  },
  endDateTime: {
    type: Date,
    required: [true, 'Please provide end date and time']
  },
  allDay: {
    type: Boolean,
    default: false
  },
  venueOrLink: {
    type: String,
    default: 'Campus Placement Cell / Online'
  },
  instructorOrCompany: {
    type: String,
    default: ''
  },
  targetAudience: {
    roles: {
      type: [String],
      enum: ['student', 'faculty', 'admin'],
      default: ['student', 'faculty', 'admin']
    },
    branches: {
      type: [String],
      default: ['All']
    },
    batches: {
      type: [String],
      default: ['All']
    }
  },
  relatedDrive: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlacementDrive'
  },
  relatedTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AptitudeTest'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PlacementEvent', PlacementEventSchema);
