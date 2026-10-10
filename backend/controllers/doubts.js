const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Doubt = require('../models/Doubt');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { logActivity } = require('../utils/auditLogger');

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
            const { subject, description, category, priority, itemType } = req.body;

            if (!subject || !description) {
                return res.status(400).json({ success: false, error: 'Subject and description are required.' });
            }

            const imageUrl = req.file ? `uploads/doubts/${req.file.filename}` : null;

            const doubt = await Doubt.create({
                student: req.user.id,
                subject,
                description,
                category: category || 'General',
                priority: priority || 'standard',
                itemType: itemType || 'complaint',
                imageUrl
            });

            await doubt.populate('student', 'name email rollNumber branch section campusId');

            // Notify Support Desk / Admin by Email
            const adminEmail = process.env.SMTP_EMAIL || 'campusconnect.supportdesk@gmail.com';
            const itemLabel = (itemType || 'complaint').toUpperCase();
            sendEmail({
                to: adminEmail,
                subject: `[${itemLabel}] ${category || 'General'}: ${subject}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; background: #f9fafb; border-radius: 12px;">
            <h2 style="color: #6366f1;">New Institutional ${itemLabel} Submitted</h2>
            <p><strong>Submitter:</strong> ${doubt.student.name} (${doubt.student.email})</p>
            <p><strong>Department/Branch:</strong> ${doubt.student.branch || 'General'} | <strong>Roll:</strong> ${doubt.student.rollNumber || 'N/A'}</p>
            <p><strong>Category:</strong> ${category || 'General'}</p>
            <p><strong>Priority:</strong> ${(priority || 'standard').toUpperCase()}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="margin: 16px 0; border-color: #e5e7eb;" />
            <h4 style="color: #374151;">Description:</h4>
            <p style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">${description}</p>
            ${imageUrl ? `<p><strong>Attachment:</strong> File uploaded (${imageUrl}). View in administrative portal.</p>` : ''}
            <hr style="margin: 16px 0; border-color: #e5e7eb;" />
            <p style="color: #9ca3af; font-size: 12px;">CampusBridge Grievance & Inquiries Dispatch System</p>
          </div>
        `,
                text: `New ${itemLabel} from ${doubt.student.name} (${doubt.student.email})\nCategory: ${category}\nPriority: ${priority}\nSubject: ${subject}\n\nDescription:\n${description}`
            }).catch(err => console.error('Admin doubt notification email failed:', err.message));

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

// @desc    Get all doubts / complaints (Scoped to Admin, Leadership, HOD)
// @route   GET /api/doubts/admin
// @access  Private/Leadership
exports.getAllDoubts = async (req, res, next) => {
    try {
        const filter = {};

        // Scope enforcement for HOD, Principal, Director, Campus Admin
        if (req.user.role === 'hod') {
            const branch = req.user.branch || 'IT';
            const studentQuery = {
                branch: new RegExp(`^${branch}$`, 'i'),
                role: 'student'
            };
            if (req.user.campusId) {
                studentQuery.campusId = req.user.campusId;
            }
            const studentIds = await User.find(studentQuery).distinct('_id');
            filter.student = { $in: studentIds };
        } else if (['principal', 'director', 'campus_admin'].includes(req.user.role)) {
            if (req.user.campusId) {
                const studentIds = await User.find({
                    campusId: req.user.campusId,
                    role: 'student'
                }).distinct('_id');
                filter.student = { $in: studentIds };
            }
        }
        // Super Admin and System Admin have institution-wide access

        const doubts = await Doubt.find(filter)
            .populate('student', 'name email rollNumber branch section campusId')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: doubts.length, data: doubts });
    } catch (err) {
        next(err);
    }
};

