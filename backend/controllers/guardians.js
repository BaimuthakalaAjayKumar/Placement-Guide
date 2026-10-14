const mongoose = require('mongoose');
const crypto = require('crypto');
const GuardianVerification = require('../models/GuardianVerification');
const User = require('../models/User');
const Campus = require('../models/Campus');
const { generateTokenNonce, createQrPayload } = require('../utils/passTokenService');
const { isSuperAdmin } = require('../utils/scopeFilter');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * @desc    List guardian verification records & card statuses for campus
 * @route   GET /api/guardians/verifications
 * @access  Private (Campus Admin, Administrator, Super Admin)
 */
exports.getGuardianVerifications = async (req, res) => {
  try {
    const isPlatform = isSuperAdmin(req.user);
    const userCampusId = req.user.campusId ? req.user.campusId.toString() : null;

    if (!isPlatform && !userCampusId) {
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: Your user account has no campus assignment.'
      });
    }

    const query = (isPlatform && !userCampusId) ? {} : { campusId: req.user.campusId };

    const { status, search } = req.query;
    if (status) {
      query.verificationStatus = status;
    }

    const records = await GuardianVerification.find(query)
      .populate('student', 'name rollNumber branch section academicYear')
      .populate('verifiedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    let filtered = records;
    if (search) {
      const s = search.toLowerCase();
      filtered = records.filter(r =>
        (r.guardianName && r.guardianName.toLowerCase().includes(s)) ||
        (r.student?.name && r.student.name.toLowerCase().includes(s)) ||
        (r.student?.rollNumber && r.student.rollNumber.toLowerCase().includes(s)) ||
        (r.cardNumber && r.cardNumber.toLowerCase().includes(s))
      );
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Formally verify relationship proof and issue Digital Guardian Card
 * @route   POST /api/guardians/verify
 * @access  Private (Campus Admin, Administrator, Super Admin)
 */
exports.verifyGuardianAndIssueCard = async (req, res) => {
  try {
    const {
      studentId,
      guardianName,
      relationship,
      phone,
      email,
      proofDocumentType,
      proofReferenceMasked,
      verificationNotes,
      expiryDate
    } = req.body;

    if (!studentId || !guardianName || !relationship || !phone || !proofDocumentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required guardian verification fields (studentId, guardianName, relationship, phone, proofDocumentType).'
      });
    }

    if (proofDocumentType === 'NONE') {
      return res.status(400).json({
        success: false,
        error: 'A valid relationship proof document type must be provided for institutional verification.'
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        error: 'Invalid target: Guardian cards can only be issued for registered student accounts.'
      });
    }

    // Campus isolation check
    const isPlatform = isSuperAdmin(req.user);
    const userCampusId = req.user.campusId ? req.user.campusId.toString() : null;
    const studentCampusId = student.campusId ? student.campusId.toString() : null;

    if (!isPlatform && !userCampusId) {
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: Your user account has no campus assignment.'
      });
    }

    if (!isPlatform && studentCampusId && studentCampusId !== userCampusId) {
      return res.status(403).json({ success: false, error: 'Multi-Campus Isolation: Cannot verify guardian for student belonging to another campus.' });
    }

    const campusId = student.campusId || req.user.campusId;
    const campusDoc = await Campus.findById(campusId);

    // 1. Generate Non-Guessable Unique Card Number: GC-YYYY-XXXXX
    const yearSegment = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const cardNumber = `GC-${yearSegment}-${randomHex}`;

    // 2. Generate Cryptographic Nonce & Hash
    const { nonce, hash } = generateTokenNonce();

    // Default expiry: End of current academic year (June 30) or +1 year
    const cardExpiresAt = expiryDate ? new Date(expiryDate) : new Date(yearSegment + 1, 5, 30);

    // 3. Upsert Guardian Verification Record
    let record = await GuardianVerification.findOne({ student: studentId, phone: phone.trim() });

    if (record) {
      record.guardianName = guardianName.trim();
      record.relationship = relationship;
      record.email = email ? email.trim() : '';
      record.verificationStatus = 'VERIFIED';
      record.proofDocumentType = proofDocumentType;
      record.proofReferenceMasked = proofReferenceMasked ? proofReferenceMasked.trim() : '';
      record.verificationNotes = verificationNotes ? verificationNotes.trim() : '';
      record.verifiedBy = req.user._id;
      record.verifiedAt = new Date();
      record.isCardIssued = true;
      record.cardNumber = cardNumber;
      record.cardExpiresAt = cardExpiresAt;
      record.cardStatus = 'ACTIVE';
      record.cardQrNonce = nonce;
      record.cardQrHash = hash;
      await record.save();
    } else {
      record = await GuardianVerification.create({
        student: studentId,
        campusId,
        guardianName: guardianName.trim(),
        relationship,
        phone: phone.trim(),
        email: email ? email.trim() : '',
        verificationStatus: 'VERIFIED',
        proofDocumentType,
        proofReferenceMasked: proofReferenceMasked ? proofReferenceMasked.trim() : '',
        verificationNotes: verificationNotes ? verificationNotes.trim() : '',
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
        isCardIssued: true,
        cardNumber,
        cardExpiresAt,
        cardStatus: 'ACTIVE',
        cardQrNonce: nonce,
        cardQrHash: hash
      });
    }

    // 4. Generate Opaque Zero-PII QR Payload
    const qrPayload = createQrPayload({
      campusCode: campusDoc?.code || 'GRIET',
      passType: 'GUARDIAN',
      identifier: cardNumber,
      nonce
    });

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId,
      action: 'GUARDIAN_RELATIONSHIP_VERIFIED',
      category: 'Security',
      description: `Verified legal guardianship and issued card ${cardNumber} for student ${student.name} (${student.rollNumber})`,
      details: { cardNumber, studentId, proofDocumentType }
    });

    res.status(200).json({
      success: true,
      message: `Guardian card ${cardNumber} issued successfully.`,
      data: {
        record,
        qrPayload
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Revoke an active Digital Guardian Card
 * @route   PUT /api/guardians/:id/revoke
 * @access  Private (Campus Admin, Administrator, Super Admin)
 */
exports.revokeGuardianCard = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'A mandatory revocation reason must be provided.' });
    }

    const record = await GuardianVerification.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Guardian verification record not found.' });
    }

    // Campus isolation check
    const isPlatform = isSuperAdmin(req.user);
    const userCampusId = req.user.campusId ? req.user.campusId.toString() : null;
    const recordCampusId = record.campusId ? record.campusId.toString() : null;

    if (!isPlatform && !userCampusId) {
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: Your user account has no campus assignment.'
      });
    }

    if (!isPlatform && recordCampusId && recordCampusId !== userCampusId) {
      return res.status(403).json({ success: false, error: 'Multi-Campus Isolation: Cannot revoke card belonging to another campus.' });
    }

    record.verificationStatus = 'REVOKED';
    record.cardStatus = 'REVOKED';
    record.verificationNotes = `${record.verificationNotes || ''} | REVOKED: ${reason.trim()}`;
    await record.save();

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId: record.campusId,
      action: 'GUARDIAN_CARD_REVOKED',
      category: 'Security',
      description: `Revoked guardian card ${record.cardNumber || record._id}. Reason: ${reason.trim()}`,
      details: { cardNumber: record.cardNumber, reason: reason.trim() }
    });

    res.status(200).json({
      success: true,
      message: `Guardian card has been revoked.`,
      data: record
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Student self-view of their own verified Digital Guardian Card
 * @route   GET /api/guardians/my-card
 * @access  Private (Student)
 */
exports.getStudentGuardianCard = async (req, res) => {
  try {
    const studentId = req.user._id;

    const record = await GuardianVerification.findOne({
      student: studentId,
      verificationStatus: 'VERIFIED',
      cardStatus: 'ACTIVE',
      cardExpiresAt: { $gt: new Date() }
    })
      .select('+cardQrNonce')
      .populate('campusId', 'name code address')
      .lean();

    if (!record) {
      // Check if student has an unverified or pending record
      const pendingRecord = await GuardianVerification.findOne({ student: studentId }).lean();
      return res.status(200).json({
        success: true,
        hasActiveCard: false,
        verificationStatus: pendingRecord ? pendingRecord.verificationStatus : 'UNVERIFIED',
        message: 'No active institutionally verified Digital Guardian Card issued yet.'
      });
    }

    // Generate fresh opaque QR payload for display
    const qrPayload = createQrPayload({
      campusCode: record.campusId?.code || 'GRIET',
      passType: 'GUARDIAN',
      identifier: record.cardNumber,
      nonce: record.cardQrNonce
    });

    res.status(200).json({
      success: true,
      hasActiveCard: true,
      data: {
        cardNumber: record.cardNumber,
        guardianName: record.guardianName,
        relationship: record.relationship,
        cardExpiresAt: record.cardExpiresAt,
        verificationStatus: record.verificationStatus,
        cardStatus: record.cardStatus,
        campusName: record.campusId?.name || 'GRIET',
        qrPayload
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
