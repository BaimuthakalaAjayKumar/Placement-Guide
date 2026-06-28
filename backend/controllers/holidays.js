const Holiday = require('../models/Holiday');

// @desc    Get all holidays
// @route   GET /api/holidays
// @access  Private
exports.getHolidays = async (req, res, next) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 });
        res.status(200).json({
            success: true,
            count: holidays.length,
            data: holidays
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Create holiday
// @route   POST /api/holidays
// @access  Private/Admin
exports.createHoliday = async (req, res, next) => {
    try {
        const { date, description } = req.body;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a date'
            });
        }

        // Check if holiday already exists for this date
        let holiday = await Holiday.findOne({ date });
        if (holiday) {
            return res.status(400).json({
                success: false,
                error: 'Holiday already exists for this date'
            });
        }

        holiday = await Holiday.create({
            date,
            description: description || 'Holiday'
        });

        res.status(201).json({
            success: true,
            data: holiday
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete holiday
// @route   DELETE /api/holidays/:id
// @access  Private/Admin
exports.deleteHoliday = async (req, res, next) => {
    try {
        const holiday = await Holiday.findById(req.params.id);

        if (!holiday) {
            return res.status(404).json({
                success: false,
                error: 'Holiday not found'
            });
        }

        await Holiday.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};