// @desc    Admin or authorized lead answers a complaint/doubt
// @route   PUT /api/doubts/:id/answer
// @access  Private/Admin, Leadership
exports.answerDoubt = async (req, res, next) => {
    try {
        const { answer } = req.body;
        if (!answer || !answer.trim()) {
            return res.status(400).json({ success: false, error: 'Resolution remarks text is required.' });
        }

        const doubt = await Doubt.findById(req.params.id).populate('student', 'name email rollNumber branch section campusId');
        if (!doubt) {
            return res.status(404).json({ success: false, error: 'Complaint or query record not found.' });
        }

        // Scope validation on mutation
        if (req.user.role === 'hod') {
            const branch = req.user.branch || 'IT';
            if (doubt.student && doubt.student.branch && !new RegExp(`^${branch}$`, 'i').test(doubt.student.branch)) {
                return res.status(403).json({ success: false, error: 'Access Denied: You can only resolve complaints within your department scope.' });
            }
            if (req.user.campusId && doubt.student && doubt.student.campusId && String(doubt.student.campusId) !== String(req.user.campusId)) {
                return res.status(403).json({ success: false, error: 'Access Denied: Cross-campus resolution is prohibited.' });
            }
        } else if (['principal', 'director', 'campus_admin'].includes(req.user.role)) {
            if (req.user.campusId && doubt.student && doubt.student.campusId && String(doubt.student.campusId) !== String(req.user.campusId)) {
                return res.status(403).json({ success: false, error: 'Access Denied: Cross-campus resolution is prohibited.' });
            }
        }

        const responderRole = req.user.role ? req.user.role.toUpperCase() : 'ADMIN';
        const responderName = req.user.name || 'Administrator';

        doubt.answer = answer.trim();
        doubt.answeredBy = `${responderName} (${responderRole})`;
        doubt.answeredAt = new Date();
        doubt.status = 'answered';
        await doubt.save();

        // Audit Logging
        try {
            await logActivity({
                user: req.user,
                action: 'RESOLVE_COMPLAINT_QUERY',
                category: 'Grievance & Support',
                description: `Complaint ${doubt._id} resolved by ${responderName}`,
                details: {
                    doubtId: doubt._id,
                    subject: doubt.subject,
                    responderRole,
                    studentEmail: doubt.student?.email
                },
                req
            });
        } catch (auditErr) {
            // non-fatal
        }

        // Email notification to student
        sendEmail({
            to: doubt.student.email,
            subject: `[RESOLVED] ${doubt.subject}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #10b981;">Your Query / Complaint Has Been Addressed</h2>
          <p>Hello <strong>${doubt.student.name}</strong>,</p>
          <p>An authorized campus officer (<strong>${doubt.answeredBy}</strong>) has provided an official resolution for your item: <strong>${doubt.subject}</strong></p>
          <hr style="margin: 16px 0; border-color: #e5e7eb;" />
          <h4 style="color: #374151;">Submitted Inquiry / Complaint:</h4>
          <p style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">${doubt.description}</p>
          <h4 style="color: #374151;">Official Resolution / Remarks:</h4>
          <p style="background: #ecfdf5; padding: 12px; border-radius: 8px; border: 1px solid #6ee7b7;">${answer}</p>
          <hr style="margin: 16px 0; border-color: #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Login to CampusBridge Mobile to view resolution history and audit logs.</p>
        </div>
      `,
            text: `Hello ${doubt.student.name},\n\nYour query "${doubt.subject}" has been addressed by ${doubt.answeredBy}.\n\nYour Question:\n${doubt.description}\n\nResolution Remarks:\n${answer}`
        }).catch(err => console.error(`Error sending query resolved email to student ${doubt.student?.email}:`, err.message));

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

        const adminEmail = process.env.SMTP_EMAIL || 'campusconnect.supportdesk@gmail.com';

        sendEmail({
            to: adminEmail,
            subject: `Contact Us Message from ${studentName}: ${subject}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #6366f1;">Contact Us Message</h2>
          <p><strong>From:</strong> ${studentName} (${studentEmail})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="margin: 16px 0; border-color: #e5e7eb;" />
          <h4 style="color: #374151;">Message:</h4>
          <p style="background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">${message}</p>
        </div>
      `,
            text: `Contact Us message from ${studentName} (${studentEmail})\n\nSubject: ${subject}\n\nMessage:\n${message}`
        }).catch(err => console.error('Admin contact us email failed:', err.message));

        res.status(200).json({ success: true, message: 'Message sent to the placement team. We will respond to your email shortly.' });
    } catch (err) {
        next(err);
    }
};

// @desc    Get doubt attachment securely with ownership and scope enforcement
// @route   GET /api/doubts/:id/attachment
// @access  Private (Owner student, scoped HOD, campus Leadership, Admin)
exports.getDoubtAttachment = async (req, res, next) => {
    try {
        const doubt = await Doubt.findById(req.params.id).populate('student', 'name email branch campusId');
        if (!doubt) {
            return res.status(404).json({ success: false, error: 'Complaint or doubt not found.' });
        }
        if (!doubt.imageUrl) {
            return res.status(404).json({ success: false, error: 'No attachment associated with this item.' });
        }

        // Ownership and scope check
        const user = req.user;
        const role = user.role ? user.role.toLowerCase() : 'student';

        if (role === 'student') {
            const studentId = doubt.student?._id ? String(doubt.student._id) : String(doubt.student);
            if (studentId !== String(user._id)) {
                return res.status(403).json({ success: false, error: 'Access Denied: You cannot view attachments belonging to another student.' });
            }
        } else if (role === 'hod') {
            const branch = user.branch || 'IT';
            if (doubt.student && doubt.student.branch && !new RegExp(`^${branch}$`, 'i').test(doubt.student.branch)) {
                return res.status(403).json({ success: false, error: 'Access Denied: Attachment is outside your department scope.' });
            }
            if (user.campusId && doubt.student && doubt.student.campusId && String(doubt.student.campusId) !== String(user.campusId)) {
                return res.status(403).json({ success: false, error: 'Access Denied: Cross-campus access is prohibited.' });
            }
        } else if (['principal', 'director', 'campus_admin'].includes(role)) {
            if (user.campusId && doubt.student && doubt.student.campusId && String(doubt.student.campusId) !== String(user.campusId)) {
                return res.status(403).json({ success: false, error: 'Access Denied: Cross-campus access is prohibited.' });
            }
        } else if (!['admin', 'super_admin'].includes(role)) {
            return res.status(403).json({ success: false, error: 'Access Denied: Unauthorized role.' });
        }

        // Safe path resolution preventing directory traversal
        const filePath = path.join(__dirname, '..', doubt.imageUrl);
        const resolvedPath = path.resolve(filePath);
        const uploadsDir = path.resolve(path.join(__dirname, '../uploads/doubts'));

        if (!resolvedPath.startsWith(uploadsDir)) {
            return res.status(400).json({ success: false, error: 'Invalid attachment path.' });
        }

        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ success: false, error: 'Attachment file not found on server.' });
        }

        return res.sendFile(resolvedPath);
    } catch (err) {
        next(err);
    }
};
