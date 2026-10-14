const mongoose = require('mongoose');

const BookCopySchema = new mongoose.Schema({
  accessionNumber: {
    type: String,
    required: [true, 'Accession number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'ISSUED', 'RESERVED', 'MAINTENANCE', 'LOST'],
    default: 'AVAILABLE',
    index: true
  },
  condition: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED'],
    default: 'GOOD'
  },
  currentBorrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  currentTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LibraryTransaction',
    default: null
  },
  acquisitionDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

BookCopySchema.index({ book: 1, status: 1 });
BookCopySchema.index({ campusId: 1, accessionNumber: 1 });

module.exports = mongoose.model('BookCopy', BookCopySchema);
