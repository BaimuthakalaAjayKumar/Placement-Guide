const mongoose = require('mongoose');
const crypto = require('crypto');
const VisitorRegistration = require('../models/VisitorRegistration');
const VisitorPass = require('../models/VisitorPass');
const GateAccessEvent = require('../models/GateAccessEvent');
const Campus = require('../models/Campus');
const User = require('../models/User');
const { generateTokenNonce, createQrPayload } = require('../utils/passTokenService');
const { isSuperAdmin } = require('../utils/scopeFilter');
const { logAuditEvent } = require('../utils/auditLogger');

// Helper to get today's calendar key in IST (YYYY-MM-DD)
const getTodayDateKey = () => {
  const now = new Date();
  // Adjust to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split('T')[0];
};

/**
 * @desc    Get real-time campus visitor metrics & KPIs
 * @route   GET /api/visitors/overview
 * @access  Private (Campus Admin, Administrator, Super Admin, Director, Principal, Auditor)
 */
exports.getVisitorOverview = async (req, res) => {
  try {
    const userCampusId = req.user.campusId;
    const isPlatform = isSuperAdmin(req.user);

    if (!isPlatform && !userCampusId) {
      return res.status(403).json({ success: false, error: 'Access Denied: Operating user is not assigned to any campus.' });
    }

    const campusFilter = (isPlatform && !userCampusId) ? {} : { campusId: userCampusId };
    const todayKey = getTodayDateKey();
    const serverNow = new Date();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Active Visitors Currently on Campus (Checked in, not checked out, not revoked)
    const activeVisitorsCount = await VisitorPass.countDocuments({
      ...campusFilter,
      validDateKey: todayKey,
      status: 'CHECKED_IN',
      isRevoked: false
    });

    // 2. Expected Visitors Remaining Today (Issued passes that haven't checked in yet)
    const expectedVisitorsCount = await VisitorPass.countDocuments({
      ...campusFilter,
      validDateKey: todayKey,
      status: 'ISSUED',
      isRevoked: false,
      permittedEndTime: { $gt: serverNow }
    });

    // 3. Completed Visits Today (Checked out after having checked in)
    const completedVisitsCount = await VisitorPass.countDocuments({
      ...campusFilter,
      validDateKey: todayKey,
      status: { $in: ['CHECKED_OUT', 'EXPIRED'] },
      totalEntries: { $gt: 0 }
    });

    // 4. Security Denials & Anomaly Scans Today
    const deniedScansCount = await GateAccessEvent.countDocuments({
      ...campusFilter,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
      decision: 'DENIED'
    });

    res.status(200).json({
      success: true,
      data: {
        activeVisitorsCount,
        expectedVisitorsCount,
        completedVisitsCount,
        deniedScansCount,
        todayDateKey: todayKey,
        serverTime: serverNow
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    List & filter visitor passes for the authorized campus
 * @route   GET /api/visitors/passes
 * @access  Private (Campus Admin, Administrator, Super Admin, Director, Principal, Auditor)
 */
exports.getVisitorPasses = async (req, res) => {
  try {
    const userCampusId = req.user.campusId;
    const isPlatform = isSuperAdmin(req.user);

    if (!isPlatform && !userCampusId) {
      return res.status(403).json({ success: false, error: 'Access Denied: Operating user is not assigned to any campus.' });
    }

    const query = (isPlatform && !userCampusId) ? {} : { campusId: userCampusId };

    const { status, date, search, page = 1, limit = 50 } = req.query;

    if (status) {
      query.status = status;
    }
    if (date) {
      query.validDateKey = date;
    } else {
      // Default to today if no date specified
      query.validDateKey = getTodayDateKey();
    }

    const passes = await VisitorPass.find(query)
      .populate('visitor')
      .populate('issuedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10))
      .lean();

    const total = await VisitorPass.countDocuments(query);

    // Apply client text search if requested
    let filtered = passes;
    if (search) {
      const s = search.toLowerCase();
      filtered = passes.filter(p => 
        (p.passNumber && p.passNumber.toLowerCase().includes(s)) ||
        (p.visitor?.visitorName && p.visitor.visitorName.toLowerCase().includes(s)) ||
        (p.visitor?.hostName && p.visitor.hostName.toLowerCase().includes(s))
      );
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      total,
      data: filtered
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Register a visitor and issue a time-bounded pass with opaque QR token
 * @route   POST /api/visitors/register
 * @access  Private (Campus Admin, Administrator, Super Admin)
 */
exports.registerVisitorAndIssuePass = async (req, res) => {
  try {
    const {
      visitorName,
      visitorPhone,
      visitorEmail,
      organization,
      idDocumentType = 'GOVERNMENT_ID',
      maskedIdNumber,
      purpose,
      purposeDetails,
      hostType,
      hostUser,
      hostDepartment,
      hostName,
      permittedStartTime,
      permittedEndTime,
      allowReentry = false,
      campusId: requestedCampusId
    } = req.body;

    // Scope enforcement: Use authenticated user's campus unless platform super admin
    const isPlatform = isSuperAdmin(req.user);
    const targetCampusId = isPlatform && requestedCampusId ? requestedCampusId : req.user.campusId;

    if (!targetCampusId) {
      return res.status(400).json({ success: false, error: 'A valid campusId is required to issue a visitor pass.' });
    }

    if (!visitorName || !visitorPhone || !maskedIdNumber || !purpose || !hostType || !hostName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required visitor fields (name, phone, masked ID, purpose, host details).'
      });
    }

    const start = new Date(permittedStartTime || Date.now());
    const end = new Date(permittedEndTime || Date.now() + 4 * 60 * 60 * 1000); // Default 4 hours

    if (start >= end) {
      return res.status(400).json({ success: false, error: 'Permitted start time must be earlier than end time.' });
    }

    const campusDoc = await Campus.findById(targetCampusId);
    if (!campusDoc) {
      return res.status(404).json({ success: false, error: 'Associated campus not found.' });
    }

    // 1. Transactionally consistent registration & pass creation where supported
    let session = null;
    let useTransaction = false;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (_) {
      useTransaction = false;
      session = null;
    }

    try {
      const regDoc = {
        campusId: targetCampusId,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        visitorEmail: visitorEmail ? visitorEmail.trim().toLowerCase() : '',
        organization: organization ? organization.trim() : '',
        idDocumentType,
        maskedIdNumber: maskedIdNumber.trim(),
        purpose,
        purposeDetails: purposeDetails ? purposeDetails.trim() : '',
        hostType,
        hostUser: hostUser || null,
        hostDepartment: hostDepartment || null,
        hostName: hostName.trim(),
        status: 'APPROVED',
        registeredBy: req.user._id
      };
      const [registration] = await VisitorRegistration.create([regDoc], useTransaction ? { session } : {});

      // 2. Generate Cryptographic Nonce & Opaque Token
      const { nonce, hash } = generateTokenNonce();

      // 3. Generate Non-Guessable Unique Pass Number: VP-YYYYMMDD-XXXXX
      const dateSegment = getTodayDateKey().replace(/-/g, '');
      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const passNumber = `VP-${dateSegment}-${randomHex}`;

      // 4. Create Visitor Pass
      const passDoc = {
        passNumber,
        visitor: registration._id,
        campusId: targetCampusId,
        validDateKey: getTodayDateKey(),
        permittedStartTime: start,
        permittedEndTime: end,
        qrTokenNonce: nonce,
        qrTokenHash: hash,
        status: 'ISSUED',
        allowReentry: Boolean(allowReentry),
        issuedBy: req.user._id
      };
      const [pass] = await VisitorPass.create([passDoc], useTransaction ? { session } : {});

      if (useTransaction) {
        await session.commitTransaction();
      }

      // 5. Generate Opaque Zero-PII QR Payload
      const qrPayload = createQrPayload({
        campusCode: campusDoc.code || 'GRIET',
        passType: 'VISITOR',
        identifier: passNumber,
        nonce
      });

      // Audit Logging
      await logAuditEvent({
        user: req.user._id,
        userName: req.user.name,
        userEmail: req.user.email,
        userRole: req.user.role,
        campusId: targetCampusId,
        action: 'VISITOR_PASS_ISSUED',
        category: 'Security',
        description: `Issued visitor pass ${passNumber} to ${visitorName.trim()} for host ${hostName.trim()}`,
        details: { passNumber, visitorId: registration._id, purpose }
      });

      res.status(201).json({
        success: true,
        data: {
          registration,
          pass,
          qrPayload
        }
      });
    } catch (createErr) {
      if (useTransaction && session) {
        await session.abortTransaction();
      }
      throw createErr;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Revoke an active or issued visitor pass
 * @route   PUT /api/visitors/passes/:id/revoke
 * @access  Private (Campus Admin, Administrator, Super Admin)
 */
exports.revokeVisitorPass = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'A mandatory revocation reason must be provided.' });
    }

    const pass = await VisitorPass.findById(req.params.id);
    if (!pass) {
      return res.status(404).json({ success: false, error: 'Visitor pass not found.' });
    }

    // Campus scope check
    const userCampusStr = req.user.campusId ? req.user.campusId.toString() : null;
    const passCampusStr = pass.campusId ? pass.campusId.toString() : null;
    if (!isSuperAdmin(req.user) && (!userCampusStr || passCampusStr !== userCampusStr)) {
      return res.status(403).json({ success: false, error: 'Multi-Campus Isolation: Cannot revoke pass belonging to another campus.' });
    }

    pass.status = 'REVOKED';
    pass.isRevoked = true;
    pass.revokedAt = new Date();
    pass.revokedBy = req.user._id;
    pass.revocationReason = reason.trim();

    await pass.save();

    await logAuditEvent({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      campusId: pass.campusId,
      action: 'VISITOR_PASS_REVOKED',
      category: 'Security',
      description: `Revoked visitor pass ${pass.passNumber}. Reason: ${reason.trim()}`,
      details: { passNumber: pass.passNumber, reason: reason.trim() }
    });

    res.status(200).json({
      success: true,
      message: `Pass ${pass.passNumber} has been successfully revoked.`,
      data: pass
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Typeahead search for campus hosts (staff or students) without leaking private grades/marks
 * @route   GET /api/visitors/search-hosts
 * @access  Private (Staff, Admin, Faculty)
 */
exports.searchHosts = async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const userCampusId = req.user.campusId;
    if (!isSuperAdmin(req.user) && !userCampusId) {
      return res.status(403).json({ success: false, error: 'Access Denied: Operating user is not assigned to any campus.' });
    }
    const campusFilter = isSuperAdmin(req.user) && !userCampusId ? {} : { campusId: userCampusId };

    const searchRegex = new RegExp(q.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');

    const roleFilter = type === 'STUDENT'
      ? { role: 'student' }
      : type === 'STAFF'
      ? { role: { $in: ['faculty', 'hod', 'placement_officer', 'administrator', 'campus_admin'] } }
      : {};

    // Select STRICT minimal public fields (ZERO marks, CGPA, home address, or phone)
    const hosts = await User.find({
      ...campusFilter,
      ...roleFilter,
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { rollNumber: searchRegex }
      ]
    })
      .select('name email role rollNumber branch section designation')
      .limit(15)
      .lean();

    res.status(200).json({
      success: true,
      data: hosts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
