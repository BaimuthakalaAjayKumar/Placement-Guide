const mongoose = require('mongoose');

const CampusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide campus name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide unique campus code'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  domain: {
    type: String,
    default: 'grietcollege.com',
    trim: true
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: 'Hyderabad' },
    state: { type: String, default: 'Telangana' },
    pincode: { type: String, default: '500090' },
    country: { type: String, default: 'India' }
  },
  contactEmail: {
    type: String,
    default: '',
    trim: true
  },
  contactPhone: {
    type: String,
    default: '',
    trim: true
  },
  campusAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  placementOfficers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Optional campus-level geofence coordinates (nullable until explicitly configured)
  latitude: {
    type: Number,
    default: null,
    min: [-90, 'Latitude must be between -90 and 90 degrees'],
    max: [90, 'Latitude must be between -90 and 90 degrees']
  },
  longitude: {
    type: Number,
    default: null,
    min: [-180, 'Longitude must be between -180 and 180 degrees'],
    max: [180, 'Longitude must be between -180 and 180 degrees']
  },
  arrivalPerimeterRadiusMeters: {
    type: Number,
    default: null,
    min: [5, 'Perimeter radius must be at least 5 meters'],
    max: [5000, 'Perimeter radius cannot exceed 5000 meters']
  },
  // Campus Arrival Attendance Configuration (Standard Cutoff: 10:00 AM IST)
  arrivalCutoffTime: {
    type: String,
    default: '10:00',
    trim: true
  },
  absenceEvaluationTime: {
    type: String,
    default: '10:30',
    trim: true
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campus', CampusSchema);
