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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campus', CampusSchema);
