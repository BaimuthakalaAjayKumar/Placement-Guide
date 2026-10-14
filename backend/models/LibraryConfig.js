const mongoose = require('mongoose');

const LibraryConfigSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    unique: true
  },
  maxBooksPerStudent: {
    type: Number,
    default: 3
  },
  maxBooksPerFaculty: {
    type: Number,
    default: 6
  },
  borrowPeriodDaysStudent: {
    type: Number,
    default: 14
  },
  borrowPeriodDaysFaculty: {
    type: Number,
    default: 30
  },
  maxRenewalCount: {
    type: Number,
    default: 2
  },
  dailyFineRate: {
    type: Number,
    default: 5
  },
  gracePeriodDays: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('LibraryConfig', LibraryConfigSchema);
