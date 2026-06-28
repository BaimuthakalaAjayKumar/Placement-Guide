const mongoose = require('mongoose');

const DoubtSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: String,
        required: [true, 'Please provide a subject for the doubt'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: [true, 'Please describe the doubt'],
        maxlength: 5000
    },
    imageUrl: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'answered'],
        default: 'pending'
    },
    answer: {
        type: String,
        default: ''
    },
    answeredBy: {
        type: String,
        default: ''
    },
    answeredAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Doubt', DoubtSchema);
