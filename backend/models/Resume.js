const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  parsedText: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  experience: [
    {
      company: String,
      role: String,
      duration: String,
      description: String
    }
  ],
  education: [
    {
      institution: String,
      degree: String,
      year: String,
      grade: String
    }
  ],
  score: {
    type: Number,
    default: 0
  },
  suggestions: {
    type: [String],
    default: []
  },
  keywordsMissing: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Resume', ResumeSchema);
