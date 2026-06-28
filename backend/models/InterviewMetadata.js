const mongoose = require('mongoose');

const InterviewRoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    isCustom: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const InterviewTechnologySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    isCustom: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const InterviewRole = mongoose.model('InterviewRole', InterviewRoleSchema);
const InterviewTechnology = mongoose.model('InterviewTechnology', InterviewTechnologySchema);

module.exports = { InterviewRole, InterviewTechnology };
