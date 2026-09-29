const mongoose = require('mongoose');

const RoundDetailSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  roundName: { type: String, required: true }, // e.g. "Round 1: Online Aptitude", "Round 2: Technical Interview", "Round 3: HR"
  roundType: {
    type: String,
    enum: ['Aptitude', 'Technical', 'HR', 'Managerial', 'Coding', 'Group Discussion'],
    default: 'Technical'
  },
  questionsAsked: [String],
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  durationMinutes: { type: Number, default: 45 },
  experienceSummary: { type: String, default: '' }
});

const InterviewExperienceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: { type: String, required: true },
  studentEmail: { type: String, default: '' },
  studentBranch: { type: String, default: '' },
  studentBatch: { type: String, default: '' },
  company: {
    type: String,
    required: [true, 'Please provide company name (e.g. TCS, Amazon, Microsoft)'],
    trim: true,
    index: true
  },
  role: {
    type: String,
    required: [true, 'Please specify role (e.g. Software Developer)'],
    trim: true
  },
  packageLPA: { type: String, default: '' },
  driveYear: { type: String, default: '2025' },
  hiringType: { type: String, enum: ['On-Campus', 'Off-Campus', 'Pool Drive'], default: 'On-Campus' },
  rounds: [RoundDetailSchema],
  overallFeedback: { type: String, required: true },
  keyTipsForJuniors: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved', // default approved or pending based on moderation settings
    index: true
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: { type: Date },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InterviewExperience', InterviewExperienceSchema);
