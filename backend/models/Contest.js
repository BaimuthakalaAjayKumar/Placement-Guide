const mongoose = require('mongoose');

const ContestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a contest title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    required: [true, 'Please add a start time']
  },
  endTime: {
    type: Date,
    required: [true, 'Please add an end time']
  },
  duration: {
    type: Number,
    required: [true, 'Please add a duration in minutes']
  },
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Contest', ContestSchema);
