const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Doubt = require('../models/Doubt');
const sendEmail = require('../utils/sendEmail');

// Configure multer storage for doubt images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/doubts');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `doubt-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'), false);
    }
};

exports.upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('image');

// @desc    Submit a new doubt (student can attach image)
// @route   POST /api/doubts
// @access  Private/Student
exports.createDoubt = async (req, res, next) => {
    exports.upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, error: err.message });
        }

        try {
            const { subject, description } = req.body;

            if (!subject || !description) {
                return res.status(400).json({ success: false, error: 'Subject and description are required.' });
            }

            const imageUrl = req.file ? `uploads/doubts/${req.file.filename}` : null;

            const doubt = await Doubt.create({
                student: req.user.id,
                subject,
                description,
                imageUrl
            });

            await doubt.populate('student', 'name email');

            // Notify Admin by Email
            const adminEmail = process.env.SMTP_EMAIL || 'admin@prepportal.com';
            await sendEmail({
                to: adminEmail,
                subject: `📬 New Student Query: ${subject}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; background: #f9fafb; border-radius: 12px;">
            <h2 style="color: #6366f1;">📬 New Doubt/Query Submitted</h2>
            <p><strong>Student:</strong> ${doubt.student.name} (${doubt.student.email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="margin: 16px 0; border-color: #e5e7eb;" />
            <h4 style="color: #374151;">Description:</h4>
            <p style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">${description}</p>
            ${imageUrl ? `<p><strong>📎 Image attached.</strong> Please login to the Admin Panel to view the attachment.</p>` : ''}
            <hr style="margin: 16px 0; border-color: #e5e7eb;" />
            <p style="color: #9ca3af; font-size: 12px;">Login to PrepPortal Admin to reply to this query.</p>
          </div>
        `,
                text: `New Doubt from ${doubt.student.name} (${doubt.student.email})\n\nSubject: ${subject}\n\nDescription:\n${description}`
            });

            res.status(201).json({ success: true, data: doubt });
        } catch (error) {
            next(error);
        }
    });
};

// @desc    Get current student's doubts
// @route   GET /api/doubts/my
// @access  Private/Student
exports.getMyDoubts = async (req, res, next) => {
    try {
        const doubts = await Doubt.find({ student: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: doubts.length, data: doubts });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all doubts (Admin)
// @route   GET /api/doubts/admin
// @access  Private/Admin
exports.getAllDoubts = async (req, res, next) => {
    try {
        const doubts = await Doubt.find()
            .populate('student', 'name email rollNumber')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: doubts.length, data: doubts });
    } catch (err) {
        next(err);
    }
};

// @desc    Admin answers a doubt
// @route   PUT /api/doubts/:id/answer
// @access  Private/Admin
exports.answerDoubt = async (req, res, next) => {
    try {
        const { answer } = req.body;
        if (!answer || !answer.trim()) {
            return res.status(400).json({ success: false, error: 'Answer text is required.' });
        }

        const doubt = await Doubt.findById(req.params.id).populate('student', 'name email');
        if (!doubt) {
            return res.status(404).json({ success: false, error: 'Doubt not found.' });
        }

        doubt.answer = answer.trim();
        doubt.answeredBy = 'Administrator';
        doubt.answeredAt = new Date();
        doubt.status = 'answered';
        await doubt.save();

        // Email notification to student
        await sendEmail({
            to: doubt.student.email,
            subject: `✅ Your Query Has Been Answered: ${doubt.subject}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #10b981;">✅ Your Query Has Been Answered</h2>
          <p>Hello <strong>${doubt.student.name}</strong>,</p>
          <p>The Placement Administrator has responded to your query: <strong>${doubt.subject}</strong></p>
          <hr style="margin: 16px 0; border-color: #e5e7eb;" />
          <h4 style="color: #374151;">Your Question:</h4>
          <p style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">${doubt.description}</p>
          <h4 style="color: #374151;">Admin Response:</h4>
          <p style="background: #ecfdf5; padding: 12px; border-radius: 8px; border: 1px solid #6ee7b7;">${answer}</p>
          <hr style="margin: 16px 0; border-color: #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Login to PrepPortal to view your full conversation history.</p>
        </div>
      `,
            text: `Hello ${doubt.student.name},\n\nYour query "${doubt.subject}" has been answered.\n\nYour Question:\n${doubt.description}\n\nAdmin Response:\n${answer}`
        });

        res.status(200).json({ success: true, data: doubt });
    } catch (err) {
        next(err);
    }
};

// @desc    Submit a Contact Us message (sends email to admin)
// @route   POST /api/doubts/contact
// @access  Private
exports.submitContactUs = async (req, res, next) => {
    try {
        const { subject, message } = req.body;
        const studentName = req.user.name;
        const studentEmail = req.user.email;

        if (!subject || !message) {
            return res.status(400).json({ success: false, error: 'Subject and message are required.' });
        }

        const adminEmail = process.env.SMTP_EMAIL || 'admin@prepportal.com';

        await sendEmail({
            to: adminEmail,
            subject: `💬 Contact Us Message from ${studentName}: ${subject}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #6366f1;">💬 Contact Us Message</h2>
          <p><strong>From:</strong> ${studentName} (${studentEmail})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="margin: 16px 0; border-color: #e5e7eb;" />
          <h4 style="color: #374151;">Message:</h4>
          <p style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">${message}</p>
        </div>
      `,
            text: `Contact Us message from ${studentName} (${studentEmail})\n\nSubject: ${subject}\n\nMessage:\n${message}`
        });

        res.status(200).json({ success: true, message: 'Message sent to the placement team. We will respond to your email shortly.' });
    } catch (err) {
        next(err);
    }
};
