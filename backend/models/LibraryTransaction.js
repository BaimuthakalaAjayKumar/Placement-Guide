const mongoose = require('mongoose');

const LibraryTransactionSchema = new mongoose.Schema({
  transactionNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true
  },
  bookCopy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookCopy',
    required: true,
    index: true
  },
  accessionNumber: {
    type: String,
    required: true,
    uppercase: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  borrowerName: {
    type: String,
    required: true
  },
  borrowerRoll: {
    type: String,
    default: ''
  },
  borrowerRole: {
    type: String,
    enum: ['student', 'faculty', 'staff', 'other'],
    default: 'student'
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  issueDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  returnDate: {
    type: Date,
    default: null
  },
  renewalCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ISSUED', 'RETURNED', 'OVERDUE', 'RENEWED'],
    default: 'ISSUED',
    index: true
  },
  fineAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  finePaid: {
    type: Boolean,
    default: false
  },
  finePaidAt: {
    type: Date,
    default: null
  },
  // Mandatory Principal Authorization Binding
  principalAuthorizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FineAuthorization',
    default: null,
    index: true
  },
  settlementType: {
    type: String,
    enum: [
      'FULL_PAYMENT',
      'PARTIAL_PAYMENT',
      'WAIVER',
      'DISCOUNT',
      'LOST_BOOK_REPLACEMENT',
      'ADMINISTRATIVE_ADJUSTMENT',
      'NONE'
    ],
    default: 'NONE'
  },
  settlementAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  settlementRecordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  settlementRecordedAt: {
    type: Date,
    default: null
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  returnedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

LibraryTransactionSchema.index({ campusId: 1, status: 1 });
LibraryTransactionSchema.index({ user: 1, status: 1 });
LibraryTransactionSchema.index({ bookCopy: 1, status: 1 });

module.exports = mongoose.model('LibraryTransaction', LibraryTransactionSchema);
