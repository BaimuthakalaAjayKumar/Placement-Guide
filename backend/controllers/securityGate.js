const mongoose = require('mongoose');
const VisitorPass = require('../models/VisitorPass');
const VisitorRegistration = require('../models/VisitorRegistration');
const GuardianVerification = require('../models/GuardianVerification');
const GateAccessEvent = require('../models/GateAccessEvent');
const Campus = require('../models/Campus');
const User = require('../models/User');
const { parseAndVerifyQrPayload, hashNonce } = require('../utils/passTokenService');
const { isSuperAdmin } = require('../utils/scopeFilter');

/**
 * Helper: Safely insert immutable GateAccessEvent record with fail-secure validation
 */
const recordGateEvent = async ({
  campusId,
  gateName = 'Main Gate',
  passType,
  passIdentifier,
  passReferenceId = null,
  eventType,
  decision,
  denialReason = 'NONE',
  subjectName,
  hostOrStudentRoll = '',
  scannedBy,
  scannedByName,
  ipAddress = '',
  userAgent = '',
  notes = '',
  session = null
}) => {
  const eventData = {
    campusId,
    gateName,
    passType,
    passIdentifier,
    passReferenceId,
    eventType,
    decision,
    denialReason,
    subjectName,
    hostOrStudentRoll,
    scannedBy,
    scannedByName,
    timestamp: new Date(),
    ipAddress,
    userAgent,
    notes
  };

  const options = session ? { session } : {};
  const [createdEvent] = await GateAccessEvent.create([eventData], options);
  return createdEvent;
};

/**
 * @desc    Validate a scanned pass or manually entered identifier server-side
 * @route   POST /api/security-gate/validate
 * @access  Private (Administrator, Campus Admin, Super Admin)
 */
