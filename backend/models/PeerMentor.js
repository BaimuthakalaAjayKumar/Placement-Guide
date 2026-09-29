const mongoose = require('mongoose');

const MentorshipRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: { type: String, required: true },
  studentEmail: { type: String, default: '' },
  studentBranch: { type: String, default: '' },
  studentBatch: { type: String, default: '' },
  message: { type: String, required: true },
  targetCompany: { type: String, default: '' },
  requestedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  mentorNotes: { type: String, default: '' },
  responseDate: { type: Date }
});

const PeerMentorSchema = new mongoose.Schema({
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  mentorName: { type: String, required: true },
  mentorEmail: { type: String, default: '' },
  mentorBranch: { type: String, default: '' },
  placedCompany: { type: String, required: true }, // e.g. "TCS", "Amazon", "Microsoft", "Infosys"
  placedRole: { type: String, required: true },
  packageLPA: { type: String, default: '' },
  bio: { type: String, required: true },
  expertiseAreas: [String], // e.g. ["DSA", "System Design", "Aptitude", "Resume Review", "Mock Interviews"]
  maxMentees: { type: Number, default: 5 },
  isActive: { type: Boolean, default: true },
  mentorshipRequests: [MentorshipRequestSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PeerMentor', PeerMentorSchema);
