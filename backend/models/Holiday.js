const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
    date: {
        type: String, // Store as ISO date string 'YYYY-MM-DD'
        required: [true, 'Please add a date'],
        unique: true
    },
    description: {
        type: String,
        default: 'Holiday'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Holiday', HolidaySchema);
