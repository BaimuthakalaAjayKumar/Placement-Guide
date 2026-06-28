const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a job title'],
    trim: true
  },
  company: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a job description']
  },
  requirements: {
    type: [String],
    default: []
  },
  location: {
    type: String,
    default: 'Remote'
  },
  salary: {
    type: String,
    default: 'Not Specified'
  },
  experienceLevel: {
    type: String,
    default: 'Entry Level'
  },
  applyLink: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Job', JobSchema);
