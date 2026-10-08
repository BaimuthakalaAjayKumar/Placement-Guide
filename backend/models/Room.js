const mongoose = require('mongoose');

/**
 * CAMPUSBRIDGE — ROOM & CLASSROOM GEOFENCE MODEL
 * Provides room-level physical geolocation coordinates and individual geofence boundary radii.
 * Enforces multi-campus isolation with strict compound uniqueness per campus.
 */
const RoomSchema = new mongoose.Schema({
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: [true, 'Please provide campusId for room isolation'],
    index: true
  },
  buildingName: {
    type: String,
    required: [true, 'Please provide building name (e.g. CSE Block, Main Academic Block)'],
    trim: true
  },
  roomNumber: {
    type: String,
    required: [true, 'Please provide room number (e.g. 301, Lab-2)'],
    trim: true
  },
  floor: {
    type: String,
    default: '1',
    trim: true
  },
  roomType: {
    type: String,
    enum: ['CLASSROOM', 'LAB', 'SEMINAR_HALL', 'AUDITORIUM', 'OTHER'],
    default: 'CLASSROOM'
  },
  capacity: {
    type: Number,
    default: 60,
    min: [1, 'Room capacity must be at least 1']
  },
  // MANDATORY ROOM-LEVEL GEOFENCING
  latitude: {
    type: Number,
    required: [true, 'Please provide exact latitude coordinate for room geofencing'],
    min: [-90, 'Latitude must be between -90 and 90 degrees'],
    max: [90, 'Latitude must be between -90 and 90 degrees']
  },
  longitude: {
    type: Number,
    required: [true, 'Please provide exact longitude coordinate for room geofencing'],
    min: [-180, 'Longitude must be between -180 and 180 degrees'],
    max: [180, 'Longitude must be between -180 and 180 degrees']
  },
  geofenceRadiusMeters: {
    type: Number,
    default: 30, // Default 30 meters room-level boundary; configurable per classroom/lab
    min: [5, 'Geofence radius must be at least 5 meters'],
    max: [500, 'Geofence radius cannot exceed 500 meters']
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  roomQrIdentifier: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  }
}, {
  timestamps: true
});

// Enforce compound uniqueness: No duplicate room in the same building on the same campus
RoomSchema.index({ campusId: 1, buildingName: 1, roomNumber: 1 }, { unique: true });
RoomSchema.index({ campusId: 1, active: 1 });

module.exports = mongoose.model('Room', RoomSchema);
