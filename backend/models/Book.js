const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    index: true
  },
  isbn: {
    type: String,
    trim: true,
    default: ''
  },
  authors: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    index: true
  },
  publisher: {
    type: String,
    trim: true,
    default: ''
  },
  edition: {
    type: String,
    trim: true,
    default: ''
  },
  publicationYear: {
    type: Number,
    default: null
  },
  shelfLocation: {
    type: String,
    trim: true,
    default: 'General Stack'
  },
  callNumber: {
    type: String,
    trim: true,
    default: ''
  },
  totalCopies: {
    type: Number,
    default: 0,
    min: 0
  },
  availableCopies: {
    type: Number,
    default: 0,
    min: 0
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

BookSchema.index({ campusId: 1, title: 1 });
BookSchema.index({ campusId: 1, isbn: 1 });
BookSchema.index({ campusId: 1, category: 1 });

module.exports = mongoose.model('Book', BookSchema);
