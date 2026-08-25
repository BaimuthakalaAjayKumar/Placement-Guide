const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  bio: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  targetRole: {
    type: String,
    default: 'Software Engineer'
  },
  rollNumber: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: ''
  },
  year: {
    type: String,
    default: ''
  },
  readinessScore: {
    type: Number,
    default: 0
  },
  leetcodeUsername: {
    type: String,
    default: ''
  },
  leetcodeStats: {
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    totalSolved: { type: Number, default: 0 },
    solvedSlugs: { type: [String], default: [] }
  },
  codeforcesUsername: {
    type: String,
    default: ''
  },
  codeforcesStats: {
    rating: { type: Number, default: 0 },
    maxRating: { type: Number, default: 0 },
    rank: { type: String, default: 'Unrated' },
    solvedCount: { type: Number, default: 0 }
  },
  codechefUsername: {
    type: String,
    default: ''
  },
  codechefStats: {
    rating: { type: Number, default: 0 },
    stars: { type: String, default: '1★' },
    globalRank: { type: Number, default: 0 },
    countryRank: { type: Number, default: 0 }
  },
  hackerrankUsername: {
    type: String,
    default: ''
  },
  hackerrankStats: {
    solvedCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    badgesCount: { type: Number, default: 0 }
  },
  sgpaSem1: { type: Number, default: 0 },
  sgpaSem2: { type: Number, default: 0 },
  sgpaSem3: { type: Number, default: 0 },
  sgpaSem4: { type: Number, default: 0 },
  sgpaSem5: { type: Number, default: 0 },
  sgpaSem6: { type: Number, default: 0 },
  sgpaSem7: { type: Number, default: 0 },
  sgpaSem8: { type: Number, default: 0 },
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],
  appliedJobs: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    status: {
      type: String,
      enum: ['applied', 'interviewing', 'offered', 'rejected', 'withdrawn'],
      default: 'applied'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
