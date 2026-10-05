const mongoose = require('mongoose');

const SubjectMarkSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true,
    trim: true
  },
  subjectCode: {
    type: String,
    default: '',
    trim: true
  },
  credits: {
    type: Number,
    required: true,
    default: 3,
    min: 0.5,
    max: 12
  },
  marks: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  grade: {
    type: String,
    enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'],
    default: 'F'
  },
  gradePoint: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  passed: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const SemesterRecordSchema = new mongoose.Schema({
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  subjects: [SubjectMarkSchema],
  totalCredits: {
    type: Number,
    default: 0
  },
  sgpa: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  evaluatorName: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const AcademicRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  studentRollNumber: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  studentName: {
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
  academicYear: {
    type: String,
    default: '',
    trim: true
  },
  semesters: [SemesterRecordSchema],
  overallCgpa: {
    type: Number,
    default: 0
  },
  totalCreditsEarned: {
    type: Number,
    default: 0
  },
  totalArrears: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AcademicRecord', AcademicRecordSchema);
