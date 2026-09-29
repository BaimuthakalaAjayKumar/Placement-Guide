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
    enum: ['training', 'mock_interview', 'company_drive', 'aptitude_test', 'deadline', 'workshop'],
    required: [true, 'Please select event type']
  },
  colorTag: {
    type: String,
    enum: ['green', 'blue', 'purple', 'orange', 'red', 'yellow'],
    default: function() {
      const mapping = {
        training: 'green',
        mock_interview: 'blue',
        company_drive: 'purple',
        aptitude_test: 'orange',
        deadline: 'red',
        workshop: 'yellow'
      };
      return mapping[this.eventType] || 'blue';
    }
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
