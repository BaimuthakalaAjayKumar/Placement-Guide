const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionType: {
    type: String,
    enum: ['mcq', 'coding', 'sql', 'descriptive'],
    default: 'mcq'
  },
  questionText: {
    type: String,
    required: true
  },
  questionImage: {
    type: String,
    default: ''
  },
  // MCQ fields
  options: {
    type: [String],
    default: []
  },
  optionImages: {
    type: [String],
    default: []
  },
  correctOptionIndex: {
    type: Number,
    default: 0
  },
  // Coding fields
  codeStarter: {
    type: String,
    default: ''
  },
  sampleInput: {
    type: String,
    default: ''
  },
  sampleOutput: {
    type: String,
    default: ''
  },
  testCases: [
    {
      input: { type: String, default: '' },
      output: { type: String, default: '' },
      isHidden: { type: Boolean, default: false }
    }
  ],
  // SQL fields
  sqlSchema: {
    type: String,
    default: ''
  },
  expectedSqlOutput: {
    type: String,
    default: ''
  },
  // Descriptive fields
  rubricOrKeywords: {
    type: [String],
    default: []
  },
  maxScore: {
    type: Number,
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  explanation: {
    type: String,
    default: ''
  },
  explanationImage: {
    type: String,
    default: ''
  }
});

const AptitudeTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a test title'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'subject'
  },
  duration: {
    type: Number,
    required: [true, 'Please add duration in minutes'],
    default: 30
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'general'],
    default: 'medium'
  },
  company: {
    type: String,
    default: ''
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  academicYear: {
    type: String,
    default: ''
  },
  branch: { type: String, default: '' },
  section: { type: String, default: '' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  questionLimit: { type: Number, default: 20, min: 1 },

  // Faculty Test Builder Multi-Question Types Supported
  questionTypesIncluded: {
    type: [String],
    default: ['mcq']
  },

  // Faculty Assignment Scope Targeting
  assignmentScope: {
    type: {
      type: String,
      enum: ['all', 'class', 'branch', 'batch', 'department', 'students'],
      default: 'all'
    },
    batches: { type: [String], default: [] },
    branches: { type: [String], default: [] },
    sections: { type: [String], default: [] },
    departments: { type: [String], default: [] },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },

  questions: [QuestionSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdByName: {
    type: String,
    default: 'Faculty'
  },
  createdByRole: {
    type: String,
    default: 'faculty'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AptitudeTest', AptitudeTestSchema);