exports.validatePassOrCard = async (req, res) => {
  try {
    const { qrText, manualIdentifier, manualPassType, gateName = 'Main Gate' } = req.body;
    const serverNow = new Date();
    const userCampusId = req.user.campusId;
    const userCampusStr = userCampusId ? userCampusId.toString() : null;
    const isPlatform = isSuperAdmin(req.user);

    if (!isPlatform && !userCampusStr) {
      return res.status(403).json({
        success: false,
        decision: 'DENIED',
        denialReason: 'OUT_OF_SCOPE_CAMPUS',
        message: 'Access Denied: Operating user is not assigned to any campus.'
      });
    }

    let passType = manualPassType || 'VISITOR_PASS';
    let identifier = (manualIdentifier || '').trim().toUpperCase();
    if (!qrText && identifier.startsWith('GC-')) {
      passType = 'GUARDIAN_CARD';
    } else if (!qrText && identifier.startsWith('VP-')) {
      passType = 'VISITOR_PASS';
    }
    let tokenNonce = null;

    // 1. Parse QR payload if provided
    if (qrText) {
      const qrParsed = parseAndVerifyQrPayload(qrText);
      if (!qrParsed.valid) {
        if (userCampusId) {
          await recordGateEvent({
            campusId: userCampusId,
            gateName,
            passType: 'VISITOR_PASS',
            passIdentifier: 'INVALID_QR',
            eventType: 'VALIDATION_SCAN_ONLY',
            decision: 'DENIED',
            denialReason: 'INVALID_TOKEN',
            subjectName: 'Unknown Subject',
            scannedBy: req.user._id,
            scannedByName: req.user.name,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || '',
            notes: qrParsed.error || 'Invalid QR payload'
          });
        }

        return res.status(400).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'INVALID_TOKEN',
          message: qrParsed.error || 'Invalid cryptographic QR code.'
        });
      }

      passType = qrParsed.passType === 'GUARDIAN' ? 'GUARDIAN_CARD' : 'VISITOR_PASS';
      identifier = qrParsed.identifier.trim().toUpperCase();
      tokenNonce = qrParsed.nonce;
    }

    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Pass or Card identifier is required.' });
    }

    // =========================================================================
    // CASE A: VISITOR PASS VALIDATION
    // =========================================================================
    if (passType === 'VISITOR_PASS') {
      const pass = await VisitorPass.findOne({ passNumber: identifier })
        .populate('visitor')
        .populate('campusId', 'name code');

      if (!pass) {
        await recordGateEvent({
          campusId: userCampusId || req.user._id,
          gateName,
          passType: 'VISITOR_PASS',
          passIdentifier: identifier,
          eventType: 'VALIDATION_SCAN_ONLY',
          decision: 'DENIED',
          denialReason: 'INVALID_TOKEN',
          subjectName: 'Unrecognized Pass',
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || '',
          notes: 'Pass number not found in system'
        });

        return res.status(404).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'INVALID_TOKEN',
          message: `Visitor pass '${identifier}' does not exist.`
        });
      }

      // Check Campus Scope
      const passCampusStr = pass.campusId?._id ? pass.campusId._id.toString() : (pass.campusId ? pass.campusId.toString() : null);
      if (!isPlatform && (!userCampusStr || passCampusStr !== userCampusStr)) {
        if (userCampusId) {
          await recordGateEvent({
            campusId: userCampusId,
            gateName,
            passType: 'VISITOR_PASS',
            passIdentifier: identifier,
            passReferenceId: pass._id,
            eventType: 'VALIDATION_SCAN_ONLY',
            decision: 'DENIED',
            denialReason: 'OUT_OF_SCOPE_CAMPUS',
            subjectName: pass.visitor?.visitorName || 'Visitor',
            hostOrStudentRoll: pass.visitor?.hostName || '',
            scannedBy: req.user._id,
            scannedByName: req.user.name,
            notes: `Cross-campus breach attempt. Pass valid for ${pass.campusId?.code || 'foreign campus'}.`
          });
        }

        return res.status(403).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'OUT_OF_SCOPE_CAMPUS',
          message: `Multi-Campus Isolation: This pass was issued for ${pass.campusId?.name || 'another campus'} and is invalid here.`
        });
      }

      // Check Revocation
      if (pass.isRevoked || pass.status === 'REVOKED') {
        await recordGateEvent({
          campusId: pass.campusId._id,
          gateName,
          passType: 'VISITOR_PASS',
          passIdentifier: identifier,
          passReferenceId: pass._id,
          eventType: 'VALIDATION_SCAN_ONLY',
          decision: 'DENIED',
          denialReason: 'REVOKED',
          subjectName: pass.visitor?.visitorName || 'Visitor',
          hostOrStudentRoll: pass.visitor?.hostName || '',
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          notes: `Pass revoked: ${pass.revocationReason || 'Disciplinary / Security lockout'}`
        });

        return res.status(403).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'REVOKED',
          message: `Pass has been revoked by campus administration. Reason: ${pass.revocationReason || 'Security Lockout'}`
        });
      }

      // Check Time Window
      if (serverNow < pass.permittedStartTime) {
        await recordGateEvent({
          campusId: pass.campusId._id,
          gateName,
          passType: 'VISITOR_PASS',
          passIdentifier: identifier,
          passReferenceId: pass._id,
          eventType: 'VALIDATION_SCAN_ONLY',
          decision: 'DENIED',
          denialReason: 'NOT_YET_VALID',
          subjectName: pass.visitor?.visitorName || 'Visitor',
          hostOrStudentRoll: pass.visitor?.hostName || '',
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          notes: `Premature entry attempt. Permitted from ${pass.permittedStartTime.toLocaleTimeString()}`
        });

        return res.status(403).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'NOT_YET_VALID',
          message: `Pass is not yet active. Permitted start time is ${pass.permittedStartTime.toLocaleTimeString()}.`
        });
      }

      if (serverNow > pass.permittedEndTime) {
        await recordGateEvent({
          campusId: pass.campusId._id,
          gateName,
          passType: 'VISITOR_PASS',
          passIdentifier: identifier,
          passReferenceId: pass._id,
          eventType: 'VALIDATION_SCAN_ONLY',
          decision: 'DENIED',
          denialReason: 'EXPIRED',
          subjectName: pass.visitor?.visitorName || 'Visitor',
          hostOrStudentRoll: pass.visitor?.hostName || '',
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          notes: `Expired pass presented. Expired at ${pass.permittedEndTime.toLocaleTimeString()}`
        });

        return res.status(403).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'EXPIRED',
          message: `Pass has expired. Valid window ended at ${pass.permittedEndTime.toLocaleTimeString()}.`
        });
      }

      // Check Cryptographic Nonce Hash if QR text was presented
      if (tokenNonce && pass.qrTokenHash) {
        const computedHash = hashNonce(tokenNonce);
        if (computedHash !== pass.qrTokenHash) {
          return res.status(403).json({
            success: false,
            decision: 'DENIED',
            denialReason: 'INVALID_TOKEN',
            message: 'Cryptographic token validation failed. Pass hash mismatch.'
          });
        }
      }

      // Minimal Disclosure Response
      return res.status(200).json({
        success: true,
        decision: 'GRANTED',
        passType: 'VISITOR_PASS',
        data: {
          passId: pass._id,
          passNumber: pass.passNumber,
          status: pass.status,
          visitorName: pass.visitor?.visitorName || 'Authorized Visitor',
          organization: pass.visitor?.organization || '',
          purpose: pass.visitor?.purpose || 'Official Meeting',
          hostName: pass.visitor?.hostName || 'Campus Host',
          hostType: pass.visitor?.hostType || 'STAFF',
          permittedStartTime: pass.permittedStartTime,
          permittedEndTime: pass.permittedEndTime,
          currentCheckInCount: pass.activeCheckInCount,
          lastCheckInAt: pass.lastCheckInAt,
          campusName: pass.campusId?.name || 'GRIET'
        }
      });
    }

    // =========================================================================
    // CASE B: DIGITAL GUARDIAN CARD VALIDATION
    // =========================================================================
    if (passType === 'GUARDIAN_CARD') {
      const card = await GuardianVerification.findOne({ cardNumber: identifier })
        .populate('student', 'name rollNumber branch section academicYear')
        .populate('campusId', 'name code');

      if (!card) {
        await recordGateEvent({
          campusId: userCampusId || req.user._id,
          gateName,
          passType: 'GUARDIAN_CARD',
          passIdentifier: identifier,
          eventType: 'VALIDATION_SCAN_ONLY',
          decision: 'DENIED',
          denialReason: 'INVALID_TOKEN',
          subjectName: 'Unrecognized Guardian Card',
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          notes: 'Guardian card number not found in system'
        });

        return res.status(404).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'INVALID_TOKEN',
          message: `Guardian card '${identifier}' does not exist.`
        });
      }

      // Check Campus Scope
      const cardCampusStr = card.campusId?._id ? card.campusId._id.toString() : (card.campusId ? card.campusId.toString() : null);
      if (!isPlatform && (!userCampusStr || cardCampusStr !== userCampusStr)) {
        return res.status(403).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'OUT_OF_SCOPE_CAMPUS',
          message: `Multi-Campus Isolation: Card issued for ${card.campusId?.name || 'another campus'} is invalid here.`
        });
      }

      // Check Verification State
      if (card.verificationStatus !== 'VERIFIED' || card.cardStatus !== 'ACTIVE') {
        await recordGateEvent({
          campusId: card.campusId._id,
          gateName,
          passType: 'GUARDIAN_CARD',
          passIdentifier: identifier,
          passReferenceId: card._id,
          eventType: 'VALIDATION_SCAN_ONLY',
          decision: 'DENIED',
          denialReason: 'UNVERIFIED_GUARDIAN',
          subjectName: card.guardianName,
          hostOrStudentRoll: card.student?.rollNumber || '',
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          notes: `Unverified or revoked guardian card presented. Status: ${card.verificationStatus}`
        });

        return res.status(403).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'UNVERIFIED_GUARDIAN',
          message: `Access Denied: Guardian relationship is ${card.verificationStatus}. Institutional verification required.`
        });
      }

      // Check Expiry
      if (card.cardExpiresAt && serverNow > card.cardExpiresAt) {
        return res.status(403).json({
          success: false,
          decision: 'DENIED',
          denialReason: 'EXPIRED',
          message: `Guardian card expired on ${card.cardExpiresAt.toLocaleDateString()}. Annual re-verification required.`
        });
      }

      // Check Cryptographic Nonce Hash if QR text was presented
      if (tokenNonce && card.cardQrHash) {
        const computedHash = hashNonce(tokenNonce);
        if (computedHash !== card.cardQrHash) {
          return res.status(403).json({
            success: false,
            decision: 'DENIED',
            denialReason: 'INVALID_TOKEN',
            message: 'Cryptographic token validation failed. Guardian card hash mismatch.'
          });
        }
      }

      // Minimal Disclosure Response (Zero student marks/CGPA)
      return res.status(200).json({
        success: true,
        decision: 'GRANTED',
        passType: 'GUARDIAN_CARD',
        data: {
          cardId: card._id,
          cardNumber: card.cardNumber,
          guardianName: card.guardianName,
          relationship: card.relationship,
          studentName: card.student?.name || 'Enrolled Student',
          studentRollNumber: card.student?.rollNumber || '',
          studentBranch: card.student?.branch || '',
          verificationBadge: 'INSTITUTIONALLY_VERIFIED',
          cardExpiresAt: card.cardExpiresAt,
          campusName: card.campusId?.name || 'GRIET'
        }
      });
    }

    res.status(400).json({ success: false, error: 'Unsupported passType parameter.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Process official checkpoint check-in event with atomic duplicate protection
 * @route   POST /api/security-gate/check-in
 * @access  Private (Administrator, Campus Admin, Super Admin)
 */
exports.processCheckIn = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { passId, gateName = 'Main Gate', notes = '' } = req.body;
    const serverNow = new Date();
    const userCampusId = req.user.campusId;
    const isPlatform = isSuperAdmin(req.user);

    if (!passId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'passId is required for check-in.' });
    }

    const pass = await VisitorPass.findById(passId).populate('visitor').session(session);
    if (!pass) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Pass record not found.' });
    }

    // Campus Scope
    const userCampusStr = userCampusId ? userCampusId.toString() : null;
    const passCampusStr = pass.campusId ? pass.campusId.toString() : null;
    if (!isPlatform && (!userCampusStr || passCampusStr !== userCampusStr)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, error: 'Multi-Campus Isolation: Cannot check in pass from another campus.' });
    }

    // Atomic conditional check-in
    // Must be 'ISSUED' (or 'CHECKED_OUT' if re-entry allowed), not revoked, and within time window
    const allowedPreviousStates = pass.allowReentry ? ['ISSUED', 'CHECKED_OUT'] : ['ISSUED'];

    if (!allowedPreviousStates.includes(pass.status) || pass.activeCheckInCount > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: pass.activeCheckInCount > 0
          ? 'Anti-Duplicate Alert: Visitor is already checked in. Check-out required before re-entry.'
          : `Check-in rejected. Pass status is currently '${pass.status}'.`
      });
    }

    if (pass.isRevoked) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, error: 'Pass has been revoked by campus administration.' });
    }

    if (serverNow > pass.permittedEndTime) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, error: 'Pass has expired.' });
    }

    // Mutate pass state
    pass.status = 'CHECKED_IN';
    pass.activeCheckInCount = 1;
    pass.totalEntries = (pass.totalEntries || 0) + 1;
    pass.lastCheckInAt = serverNow;
    pass.lastGateLocation = gateName;
    await pass.save({ session });

    // Append-only immutable gate event
    const event = await recordGateEvent({
      campusId: pass.campusId,
      gateName,
      passType: 'VISITOR_PASS',
      passIdentifier: pass.passNumber,
      passReferenceId: pass._id,
      eventType: 'CHECK_IN',
      decision: 'GRANTED',
      denialReason: 'NONE',
      subjectName: pass.visitor?.visitorName || 'Visitor',
      hostOrStudentRoll: pass.visitor?.hostName || '',
      scannedBy: req.user._id,
      scannedByName: req.user.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      notes,
      session
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Checked in visitor ${pass.visitor?.visitorName || ''} (${pass.passNumber}) at ${gateName}.`,
      data: {
        pass,
        event
      }
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    // Fail-Secure: Report persistence failure accurately
    res.status(500).json({
      success: false,
      error: `Security Check-In Transaction Failed: ${err.message}. Fail-Secure policy enforced.`
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Process official checkpoint check-out event
 * @route   POST /api/security-gate/check-out
 * @access  Private (Administrator, Campus Admin, Super Admin)
 */
exports.processCheckOut = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { passId, gateName = 'Main Gate', notes = '' } = req.body;
    const serverNow = new Date();
    const userCampusId = req.user.campusId;
    const isPlatform = isSuperAdmin(req.user);

    const pass = await VisitorPass.findById(passId).populate('visitor').session(session);
    if (!pass) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Pass record not found.' });
    }

    // Campus Scope
    const userCampusStr = userCampusId ? userCampusId.toString() : null;
    const passCampusStr = pass.campusId ? pass.campusId.toString() : null;
    if (!isPlatform && (!userCampusStr || passCampusStr !== userCampusStr)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, error: 'Multi-Campus Isolation: Cannot check out pass from another campus.' });
    }

    if (pass.status !== 'CHECKED_IN') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: `Check-out rejected. Visitor is not currently checked in (Status: '${pass.status}').`
      });
    }

    // Mutate pass state to CHECKED_OUT
    pass.status = 'CHECKED_OUT';
    pass.activeCheckInCount = 0;
    pass.lastCheckOutAt = serverNow;
    pass.lastGateLocation = gateName;
    await pass.save({ session });

    // Append-only immutable gate event
    const event = await recordGateEvent({
      campusId: pass.campusId,
      gateName,
      passType: 'VISITOR_PASS',
      passIdentifier: pass.passNumber,
      passReferenceId: pass._id,
      eventType: 'CHECK_OUT',
      decision: 'GRANTED',
      denialReason: 'NONE',
      subjectName: pass.visitor?.visitorName || 'Visitor',
      hostOrStudentRoll: pass.visitor?.hostName || '',
      scannedBy: req.user._id,
      scannedByName: req.user.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
      notes,
      session
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Checked out visitor ${pass.visitor?.visitorName || ''} (${pass.passNumber}) at ${gateName}.`,
      data: {
        pass,
        event
      }
    });
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    res.status(500).json({
      success: false,
      error: `Security Check-Out Transaction Failed: ${err.message}. Fail-Secure policy enforced.`
    });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get real-time append-only gate access event log for campus
 * @route   GET /api/security-gate/events
 * @access  Private (Auditor, Director, Principal, Campus Admin, Administrator, Super Admin)
 */
