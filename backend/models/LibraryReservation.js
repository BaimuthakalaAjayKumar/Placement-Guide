const mongoose = require('mongoose');

const LibraryReservationSchema = new mongoose.Schema({
  reservationNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true
  },
  reservedAt: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'NOTIFIED', 'FULFILLED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING'
  },
  allocatedCopy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookCopy',
    default: null
  }
}, { timestamps: true });

LibraryReservationSchema.index({ book: 1, status: 1 });
LibraryReservationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('LibraryReservation', LibraryReservationSchema);