exports.getGateAccessEvents = async (req, res) => {
  try {
    const userCampusId = req.user.campusId;
    const isPlatform = isSuperAdmin(req.user);
    const userCampusStr = userCampusId ? userCampusId.toString() : null;

    if (!isPlatform && !userCampusStr) {
      return res.status(403).json({ success: false, error: 'Access Denied: Operating user is not assigned to any campus.' });
    }

    const query = (isPlatform && !userCampusId) ? {} : { campusId: userCampusId };

    const { decision, passType, date, page = 1, limit = 50 } = req.query;

    if (decision) {
      query.decision = decision;
    }
    if (passType) {
      query.passType = passType;
    }
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: start, $lte: end };
    }

    const events = await GateAccessEvent.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10))
      .lean();

    const total = await GateAccessEvent.countDocuments(query);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      data: events
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Reconcile offline gate-outage contingency batch entries
 * @route   POST /api/security-gate/reconcile-contingency
 * @access  Private (Front Office, Support Desk Supervisor, Administrator, Campus Admin, Super Admin)
 */
exports.reconcileContingencyManifest = async (req, res) => {
  try {
    const {
      manifestCode,
      gateName = 'Main Gate (Contingency)',
      shiftDate,
      leadOfficer,
      supervisorId,
      entries = []
    } = req.body;

    if (!manifestCode || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Manifest code and a non-empty entries array are required.'
      });
    }

    const campusId = req.user.campusId;
    if (!campusId && !isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        error: 'Operating user must be assigned to an active campus.'
      });
    }

    const results = {
      manifestCode,
      totalProcessed: entries.length,
      verifiedCount: 0,
      duplicatesFlagged: 0,
      unresolvedCount: 0,
      reconciledLogs: []
    };

    const CampusCheckInLog = require('../models/CampusCheckInLog');

    for (const entry of entries) {
      const {
        identifier,
        passType = 'STUDENT_ID_CARD',
        eventType = 'CHECK_IN',
        entryTime = new Date(),
        notes = ''
      } = entry;

      const recordTime = new Date(entryTime);
      const windowStart = new Date(recordTime.getTime() - 15 * 60 * 1000);
      const windowEnd = new Date(recordTime.getTime() + 15 * 60 * 1000);

      // Check for duplicate in GateAccessEvent
      const existingGateEvent = await GateAccessEvent.findOne({
        campusId,
        passIdentifier: identifier?.trim()?.toUpperCase(),
        timestamp: { $gte: windowStart, $lte: windowEnd }
      });

      if (existingGateEvent) {
        results.duplicatesFlagged += 1;
        results.reconciledLogs.push({
          identifier,
          status: 'FLAGGED_DUPLICATE',
          message: 'Matching access event found within ±15 minutes'
        });
        continue;
      }

      // Check if student
      const student = await User.findOne({
        rollNumber: identifier?.trim()?.toUpperCase(),
        campusId,
        role: 'student'
      }).select('_id name rollNumber campusId');

      if (student) {
        // Safe check-in log independent from classroom attendance
        const arrivalDateKey = recordTime.toISOString().slice(0, 10);
        const existingArrival = await CampusCheckInLog.findOne({
          user: student._id,
          arrivalDateKey
        });

        if (!existingArrival) {
          const checkInRef = `CB-GATE-CONT-${arrivalDateKey.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
          await CampusCheckInLog.create({
            user: student._id,
            campus: campusId,
            timestamp: recordTime,
            arrivalDateKey,
            status: 'VERIFIED',
            verificationMethod: 'MANUAL_CONTINGENCY_RECONCILED',
            referenceCode: checkInRef,
            notes: `Manifest: ${manifestCode} | Gate: ${gateName} | Officer: ${leadOfficer || 'N/A'}`
          });
        }

        await recordGateEvent({
          campusId,
          gateName,
          passType: 'STUDENT_ID_CARD',
          passIdentifier: student.rollNumber,
          eventType,
          decision: 'RECONCILED',
          subjectName: student.name,
          hostOrStudentRoll: student.rollNumber,
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          notes: `Offline Manifest ${manifestCode}. ${notes}`.trim()
        });

        results.verifiedCount += 1;
        results.reconciledLogs.push({
          identifier: student.rollNumber,
          studentName: student.name,
          status: 'RECONCILED_VERIFIED'
        });
      } else {
        // Unknown or visitor
        await recordGateEvent({
          campusId,
          gateName,
          passType,
          passIdentifier: identifier?.trim()?.toUpperCase() || 'UNKNOWN',
          eventType,
          decision: 'RECONCILED',
          subjectName: identifier || 'Visitor/Student',
          scannedBy: req.user._id,
          scannedByName: req.user.name,
          notes: `Offline Manifest ${manifestCode} (Unmatched patron record). ${notes}`.trim()
        });

        results.unresolvedCount += 1;
        results.reconciledLogs.push({
          identifier,
          status: 'UNRESOLVED_RECORDED',
          message: 'Patron recorded in gate audit log but student record was not found'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Contingency manifest ${manifestCode} reconciled successfully. Verified: ${results.verifiedCount}, Duplicates: ${results.duplicatesFlagged}, Unresolved: ${results.unresolvedCount}.`,
      data: results
    });
  } catch (err) {
    console.error('Error reconciling contingency manifest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
