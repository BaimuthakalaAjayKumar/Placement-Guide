const crypto = require('crypto');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Room = require('../models/Room');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { logActivity, extractClientIp, extractUserAgent } = require('../utils/auditLogger');
const { ROLES, normalizeRole } = require('../config/permissions');
const {
  DEFAULT_ATTENDANCE_THRESHOLD,
  getShortageThreshold,
  calculatePercentage,
  isShortage,
  dispatchAttendanceShortageAlert,
  evaluateSessionShortages,
  evaluateStudentForSubject
} = require('../services/attendanceAlertService');

/**
 * Computes great-circle distance between two geographic coordinates in meters
 * using the Haversine formula.
 *
 * @param {number} lat1 Latitude point 1
 * @param {number} lon1 Longitude point 1
 * @param {number} lat2 Latitude point 2
 * @param {number} lon2 Longitude point 2
 * @returns {number} Distance in meters
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's mean radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Generates a rolling signed dynamic QR token and nonce
 *
 * @param {string} sessionId
 * @param {string} sessionNonce
 * @param {number} refreshIntervalSeconds
 * @returns {{ token: string, expiresAt: Date, refreshInterval: number }}
 */
function generateDynamicQrToken(sessionId, sessionNonce, refreshIntervalSeconds = 15) {
  const rotationNonce = crypto.randomBytes(8).toString('hex');
  const now = Date.now();
  // 5 second grace buffer for network transmission latency
  const expiresAt = new Date(now + (refreshIntervalSeconds + 5) * 1000);
  const tokenSig = crypto
    .createHmac('sha256', sessionNonce)
    .update(`${sessionId}:${rotationNonce}:${Math.floor(now / 1000)}`)
    .digest('hex')
    .substring(0, 32);

  const token = `${rotationNonce}.${Math.floor(now / 1000)}.${tokenSig}`;
  return { token, expiresAt, refreshInterval: refreshIntervalSeconds };
}

// ============================================================
// 1. CREATE ATTENDANCE SESSION
// ============================================================
// @route   POST /api/attendance/sessions
// @access  Faculty, Admin, Campus Admin, HOD
exports.createSession = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);
    const {
      roomId,
      subjectId,
      branch,
      section,
      academicYear,
      semester = 1,
      period = '1',
      qrRefreshInterval = 15,
      geofenceEnforced = true,
      batchId = null,
      timetableId = null
    } = req.body;

    // 1. Basic required fields validation
    if (!roomId || !subjectId || !branch || !section || !academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Missing required session fields: roomId, subjectId, branch, section, and academicYear are mandatory.'
      });
    }

    // 2. Resolve target campus
    const targetCampusId = user.campusId || req.body.campusId;
    if (!targetCampusId) {
      return res.status(400).json({
        success: false,
        error: 'Campus association is required to initiate an attendance session.'
      });
    }

    // 3. Room verification (MANDATORY ROOM-LEVEL SCOPE & GEOFENCE)
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Designated classroom/lab room does not exist.'
      });
    }

    if (!room.active) {
      return res.status(400).json({
        success: false,
        error: `Room ${room.buildingName} ${room.roomNumber} is currently marked inactive.`
      });
    }

    // Cross-campus room usage strictly forbidden
    if (room.campusId.toString() !== targetCampusId.toString()) {
      await logActivity({
        user,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: `Cross-campus room assignment blocked: Faculty attempted using room from campus ${room.campusId}`,
        details: { roomId: room._id, roomCampus: room.campusId, userCampus: targetCampusId },
        req
      });
      return res.status(403).json({
        success: false,
        error: 'Cross-Campus Violation: You cannot use a classroom belonging to another campus.'
      });
    }

    // 4. Verify Subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject does not exist.'
      });
    }

    // 5. Faculty ManagedScopes & Teaching Authorization Verification
    // Super Admins and Campus Admins bypass individual teaching assignment check
    const isAdministrativeStaff = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN, ROLES.ADMINISTRATOR].includes(userRole);

    if (userRole === ROLES.FACULTY) {
      const managedScopes = Array.isArray(user.managedScopes) ? user.managedScopes : [];
      const hasTeachingAssignment = managedScopes.some((scope) => {
        const matchesYear = !scope.academicYear || scope.academicYear.trim().toLowerCase() === academicYear.trim().toLowerCase();
        const matchesBranch = !scope.branch || scope.branch.trim().toLowerCase() === branch.trim().toLowerCase();
        const matchesSection = !scope.section || scope.section.trim().toLowerCase() === section.trim().toLowerCase();
        const matchesSubject = !scope.subject || scope.subject.toString() === subjectId.toString();

        return matchesYear && matchesBranch && matchesSection && matchesSubject;
      });

      if (!hasTeachingAssignment) {
        await logActivity({
          user,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: `Unauthorized class start attempt: Faculty not assigned to ${branch} Section ${section} (${academicYear})`,
          details: { branch, section, academicYear, subjectId },
          req
        });
        return res.status(403).json({
          success: false,
          error: `Unauthorized: You are not assigned to teach ${branch} Section ${section} for this subject.`
        });
      }
    }

    // HOD Department Scope Verification
    if (userRole === ROLES.HOD) {
      const hodDept = (user.department || user.branch || '').toLowerCase();
      if (hodDept && branch.trim().toLowerCase() !== hodDept) {
        return res.status(403).json({
          success: false,
          error: `Department Isolation: HOD access is restricted to department '${user.department || user.branch}'.`
        });
      }
    }

    // 6. Conflict Prevention: Check for existing ACTIVE session conflicts
    // A. Faculty already has an active session
    const facultyConflict = await AttendanceSession.findOne({
      facultyId: user._id,
      status: 'ACTIVE'
    });
    if (facultyConflict) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active attendance session in progress. Please close it before starting a new one.',
        activeSessionId: facultyConflict._id
      });
    }

    // B. Room already occupied by an active session
    const roomConflict = await AttendanceSession.findOne({
      roomId: room._id,
      status: 'ACTIVE'
    });
    if (roomConflict) {
      return res.status(400).json({
        success: false,
        error: `Room ${room.buildingName} ${room.roomNumber} is currently occupied by another active session.`
      });
    }

    // C. Section already has an active session
    const sectionConflict = await AttendanceSession.findOne({
      campusId: targetCampusId,
      branch: new RegExp(`^${branch}$`, 'i'),
      section: new RegExp(`^${section}$`, 'i'),
      academicYear: academicYear.trim(),
      status: 'ACTIVE'
    });
    if (sectionConflict) {
      return res.status(400).json({
        success: false,
        error: `Section ${section} of ${branch} already has an active attendance session running.`
      });
    }

    // 7. Calculate enrolled student count for section
    const enrolledStudentsCount = await User.countDocuments({
      role: 'student',
      campusId: targetCampusId,
      branch: new RegExp(`^${branch}$`, 'i'),
      section: new RegExp(`^${section}$`, 'i')
    });

    // 8. Generate cryptographically secure session nonce & initial QR token
    const sessionNonce = crypto.randomBytes(32).toString('hex');
    const sessionIdTemp = new AttendanceSession()._id;
    const initialQr = generateDynamicQrToken(sessionIdTemp.toString(), sessionNonce, qrRefreshInterval);

    // 9. Create AttendanceSession document
    const departmentId = user.departmentId || room.departmentId || null;

    const session = await AttendanceSession.create({
      _id: sessionIdTemp,
      campusId: targetCampusId,
      departmentId: departmentId || targetCampusId, // fallback to campus reference if dept unset
      branch,
      batchId,
      section,
      subjectId,
      facultyId: user._id,
      roomId: room._id,
      timetableId,
      academicYear,
      semester,
      period,
      sessionDate: new Date(),
      actualStartTime: new Date(),
      status: 'ACTIVE',
      qrSessionIdentifier: initialQr.token,
      qrExpiresAt: initialQr.expiresAt,
      qrRefreshInterval,
      tokenNonce: sessionNonce,
      geofenceEnforced,
      totalEnrolled: enrolledStudentsCount,
      totalPresent: 0,
      totalAbsent: enrolledStudentsCount,
      totalLate: 0
    });

    // 10. Audit Logging
    await logActivity({
      user,
      action: 'ATTENDANCE_SESSION_STARTED',
      category: 'Smart Attendance',
      description: `Started live attendance session for ${subject.name} (${branch} - Sec ${section}) in ${room.buildingName} ${room.roomNumber}`,
      details: {
        sessionId: session._id,
        subjectId: subject._id,
        subjectName: subject.name,
        branch,
        section,
        roomId: room._id,
        roomName: `${room.buildingName} ${room.roomNumber}`,
        geofenceRadiusMeters: room.geofenceRadiusMeters,
        totalEnrolled: enrolledStudentsCount
      },
      req
    });

    await logActivity({
      user,
      action: 'ATTENDANCE_QR_GENERATED',
      category: 'Smart Attendance',
      description: `Initial dynamic rolling QR token generated for session ${session._id} (expires in ${qrRefreshInterval}s)`,
      details: { sessionId: session._id, expiresAt: initialQr.expiresAt },
      req
    });

    // Return session details and active dynamic QR payload to faculty client
    return res.status(201).json({
      success: true,
      message: 'Attendance session initiated successfully',
      session: {
        _id: session._id,
        campusId: session.campusId,
        branch: session.branch,
        section: session.section,
        subject: {
          _id: subject._id,
          name: subject.name,
          code: subject.code
        },
        room: {
          _id: room._id,
          buildingName: room.buildingName,
          roomNumber: room.roomNumber,
          floor: room.floor,
          capacity: room.capacity,
          geofenceRadiusMeters: room.geofenceRadiusMeters
        },
        status: session.status,
        sessionDate: session.sessionDate,
        actualStartTime: session.actualStartTime,
        totalEnrolled: session.totalEnrolled,
        totalPresent: session.totalPresent,
        totalAbsent: session.totalAbsent,
        qr: {
          token: initialQr.token,
          expiresAt: initialQr.expiresAt,
          refreshInterval: initialQr.refreshInterval
        }
      }
    });
  } catch (err) {
    console.error('Error creating attendance session:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create attendance session: ' + err.message
    });
  }
};

// ============================================================
// 2. GET FACULTY ACTIVE SESSIONS
// ============================================================
// @route   GET /api/attendance/sessions/active
// @access  Faculty, Admin, Campus Admin
exports.getActiveSessions = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    const query = { status: 'ACTIVE' };

    if (userRole === ROLES.FACULTY) {
      query.facultyId = user._id;
    } else if (user.campusId && userRole !== ROLES.SUPER_ADMIN) {
      query.campusId = user.campusId;
    }

    const sessions = await AttendanceSession.find(query)
      .populate('subjectId', 'name code')
      .populate('roomId', 'buildingName roomNumber floor capacity geofenceRadiusMeters')
      .populate('facultyId', 'name email designation')
      .sort({ sessionDate: -1 });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (err) {
    console.error('Error fetching active sessions:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve active sessions.'
    });
  }
};

// ============================================================
// 3. GET SESSION DETAILS & LIVE ROSTER
// ============================================================
// @route   GET /api/attendance/sessions/:id
// @access  Authenticated (Faculty, Admin, HOD, Student self)
exports.getSessionById = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);
    const { id } = req.params;

    const session = await AttendanceSession.findById(id)
      .populate('subjectId', 'name code')
      .populate('roomId', 'buildingName roomNumber floor capacity geofenceRadiusMeters active')
      .populate('facultyId', 'name email');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Attendance session not found.'
      });
    }

    // Campus isolation verification
    if (user.campusId && session.campusId && userRole !== ROLES.SUPER_ADMIN) {
      if (user.campusId.toString() !== session.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: You cannot access session data belonging to another campus.'
        });
      }
    }

    // If student, return only session public metadata + student's own attendance record
    if (userRole === ROLES.STUDENT) {
      const studentRecord = await AttendanceRecord.findOne({
        sessionId: session._id,
        studentId: user._id
      }).select('status scannedAt markedAt verificationMethod');

      return res.status(200).json({
        success: true,
        session: {
          _id: session._id,
          branch: session.branch,
          section: session.section,
          subject: session.subjectId,
          sessionDate: session.sessionDate,
          status: session.status,
          myRecord: studentRecord || { status: 'ABSENT' }
        }
      });
    }

    // If Faculty / Admin / HOD, fetch roster records
    const records = await AttendanceRecord.find({ sessionId: session._id })
      .select('studentId rollNumber studentName status verificationMethod scannedAt markedAt isFlaggedForReview flagReason calculatedDistanceMeters locationVerificationStatus')
      .sort({ rollNumber: 1 });

    return res.status(200).json({
      success: true,
      session,
      records
    });
  } catch (err) {
    console.error('Error fetching session by id:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve session details.'
    });
  }
};

// ============================================================
// 4. ROTATE DYNAMIC QR TOKEN
// ============================================================
// @route   POST /api/attendance/sessions/:id/rotate-token
// @access  Faculty, Admin
exports.rotateToken = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Load session with tokenNonce (which has select: false by default)
    const session = await AttendanceSession.findById(id).select('+tokenNonce');
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Attendance session not found.'
      });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Cannot rotate token for session in ${session.status} state.`
      });
    }

    // Verify ownership or administrative privilege
    const userRole = normalizeRole(user.role);
    const isOwner = session.facultyId.toString() === user._id.toString();
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the session host or campus administrator can rotate session tokens.'
      });
    }

    const nonce = session.tokenNonce || crypto.randomBytes(32).toString('hex');
    const newQr = generateDynamicQrToken(session._id.toString(), nonce, session.qrRefreshInterval || 15);

    session.qrSessionIdentifier = newQr.token;
    session.qrExpiresAt = newQr.expiresAt;
    session.tokenNonce = nonce;
    await session.save();

    // Broadcast new QR token to session room via Socket.io
    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.to(`attendance_session_${session._id}`).emit('qr_token_refresh', {
        sessionId: session._id,
        token: newQr.token,
        expiresAt: newQr.expiresAt,
        refreshInterval: newQr.refreshInterval
      });
    }

    await logActivity({
      user,
      action: 'ATTENDANCE_QR_ROTATED',
      category: 'Smart Attendance',
      description: `Dynamic QR token rotated for session ${session._id}`,
      details: { sessionId: session._id, expiresAt: newQr.expiresAt },
      req
    });

    return res.status(200).json({
      success: true,
      qr: {
        token: newQr.token,
        expiresAt: newQr.expiresAt,
        refreshInterval: newQr.refreshInterval
      }
    });
  } catch (err) {
    console.error('Error rotating attendance token:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to rotate QR token: ' + err.message
    });
  }
};

// ============================================================
// 5. STUDENT CHECK-IN (QR SCAN + MANDATORY ROOM GEOFENCE)
// ============================================================
// @route   POST /api/attendance/sessions/:id/checkin
// @access  Student
exports.studentCheckIn = async (req, res) => {
  try {
    const student = req.user;
    const { id } = req.params;
    const { token, latitude, longitude, accuracy } = req.body;

    // 1. Session verification
    const session = await AttendanceSession.findById(id).select('+tokenNonce');
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Attendance session not found.'
      });
    }

    // 2. Session state verification
    if (session.status !== 'ACTIVE') {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: `Check-in rejected: Session is ${session.status}`,
        details: { sessionId: session._id, reason: 'INACTIVE_SESSION' },
        req
      });
      return res.status(400).json({
        success: false,
        error: `Session is not active (status: ${session.status}). Attendance check-in is closed.`
      });
    }

    // 3. Multi-Campus isolation verification
    if (student.campusId && session.campusId && student.campusId.toString() !== session.campusId.toString()) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: 'Cross-campus check-in attempt blocked',
        details: { sessionId: session._id, studentCampus: student.campusId, sessionCampus: session.campusId, reason: 'CROSS_CAMPUS' },
        req
      });
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: You cannot check into a class session belonging to another campus.'
      });
    }

    // 4. Enrollment & Scope Verification
    // A. Branch match
    if (student.branch && session.branch && student.branch.trim().toLowerCase() !== session.branch.trim().toLowerCase()) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: `Branch mismatch: Student branch '${student.branch}' vs session branch '${session.branch}'`,
        details: { sessionId: session._id, studentBranch: student.branch, sessionBranch: session.branch, reason: 'NOT_ENROLLED_BRANCH' },
        req
      });
      return res.status(403).json({
        success: false,
        error: `Enrollment Mismatch: This session is for ${session.branch} students only.`
      });
    }

    // B. Section match
    if (student.section && session.section && student.section.trim().toUpperCase() !== session.section.trim().toUpperCase()) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: `Section mismatch: Student section '${student.section}' vs session section '${session.section}'`,
        details: { sessionId: session._id, studentSection: student.section, sessionSection: session.section, reason: 'WRONG_SECTION' },
        req
      });
      return res.status(403).json({
        success: false,
        error: `Enrollment Mismatch: This session is for Section ${session.section} only.`
      });
    }

    // C. Academic Year match
    if (student.academicYear && session.academicYear && student.academicYear.trim() !== session.academicYear.trim()) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: `Academic year mismatch: Student '${student.academicYear}' vs session '${session.academicYear}'`,
        details: { sessionId: session._id, reason: 'WRONG_ACADEMIC_YEAR' },
        req
      });
      return res.status(403).json({
        success: false,
        error: `Enrollment Mismatch: This session is for Academic Year ${session.academicYear}.`
      });
    }

    // D. Batch match (if session batch configured)
    if (session.batchId && student.batchId && session.batchId.toString() !== student.batchId.toString()) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: 'Batch mismatch check-in rejection',
        details: { sessionId: session._id, reason: 'WRONG_BATCH' },
        req
      });
      return res.status(403).json({
        success: false,
        error: 'Enrollment Mismatch: You do not belong to the batch assigned to this session.'
      });
    }

    // 5. Dynamic QR Token Verification
    if (!token) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: 'Missing QR authorization token',
        details: { sessionId: session._id, reason: 'MISSING_QR_TOKEN' },
        req
      });
      return res.status(400).json({
        success: false,
        error: 'Attendance QR token is required.'
      });
    }

    // Verify token matches active session token
    if (token !== session.qrSessionIdentifier) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: 'Invalid QR token scanned',
        details: { sessionId: session._id, reason: 'INVALID_QR' },
        req
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid or outdated attendance QR token. Please scan the current code displayed on screen.'
      });
    }

    // Verify token expiry
    if (session.qrExpiresAt && new Date() > new Date(session.qrExpiresAt)) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: 'Expired QR token scanned',
        details: { sessionId: session._id, expiresAt: session.qrExpiresAt, reason: 'EXPIRED_QR' },
        req
      });
      return res.status(400).json({
        success: false,
        error: 'Attendance QR has expired. Please scan the newly refreshed QR.'
      });
    }

    // 6. Duplicate Prevention Check (Enforced by Phase 1 Unique Index)
    const existingRecord = await AttendanceRecord.findOne({
      sessionId: session._id,
      studentId: student._id
    });

    if (existingRecord) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: `Duplicate check-in attempt by ${student.rollNumber || student.name}`,
        details: { sessionId: session._id, existingStatus: existingRecord.status, reason: 'DUPLICATE_ATTENDANCE' },
        req
      });
      return res.status(400).json({
        success: false,
        error: 'Attendance has already been marked for this class.'
      });
    }

    // 7. MANDATORY ROOM-LEVEL GEOFENCING VERIFICATION
    let locationStatus = 'LOCATION_UNAVAILABLE';
    let distanceMeters = null;

    if (session.geofenceEnforced && session.roomId) {
      const room = await Room.findById(session.roomId);
      if (!room) {
        return res.status(500).json({
          success: false,
          error: 'Assigned classroom configuration missing. Contact instructor.'
        });
      }

      // Check client-provided coordinates
      const parsedLat = parseFloat(latitude);
      const parsedLng = parseFloat(longitude);
      const parsedAccuracy = parseFloat(accuracy);

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        await logActivity({
          user: student,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: 'Location coordinates missing on geofenced check-in',
          details: { sessionId: session._id, reason: 'LOCATION_UNAVAILABLE' },
          req
        });
        return res.status(400).json({
          success: false,
          error: 'Location verification required: Please enable device GPS permissions and retry.'
        });
      }

      // Check GPS Accuracy threshold
      // Reject if reading accuracy is excessively poor (e.g. >50m or >1.5x geofence radius)
      const allowedAccuracyThreshold = Math.max(50, (room.geofenceRadiusMeters || 30) * 1.5);
      if (!isNaN(parsedAccuracy) && parsedAccuracy > allowedAccuracyThreshold) {
        await logActivity({
          user: student,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: `Location rejected due to poor accuracy (±${Math.round(parsedAccuracy)}m vs allowed ±${allowedAccuracyThreshold}m)`,
          details: { sessionId: session._id, accuracy: parsedAccuracy, reason: 'LOW_ACCURACY' },
          req
        });
        return res.status(400).json({
          success: false,
          error: `Location accuracy is too low (±${Math.round(parsedAccuracy)}m). Please turn on high-accuracy GPS and retry.`
        });
      }

      // Authoritative Backend Distance Calculation (DO NOT trust client-supplied distance)
      distanceMeters = calculateDistanceMeters(parsedLat, parsedLng, room.latitude, room.longitude);
      const radiusLimit = room.geofenceRadiusMeters || 30;

      if (distanceMeters > radiusLimit) {
        await logActivity({
          user: student,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: `Student outside room geofence (${distanceMeters}m > ${radiusLimit}m boundary)`,
          details: {
            sessionId: session._id,
            distanceMeters,
            radiusLimit,
            reason: 'OUTSIDE_GEOFENCE'
          },
          req
        });
        // Never expose exact room coordinates to the student in error responses
        return res.status(400).json({
          success: false,
          error: 'Attendance rejected: You are outside the designated classroom geofence boundary.'
        });
      }

      locationStatus = 'VERIFIED';
    } else {
      locationStatus = 'VERIFIED';
    }

    // 8. Create AttendanceRecord document
    const record = await AttendanceRecord.create({
      sessionId: session._id,
      campusId: session.campusId,
      departmentId: session.departmentId,
      studentId: student._id,
      rollNumber: student.rollNumber || 'N/A',
      studentName: student.name,
      status: 'PRESENT',
      verificationMethod: 'QR_SCAN',
      scannedAt: new Date(),
      markedAt: new Date(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      calculatedDistanceMeters: distanceMeters,
      locationVerificationStatus: locationStatus,
      ipAddress: extractClientIp(req),
      userAgent: extractUserAgent(req)
    });

    // 9. Update Session Aggregates
    const updatedSession = await AttendanceSession.findByIdAndUpdate(
      session._id,
      {
        $inc: { totalPresent: 1 },
        $set: {
          totalAbsent: Math.max(0, (session.totalEnrolled || 0) - ((session.totalPresent || 0) + 1))
        }
      },
      { new: true }
    );

    // 10. Real-time Faculty Live Roster Notification via Socket.IO
    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      const attendancePercentage = updatedSession.totalEnrolled > 0
        ? Math.round((updatedSession.totalPresent / updatedSession.totalEnrolled) * 100)
        : 100;

      // Note: Never broadcast student GPS coordinates over Socket.IO
      io.to(`attendance_session_${session._id}`).emit('attendance_checked_in', {
        sessionId: session._id,
        recordId: record._id,
        studentId: student._id,
        rollNumber: record.rollNumber,
        studentName: record.studentName,
        status: record.status,
        scannedAt: record.scannedAt,
        totalPresent: updatedSession.totalPresent,
        totalEnrolled: updatedSession.totalEnrolled,
        totalAbsent: updatedSession.totalAbsent,
        attendancePercentage
      });
    }

    // 11. Audit Logging
    await logActivity({
      user: student,
      action: 'ATTENDANCE_MARKED',
      category: 'Smart Attendance',
      description: `Attendance verified & marked PRESENT for session ${session._id}`,
      details: {
        sessionId: session._id,
        recordId: record._id,
        rollNumber: record.rollNumber,
        method: 'QR_SCAN',
        distanceMeters,
        locationStatus
      },
      req
    });

    // Phase 5: Post Check-In Attendance Evaluation (Non-blocking)
    evaluateStudentForSubject({
      studentId: student._id,
      subjectId: session.subjectId,
      io,
      req,
      triggeredBy: student
    }).catch(alertErr => {
      console.warn('[AttendanceAlertService] Non-fatal check-in alert evaluation warning:', alertErr.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance successfully marked!',
      record: {
        _id: record._id,
        status: record.status,
        rollNumber: record.rollNumber,
        studentName: record.studentName,
        scannedAt: record.scannedAt,
        verificationMethod: record.verificationMethod
      }
    });
  } catch (err) {
    // Handle unique compound index race condition gracefully
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Attendance has already been marked for this class.'
      });
    }

    console.error('Error during student check-in:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to record attendance: ' + err.message
    });
  }
};

// ============================================================
// 6. CLOSE / FINALIZE ATTENDANCE SESSION
// ============================================================
// @route   POST /api/attendance/sessions/:id/close
// @access  Faculty, Admin
exports.closeSession = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const session = await AttendanceSession.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Attendance session not found.'
      });
    }

    if (session.status === 'FINALIZED' || session.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: `Session is already ${session.status.toLowerCase()}.`
      });
    }

    // Verify ownership or administrative privilege
    const userRole = normalizeRole(user.role);
    const isOwner = session.facultyId.toString() === user._id.toString();
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the session host or campus administrator can close this session.'
      });
    }

    // Compute actual attendance statistics
    const presentCount = await AttendanceRecord.countDocuments({
      sessionId: session._id,
      status: 'PRESENT'
    });
    const lateCount = await AttendanceRecord.countDocuments({
      sessionId: session._id,
      status: 'LATE'
    });
    const totalAbsent = Math.max(0, (session.totalEnrolled || 0) - (presentCount + lateCount));

    session.status = 'FINALIZED';
    session.actualEndTime = new Date();
    session.totalPresent = presentCount;
    session.totalLate = lateCount;
    session.totalAbsent = totalAbsent;
    session.qrExpiresAt = new Date(); // Immediately expire active QR
    await session.save();

    // Broadcast session closed to room
    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.to(`attendance_session_${session._id}`).emit('session_closed', {
        sessionId: session._id,
        status: 'FINALIZED',
        totalEnrolled: session.totalEnrolled,
        totalPresent: session.totalPresent,
        totalAbsent: session.totalAbsent
      });
    }

    await logActivity({
      user,
      action: 'ATTENDANCE_SESSION_FINALIZED',
      category: 'Smart Attendance',
      description: `Closed and finalized attendance session for ${session.branch} - Sec ${session.section}. Final: ${presentCount}/${session.totalEnrolled} Present`,
      details: {
        sessionId: session._id,
        totalEnrolled: session.totalEnrolled,
        totalPresent: presentCount,
        totalAbsent
      },
      req
    });

    // Phase 5: Automated Low-Attendance Shortage Alert Evaluation (Non-blocking)
    evaluateSessionShortages({ session, io, req, triggeredBy: user }).catch(alertErr => {
      console.warn('[AttendanceAlertService] Non-fatal session shortage evaluation warning:', alertErr.message);
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance session successfully finalized.',
      summary: {
        sessionId: session._id,
        status: session.status,
        actualStartTime: session.actualStartTime,
        actualEndTime: session.actualEndTime,
        totalEnrolled: session.totalEnrolled,
        totalPresent: session.totalPresent,
        totalAbsent: session.totalAbsent,
        attendancePercentage: session.totalEnrolled > 0
          ? Math.round((session.totalPresent / session.totalEnrolled) * 100)
          : 0
      }
    });
  } catch (err) {
    console.error('Error closing attendance session:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to close attendance session: ' + err.message
    });
  }
};

// ============================================================
// 7. GET ACTIVE CAMPUS ROOMS LIST
// ============================================================
// @route   GET /api/attendance/rooms
// @access  Authenticated (Faculty, Admin)
exports.getRooms = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    const query = { active: true };
    if (user.campusId && userRole !== ROLES.SUPER_ADMIN) {
      query.campusId = user.campusId;
    }

    // Exclude exact latitude & longitude coordinates from default query response
    const rooms = await Room.find(query)
      .select('buildingName roomNumber floor capacity roomType geofenceRadiusMeters active campusId')
      .sort({ buildingName: 1, roomNumber: 1 });

    return res.status(200).json({
      success: true,
      count: rooms.length,
      rooms
    });
  } catch (err) {
    console.error('Error retrieving rooms:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve classrooms list.'
    });
  }
};

// ============================================================
// 8. GET FACULTY & ADMIN ATTENDANCE SESSION HISTORY
// ============================================================
// @route   GET /api/attendance/sessions/history
// @access  Faculty, HOD, Director, Principal, Admin, Campus Admin, Super Admin
exports.getSessionHistory = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have permission to view session history.'
      });
    }

    const query = {};

    // Role-specific scoping
    if (userRole === ROLES.FACULTY) {
      const managed = Array.isArray(user.managedScopes) ? user.managedScopes : [];
      const scopeConditions = [{ facultyId: user._id }];
      for (const m of managed) {
        const cond = {};
        if (m.subject) cond.subjectId = m.subject._id || m.subject;
        if (m.branch) cond.branch = m.branch;
        if (m.section) cond.section = m.section;
        if (Object.keys(cond).length > 0) scopeConditions.push(cond);
      }
      query.$or = scopeConditions;
      if (user.campusId) query.campusId = user.campusId;
    } else if (userRole === ROLES.HOD) {
      if (user.campusId) query.campusId = user.campusId;
      const deptBranch = user.department || user.branch;
      if (deptBranch) query.branch = deptBranch;
      if (user.departmentId) query.departmentId = user.departmentId;

      if (req.query.campusId && user.campusId && req.query.campusId.toString() !== user.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: Cannot access sessions of another campus.'
        });
      }
      if (req.query.branch && deptBranch && req.query.branch.toUpperCase() !== deptBranch.toUpperCase()) {
        return res.status(403).json({
          success: false,
          error: 'Department Isolation: HOD cannot access sessions of another department.'
        });
      }
    } else if ([ROLES.DIRECTOR, ROLES.PRINCIPAL, ROLES.CAMPUS_ADMIN].includes(userRole)) {
      if (user.campusId) query.campusId = user.campusId;
      if (req.query.campusId && user.campusId && req.query.campusId.toString() !== user.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: Cannot access sessions of another campus.'
        });
      }
    }

    // Optional query filters
    if (req.query.status) query.status = req.query.status.toUpperCase();
    if (req.query.subjectId) query.subjectId = req.query.subjectId;
    if (req.query.section) query.section = req.query.section.toUpperCase();
    if (req.query.branch && !query.branch) query.branch = req.query.branch.toUpperCase();
    if (req.query.batchId) query.batchId = req.query.batchId;
    if (req.query.academicYear) query.academicYear = req.query.academicYear;

    if (req.query.startDate || req.query.endDate) {
      query.sessionDate = {};
      if (req.query.startDate) query.sessionDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.sessionDate.$lte = new Date(req.query.endDate);
    }

    const sessions = await AttendanceSession.find(query)
      .populate('subjectId', 'name code')
      .populate('roomId', 'buildingName roomNumber floor capacity geofenceRadiusMeters')
      .populate('facultyId', 'name email')
      .sort({ sessionDate: -1, createdAt: -1 });

    const formattedSessions = sessions.map(s => {
      const totalEnrolled = s.totalEnrolled || 0;
      const totalPresent = s.totalPresent || 0;
      const totalAbsent = s.totalAbsent || Math.max(0, totalEnrolled - totalPresent);
      const attendancePercentage = totalEnrolled > 0 ? Math.round((totalPresent / totalEnrolled) * 100) : 0;
      return {
        _id: s._id,
        campusId: s.campusId,
        departmentId: s.departmentId,
        branch: s.branch,
        section: s.section,
        academicYear: s.academicYear,
        semester: s.semester,
        period: s.period,
        sessionDate: s.sessionDate,
        scheduledStartTime: s.scheduledStartTime,
        actualStartTime: s.actualStartTime,
        actualEndTime: s.actualEndTime,
        status: s.status,
        subject: s.subjectId,
        room: s.roomId ? {
          _id: s.roomId._id,
          buildingName: s.roomId.buildingName,
          roomNumber: s.roomId.roomNumber,
          floor: s.roomId.floor,
          capacity: s.roomId.capacity,
          geofenceRadiusMeters: s.roomId.geofenceRadiusMeters
        } : null,
        faculty: s.facultyId ? {
          _id: s.facultyId._id,
          name: s.facultyId.name,
          email: s.facultyId.email
        } : null,
        totalEnrolled,
        totalPresent,
        totalAbsent,
        attendancePercentage
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedSessions.length,
      sessions: formattedSessions
    });
  } catch (err) {
    console.error('Error fetching session history:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve attendance session history.'
    });
  }
};

// ============================================================
// 9. GET STUDENT ATTENDANCE HISTORY
// ============================================================
// @route   GET /api/attendance/student/history
// @access  Student (Self only)
exports.getStudentAttendanceHistory = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if (userRole !== ROLES.STUDENT) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Student attendance history is reserved for authenticated students.'
      });
    }

    // Always enforce authenticated student identity (never trust query params)
    const studentId = user._id;

    const records = await AttendanceRecord.find({ studentId })
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'subjectId', select: 'name code' },
          { path: 'facultyId', select: 'name email' },
          { path: 'roomId', select: 'buildingName roomNumber floor' }
        ]
      })
      .sort({ scannedAt: -1, markedAt: -1 });

    const history = records.map(r => {
      const sess = r.sessionId;
      return {
        _id: r._id,
        recordId: r._id,
        sessionId: sess ? sess._id : null,
        subject: sess?.subjectId || { name: 'Class Lecture', code: 'SUBJ' },
        date: sess?.sessionDate || r.markedAt,
        scheduledTime: sess?.scheduledStartTime || r.markedAt,
        faculty: sess?.facultyId?.name || 'Faculty Instructor',
        room: sess?.roomId ? `${sess.roomId.buildingName} ${sess.roomId.roomNumber}` : 'Classroom',
        status: r.status,
        verificationMethod: r.verificationMethod,
        scannedAt: r.scannedAt || r.markedAt,
        correctionStatus: r.correctionStatus || 'NONE',
        originalStatus: r.originalStatus || null,
        remarks: r.remarks || ''
      };
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    console.error('Error fetching student attendance history:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve student attendance history.'
    });
  }
};

// ============================================================
// 10. GET STUDENT ATTENDANCE ANALYTICS
// ============================================================
// @route   GET /api/attendance/student/analytics
// @access  Student (Self only)
exports.getStudentAttendanceAnalytics = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if (userRole !== ROLES.STUDENT) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Student analytics is reserved for authenticated students.'
      });
    }

    const studentId = user._id;
    const records = await AttendanceRecord.find({ studentId })
      .populate({
        path: 'sessionId',
        populate: { path: 'subjectId', select: 'name code' }
      });

    const totalClasses = records.length;
    const attendedClasses = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const missedClasses = records.filter(r => r.status === 'ABSENT').length;
    const overallPercentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;
    const shortageThreshold = 75;
    const shortage = totalClasses > 0 && overallPercentage < shortageThreshold;

    const subjectMap = {};
    for (const r of records) {
      const sub = r.sessionId?.subjectId;
      const subId = sub?._id?.toString() || 'general';
      if (!subjectMap[subId]) {
        subjectMap[subId] = {
          subjectId: sub?._id || subId,
          subjectName: sub?.name || 'Class Subject',
          subjectCode: sub?.code || 'SUBJ',
          total: 0,
          present: 0,
          absent: 0
        };
      }
      subjectMap[subId].total += 1;
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        subjectMap[subId].present += 1;
      } else if (r.status === 'ABSENT') {
        subjectMap[subId].absent += 1;
      }
    }

    const subjects = Object.values(subjectMap).map(s => {
      const percentage = s.total > 0 ? Math.round((s.present / s.total) * 100) : 100;
      return {
        ...s,
        percentage,
        shortage: s.total > 0 && percentage < shortageThreshold
      };
    });

    return res.status(200).json({
      success: true,
      analytics: {
        overallPercentage,
        totalClasses,
        attendedClasses,
        missedClasses,
        shortageThreshold,
        shortage,
        subjects
      }
    });
  } catch (err) {
    console.error('Error computing student analytics:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to compute student attendance analytics.'
    });
  }
};

// ============================================================
// 11. HOD DEPARTMENT REPORT
// ============================================================
// @route   GET /api/attendance/reports/department
// @access  HOD, Director, Principal, Admin, Campus Admin, Super Admin
exports.getDepartmentReport = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER, ROLES.FACULTY].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have permission to view department attendance reports.'
      });
    }

    const query = {};

    // Scope enforcement
    if (userRole === ROLES.HOD) {
      if (user.campusId) query.campusId = user.campusId;
      const deptBranch = user.department || user.branch;
      if (deptBranch) query.branch = deptBranch;

      if (req.query.campusId && user.campusId && req.query.campusId.toString() !== user.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: Cross-campus department reports are prohibited.'
        });
      }
      if (req.query.branch && deptBranch && req.query.branch.toUpperCase() !== deptBranch.toUpperCase()) {
        return res.status(403).json({
          success: false,
          error: 'Department Isolation: Cannot access another department report.'
        });
      }
    } else if ([ROLES.DIRECTOR, ROLES.PRINCIPAL, ROLES.CAMPUS_ADMIN].includes(userRole)) {
      if (user.campusId) query.campusId = user.campusId;
      if (req.query.campusId && user.campusId && req.query.campusId.toString() !== user.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: Cannot access another campus report.'
        });
      }
      if (req.query.branch) query.branch = req.query.branch.toUpperCase();
    } else if (req.query.branch) {
      query.branch = req.query.branch.toUpperCase();
    }

    if (req.query.section) query.section = req.query.section.toUpperCase();
    if (req.query.subjectId) query.subjectId = req.query.subjectId;
    if (req.query.academicYear) query.academicYear = req.query.academicYear;

    if (req.query.startDate || req.query.endDate) {
      query.sessionDate = {};
      if (req.query.startDate) query.sessionDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.sessionDate.$lte = new Date(req.query.endDate);
    }

    const sessions = await AttendanceSession.find(query)
      .populate('subjectId', 'name code')
      .populate('facultyId', 'name email');

    const sessionIds = sessions.map(s => s._id);
    const records = sessionIds.length > 0 ? await AttendanceRecord.find({ sessionId: { $in: sessionIds } }) : [];

    const totalSessions = sessions.length;
    const studentFilter = { role: 'student' };
    if (query.campusId) studentFilter.campusId = query.campusId;
    if (query.branch) studentFilter.branch = query.branch;
    const totalStudents = await User.countDocuments(studentFilter);

    let totalEnrolledSum = 0;
    let totalPresentSum = 0;
    sessions.forEach(s => {
      totalEnrolledSum += (s.totalEnrolled || 0);
      totalPresentSum += (s.totalPresent || 0);
    });
    const averageAttendance = totalEnrolledSum > 0 ? Math.round((totalPresentSum / totalEnrolledSum) * 100) : 0;

    // Subject-wise breakdown
    const subjectMap = {};
    sessions.forEach(s => {
      const subId = s.subjectId?._id?.toString() || 'unknown';
      if (!subjectMap[subId]) {
        subjectMap[subId] = {
          subjectId: s.subjectId?._id,
          subjectName: s.subjectId?.name || 'Subject',
          subjectCode: s.subjectId?.code || 'SUBJ',
          sessionsCount: 0,
          totalEnrolled: 0,
          totalPresent: 0
        };
      }
      subjectMap[subId].sessionsCount += 1;
      subjectMap[subId].totalEnrolled += (s.totalEnrolled || 0);
      subjectMap[subId].totalPresent += (s.totalPresent || 0);
    });
    const subjectAttendance = Object.values(subjectMap).map(sub => ({
      ...sub,
      attendancePercentage: sub.totalEnrolled > 0 ? Math.round((sub.totalPresent / sub.totalEnrolled) * 100) : 0
    }));

    // Section-wise breakdown
    const sectionMap = {};
    sessions.forEach(s => {
      const secKey = `${s.branch}-${s.section}`;
      if (!sectionMap[secKey]) {
        sectionMap[secKey] = {
          branch: s.branch,
          section: s.section,
          sessionsCount: 0,
          totalEnrolled: 0,
          totalPresent: 0
        };
      }
      sectionMap[secKey].sessionsCount += 1;
      sectionMap[secKey].totalEnrolled += (s.totalEnrolled || 0);
      sectionMap[secKey].totalPresent += (s.totalPresent || 0);
    });
    const sectionAttendance = Object.values(sectionMap).map(sec => ({
      ...sec,
      attendancePercentage: sec.totalEnrolled > 0 ? Math.round((sec.totalPresent / sec.totalEnrolled) * 100) : 0
    }));

    // Faculty session activity
    const facultyMap = {};
    sessions.forEach(s => {
      const facId = s.facultyId?._id?.toString() || 'unknown';
      if (!facultyMap[facId]) {
        facultyMap[facId] = {
          facultyId: s.facultyId?._id,
          facultyName: s.facultyId?.name || 'Faculty',
          facultyEmail: s.facultyId?.email || '',
          sessionsCount: 0,
          totalPresent: 0,
          totalEnrolled: 0
        };
      }
      facultyMap[facId].sessionsCount += 1;
      facultyMap[facId].totalPresent += (s.totalPresent || 0);
      facultyMap[facId].totalEnrolled += (s.totalEnrolled || 0);
    });
    const facultyActivity = Object.values(facultyMap).map(f => ({
      ...f,
      averageAttendance: f.totalEnrolled > 0 ? Math.round((f.totalPresent / f.totalEnrolled) * 100) : 0
    }));

    // Shortage students in department
    const studentRecordMap = {};
    records.forEach(r => {
      const stId = r.studentId?.toString();
      if (!studentRecordMap[stId]) {
        studentRecordMap[stId] = {
          studentId: r.studentId,
          rollNumber: r.rollNumber,
          studentName: r.studentName,
          presentCount: 0,
          totalCount: 0
        };
      }
      studentRecordMap[stId].totalCount += 1;
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        studentRecordMap[stId].presentCount += 1;
      }
    });

    const shortageStudents = Object.values(studentRecordMap)
      .map(st => {
        const percentage = st.totalCount > 0 ? Math.round((st.presentCount / st.totalCount) * 100) : 0;
        return {
          ...st,
          attendancePercentage: percentage,
          shortage: percentage < 75
        };
      })
      .filter(st => st.shortage);

    await logActivity({
      user,
      action: 'ATTENDANCE_DEPARTMENT_REPORT_GENERATED',
      category: 'Smart Attendance',
      description: `Generated department attendance report for ${query.branch || 'department'}`,
      details: { branch: query.branch, totalSessions, totalStudents, averageAttendance },
      req
    });

    return res.status(200).json({
      success: true,
      report: {
        totalStudents,
        totalSessions,
        averageAttendance,
        subjectAttendance,
        sectionAttendance,
        facultyActivity,
        shortageCount: shortageStudents.length,
        shortageStudents
      }
    });
  } catch (err) {
    console.error('Error generating department report:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate department attendance report.'
    });
  }
};

// ============================================================
// 12. PRINCIPAL / DIRECTOR CAMPUS REPORT
// ============================================================
// @route   GET /api/attendance/reports/campus
// @access  Director, Principal, Campus Admin, Admin, Super Admin (Read-only)
exports.getCampusReport = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER, ROLES.FACULTY].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have permission to view campus attendance overview.'
      });
    }

    const query = {};
    if (user.campusId && userRole !== ROLES.SUPER_ADMIN) {
      query.campusId = user.campusId;
    }

    if (req.query.campusId && user.campusId && userRole !== ROLES.SUPER_ADMIN) {
      if (req.query.campusId.toString() !== user.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: Cross-campus overview is forbidden.'
        });
      }
    }

    const sessions = await AttendanceSession.find(query)
      .populate('subjectId', 'name code')
      .populate('facultyId', 'name email');

    const totalSessions = sessions.length;
    const totalStudents = await User.countDocuments({ role: 'student', ...(query.campusId ? { campusId: query.campusId } : {}) });

    let totalEnrolled = 0;
    let totalPresent = 0;
    const branchMap = {};

    sessions.forEach(s => {
      totalEnrolled += (s.totalEnrolled || 0);
      totalPresent += (s.totalPresent || 0);

      const br = s.branch || 'OTHER';
      if (!branchMap[br]) {
        branchMap[br] = { branch: br, sessions: 0, totalEnrolled: 0, totalPresent: 0 };
      }
      branchMap[br].sessions += 1;
      branchMap[br].totalEnrolled += (s.totalEnrolled || 0);
      branchMap[br].totalPresent += (s.totalPresent || 0);
    });

    const averageAttendance = totalEnrolled > 0 ? Math.round((totalPresent / totalEnrolled) * 100) : 0;

    const branchComparison = Object.values(branchMap).map(b => ({
      ...b,
      attendancePercentage: b.totalEnrolled > 0 ? Math.round((b.totalPresent / b.totalEnrolled) * 100) : 0
    }));

    const sessionIds = sessions.map(s => s._id);
    const records = sessionIds.length > 0 ? await AttendanceRecord.find({ sessionId: { $in: sessionIds } }) : [];
    const studentMap = {};
    records.forEach(r => {
      const id = r.studentId?.toString();
      if (!studentMap[id]) {
        studentMap[id] = { present: 0, total: 0 };
      }
      studentMap[id].total += 1;
      if (r.status === 'PRESENT' || r.status === 'LATE') studentMap[id].present += 1;
    });

    let shortageCount = 0;
    Object.values(studentMap).forEach(st => {
      const pct = st.total > 0 ? (st.present / st.total) * 100 : 0;
      if (pct < 75) shortageCount += 1;
    });

    await logActivity({
      user,
      action: 'ATTENDANCE_CAMPUS_REPORT_GENERATED',
      category: 'Smart Attendance',
      description: `Generated executive campus attendance report`,
      details: { campusId: query.campusId, totalSessions, totalStudents, averageAttendance },
      req
    });

    return res.status(200).json({
      success: true,
      report: {
        totalStudents,
        totalSessions,
        averageAttendance,
        shortageCount,
        branchComparison,
        sessionsConducted: totalSessions
      }
    });
  } catch (err) {
    console.error('Error generating campus report:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate campus attendance report.'
    });
  }
};

// ============================================================
// HELPER: SHORTAGE DATA EXTRACTOR
// ============================================================
async function computeShortageData(req) {
  const user = req.user;
  const userRole = normalizeRole(user.role);
  const threshold = Number(req.query.threshold) || 75;

  const sessionQuery = {};

  if (userRole === ROLES.FACULTY) {
    sessionQuery.facultyId = user._id;
    if (user.campusId) sessionQuery.campusId = user.campusId;
  } else if (userRole === ROLES.HOD) {
    if (user.campusId) sessionQuery.campusId = user.campusId;
    const deptBranch = user.department || user.branch;
    if (deptBranch) sessionQuery.branch = deptBranch;

    if (req.query.campusId && user.campusId && req.query.campusId.toString() !== user.campusId.toString()) {
      throw { status: 403, message: 'Multi-Campus Isolation: Cross-campus shortage access forbidden.' };
    }
    if (req.query.branch && deptBranch && req.query.branch.toUpperCase() !== deptBranch.toUpperCase()) {
      throw { status: 403, message: 'Department Isolation: Cross-department shortage access forbidden.' };
    }
  } else if ([ROLES.DIRECTOR, ROLES.PRINCIPAL, ROLES.CAMPUS_ADMIN].includes(userRole)) {
    if (user.campusId) sessionQuery.campusId = user.campusId;
    if (req.query.campusId && user.campusId && req.query.campusId.toString() !== user.campusId.toString()) {
      throw { status: 403, message: 'Multi-Campus Isolation: Cross-campus shortage access forbidden.' };
    }
    if (req.query.branch) sessionQuery.branch = req.query.branch.toUpperCase();
  } else if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(userRole)) {
    if (req.query.campusId) sessionQuery.campusId = req.query.campusId;
    if (req.query.branch) sessionQuery.branch = req.query.branch.toUpperCase();
  } else {
    throw { status: 403, message: 'Access Denied: You do not have permission to access attendance shortage reports.' };
  }

  if (req.query.section) sessionQuery.section = req.query.section.toUpperCase();
  if (req.query.subjectId) sessionQuery.subjectId = req.query.subjectId;
  if (req.query.academicYear) sessionQuery.academicYear = req.query.academicYear;

  const sessions = await AttendanceSession.find(sessionQuery)
    .populate('subjectId', 'name code');

  const sessionIds = sessions.map(s => s._id);
  if (sessionIds.length === 0) return { threshold, shortageList: [] };

  const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } })
    .populate({ path: 'sessionId', populate: { path: 'subjectId', select: 'name code' } });

  const studentSubMap = {};
  records.forEach(r => {
    const sub = r.sessionId?.subjectId;
    const key = `${r.studentId}_${sub?._id || 'all'}`;
    if (!studentSubMap[key]) {
      studentSubMap[key] = {
        studentId: r.studentId,
        studentName: r.studentName,
        rollNumber: r.rollNumber,
        branch: r.sessionId?.branch || '',
        section: r.sessionId?.section || '',
        subjectName: sub?.name || 'Class Subject',
        subjectCode: sub?.code || 'SUBJ',
        present: 0,
        total: 0
      };
    }
    studentSubMap[key].total += 1;
    if (r.status === 'PRESENT' || r.status === 'LATE') studentSubMap[key].present += 1;
  });

  const shortageList = Object.values(studentSubMap)
    .map(s => {
      const percentage = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
      return {
        ...s,
        attendancePercentage: percentage,
        shortage: percentage < threshold
      };
    })
    .filter(s => s.shortage);

  return { threshold, shortageList };
}

// ============================================================
// 13. SHORTAGE REPORT (JSON)
// ============================================================
// @route   GET /api/attendance/reports/shortage
// @access  Faculty, HOD, Director, Principal, Campus Admin, Admin, Super Admin
exports.getShortageReport = async (req, res) => {
  try {
    const { threshold, shortageList } = await computeShortageData(req);
    return res.status(200).json({
      success: true,
      threshold,
      count: shortageList.length,
      students: shortageList
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('Error getting shortage report:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve shortage report.' });
  }
};

// ============================================================
// 14. EXPORT SHORTAGE CSV
// ============================================================
// @route   GET /api/attendance/reports/shortage.csv
// @access  HOD, Director, Principal, Campus Admin, Admin, Super Admin
exports.exportShortageCsv = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);
    if ([ROLES.STUDENT, ROLES.RECRUITER].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Student and recruiter accounts cannot export CSV reports.'
      });
    }

    const { threshold, shortageList } = await computeShortageData(req);

    const headers = ['Student Name', 'Roll Number', 'Branch', 'Section', 'Subject', 'Attendance Percentage', 'Present', 'Total', 'Shortage'];
    const rows = shortageList.map(s => [
      `"${(s.studentName || '').replace(/"/g, '""')}"`,
      `"${(s.rollNumber || '').replace(/"/g, '""')}"`,
      `"${(s.branch || '').replace(/"/g, '""')}"`,
      `"${(s.section || '').replace(/"/g, '""')}"`,
      `"${(s.subjectName || '').replace(/"/g, '""')}"`,
      `${s.attendancePercentage}%`,
      s.present,
      s.total,
      'YES'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    await logActivity({
      user,
      action: 'ATTENDANCE_SHORTAGE_REPORT_EXPORTED',
      category: 'Smart Attendance',
      description: `Exported attendance shortage CSV report (Count: ${shortageList.length})`,
      details: { threshold, recordCount: shortageList.length },
      req
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance_shortage_report.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('Error exporting shortage CSV:', err);
    return res.status(500).json({ success: false, error: 'Failed to export shortage CSV.' });
  }
};

// ============================================================
// 15. ATTENDANCE DISPUTE & CORRECTION WORKFLOW
// ============================================================
// @route   POST /api/attendance/records/:recordId/correction
// @access  Faculty (request), HOD/Admin (review/approve)
exports.requestOrReviewCorrection = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER, ROLES.AUDITOR, ROLES.DIRECTOR, ROLES.PRINCIPAL].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Unauthorized to submit or review attendance corrections.'
      });
    }

    const { recordId } = req.params;
    const record = await AttendanceRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found.'
      });
    }

    const session = await AttendanceSession.findById(record.sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Associated attendance session not found.'
      });
    }

    // Campus isolation
    if (user.campusId && session.campusId && userRole !== ROLES.SUPER_ADMIN) {
      if (user.campusId.toString() !== session.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: Cross-campus attendance correction forbidden.'
        });
      }
    }

    const { action, requestedStatus, reason, notes } = req.body;

    // Review Workflow (Approve / Reject)
    if (action === 'APPROVE' || action === 'REJECT') {
      if (userRole === ROLES.FACULTY && session.facultyId.toString() === user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Dual-Control Policy: Faculty cannot self-approve attendance dispute corrections. HOD or Administrator review required.'
        });
      }

      if (action === 'APPROVE') {
        const targetStatus = record.correctionRequestedStatus || req.body.status || 'PRESENT';
        const prevStatus = record.status;

        record.originalStatus = record.originalStatus || prevStatus;
        record.status = targetStatus;
        record.correctionStatus = 'APPROVED';
        record.correctionReviewedBy = user._id;
        record.correctionReviewedAt = new Date();
        await record.save();

        // Adjust session counters safely
        if (prevStatus === 'ABSENT' && targetStatus === 'PRESENT') {
          session.totalPresent = (session.totalPresent || 0) + 1;
          session.totalAbsent = Math.max(0, (session.totalAbsent || 0) - 1);
          await session.save();
        } else if (prevStatus === 'PRESENT' && targetStatus === 'ABSENT') {
          session.totalPresent = Math.max(0, (session.totalPresent || 0) - 1);
          session.totalAbsent = (session.totalAbsent || 0) + 1;
          await session.save();
        }

        await logActivity({
          user,
          action: 'ATTENDANCE_CORRECTION_APPROVED',
          category: 'Smart Attendance',
          description: `Approved attendance correction for ${record.studentName} (${record.rollNumber}) to ${targetStatus}`,
          details: { recordId: record._id, sessionId: session._id, previousStatus: prevStatus, newStatus: targetStatus },
          req
        });

        // Phase 5: Re-evaluate student shortage after correction (Non-blocking)
        const io = req.app.get('socketio') || req.app.get('io');
        evaluateStudentForSubject({
          studentId: record.studentId,
          subjectId: session.subjectId,
          io,
          req,
          triggeredBy: user
        }).catch(alertErr => {
          console.warn('[AttendanceAlertService] Non-fatal correction alert evaluation warning:', alertErr.message);
        });

        return res.status(200).json({
          success: true,
          message: 'Attendance correction approved successfully.',
          record
        });
      } else {
        record.correctionStatus = 'REJECTED';
        record.correctionReviewedBy = user._id;
        record.correctionReviewedAt = new Date();
        await record.save();

        await logActivity({
          user,
          action: 'ATTENDANCE_CORRECTION_REJECTED',
          category: 'Smart Attendance',
          description: `Rejected attendance correction request for ${record.studentName} (${record.rollNumber})`,
          details: { recordId: record._id, sessionId: session._id, reason: record.correctionReason },
          req
        });

        return res.status(200).json({
          success: true,
          message: 'Attendance correction rejected.',
          record
        });
      }
    }

    // Request Workflow (Faculty submits dispute/correction)
    if (!requestedStatus || !['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid requestedStatus (PRESENT, ABSENT, LATE, EXCUSED).'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a justification reason for the attendance correction.'
      });
    }

    record.originalStatus = record.originalStatus || record.status;
    record.correctionRequestedStatus = requestedStatus;
    record.correctionReason = reason.trim();
    record.correctionNotes = (notes || '').trim();
    record.correctionStatus = 'REQUESTED';
    record.correctionRequestedBy = user._id;
    record.correctionRequestedAt = new Date();
    await record.save();

    await logActivity({
      user,
      action: 'ATTENDANCE_CORRECTION_REQUESTED',
      category: 'Smart Attendance',
      description: `Requested attendance correction for ${record.studentName} (${record.rollNumber}) to ${requestedStatus}: ${reason}`,
      details: { recordId: record._id, sessionId: session._id, requestedStatus, reason },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance correction request submitted for administrative review.',
      record
    });
  } catch (err) {
    console.error('Error in attendance correction:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process attendance correction.'
    });
  }
};

// ============================================================
// 16. ATTENDANCE AUDIT LOGS
// ============================================================
// @route   GET /api/attendance/audit
// @access  Auditor, Director, Principal, Campus Admin, Admin, Super Admin (Read-only)
exports.getAttendanceAudit = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You do not have permission to access attendance audit logs.'
      });
    }

    const query = { category: 'Smart Attendance' };
    if (user.campusId && userRole !== ROLES.SUPER_ADMIN) {
      query.campusId = user.campusId;
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error('Error fetching attendance audit logs:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve attendance audit logs.'
    });
  }
};

// ============================================================
// 17. ONE-CLICK AUTHORIZED AT-RISK NOTIFICATION DISPATCH
// ============================================================
// @route   POST /api/attendance/notifications/dispatch-at-risk
// @access  Faculty, HOD, Director, Principal, Campus Admin, Admin, Super Admin
exports.dispatchAtRiskAlerts = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    // 1. Strict Role Authorization
    if ([ROLES.STUDENT, ROLES.RECRUITER, ROLES.AUDITOR].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: You are not authorized to dispatch attendance shortage notifications.'
      });
    }

    // 2. Server-Side Scope Recalculation (Never trust client student IDs or count)
    const { threshold, shortageList } = await computeShortageData(req);

    const authorizedCount = shortageList.length;
    let notifiedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const io = req.app.get('socketio') || req.app.get('io');

    for (const item of shortageList) {
      try {
        const student = await User.findById(item.studentId);
        if (!student) {
          skippedCount++;
          continue;
        }

        // Scope verification:
        // If Faculty: verify student is in faculty's sessions or managed scope
        if (userRole === ROLES.FACULTY) {
          const facultyTaught = await AttendanceSession.exists({
            facultyId: user._id,
            branch: student.branch,
            section: student.section
          });
          const hasManagedScope = user.managedScopes && user.managedScopes.some(s =>
            (!s.branch || s.branch.toUpperCase() === (student.branch || '').toUpperCase()) &&
            (!s.section || s.section.toUpperCase() === (student.section || '').toUpperCase())
          );
          if (!facultyTaught && !hasManagedScope) {
            skippedCount++;
            continue;
          }
        }

        // If HOD: verify student matches HOD department & campus
        if (userRole === ROLES.HOD) {
          const dept = (user.department || user.branch || '').toUpperCase();
          if (dept && (student.branch || '').toUpperCase() !== dept) {
            skippedCount++;
            continue;
          }
          if (user.campusId && student.campusId && user.campusId.toString() !== student.campusId.toString()) {
            skippedCount++;
            continue;
          }
        }

        const alertRes = await dispatchAttendanceShortageAlert({
          studentId: student._id,
          subjectId: req.body.subjectId || null,
          currentPercentage: item.attendancePercentage,
          presentCount: item.present,
          totalCount: item.total,
          threshold,
          triggeredBy: user,
          io,
          req
        });

        if (alertRes.notified) {
          notifiedCount++;
        } else if (alertRes.suppressed || alertRes.skipped) {
          skippedCount++;
        } else {
          failedCount++;
        }
      } catch (dispErr) {
        console.error('Error dispatching individual alert:', dispErr.message);
        failedCount++;
      }
    }

    await logActivity({
      user,
      action: 'ATTENDANCE_BULK_ALERT_DISPATCHED',
      category: 'Smart Attendance',
      description: `Dispatched bulk at-risk attendance alerts (${notifiedCount} notified, ${skippedCount} skipped, ${failedCount} failed)`,
      details: {
        role: userRole,
        requested: authorizedCount,
        authorized: authorizedCount,
        notified: notifiedCount,
        skipped: skippedCount,
        failed: failedCount
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: `Successfully processed at-risk notifications for ${authorizedCount} students.`,
      summary: {
        requested: authorizedCount,
        authorized: authorizedCount,
        notified: notifiedCount,
        skipped: skippedCount,
        failed: failedCount
      }
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message });
    console.error('Error dispatching at-risk alerts:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to dispatch at-risk attendance notifications.'
    });
  }
};

// ============================================================
// 18. GET ATTENDANCE NOTIFICATIONS HISTORY
// ============================================================
// @route   GET /api/attendance/notifications
// @access  Student (Own only), Faculty (Scope only), HOD (Dept only), Principal/Director (Campus), Auditor (Read-only)
exports.getAttendanceNotifications = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if (userRole === ROLES.RECRUITER) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Recruiters do not have access to academic attendance notifications.'
      });
    }

    let filter = { type: 'attendance_alert' };

    if (userRole === ROLES.STUDENT) {
      // Students can ONLY view their own notifications.
      // Ignore any query studentId or campusId parameters completely!
      filter.user = user._id;
    } else if (userRole === ROLES.FACULTY) {
      // Find students in faculty's taught sessions or managed scope
      const facultySessions = await AttendanceSession.find({ facultyId: user._id }).select('branch section');
      const branchSectionConditions = facultySessions.map(s => ({
        branch: s.branch,
        section: s.section
      }));
      if (user.managedScopes && user.managedScopes.length > 0) {
        user.managedScopes.forEach(ms => {
          if (ms.branch) branchSectionConditions.push({ branch: ms.branch, section: ms.section || { $exists: true } });
        });
      }

      let studentQuery = { role: 'student' };
      if (branchSectionConditions.length > 0) {
        studentQuery.$or = branchSectionConditions;
      }
      if (user.campusId) studentQuery.campusId = user.campusId;

      const authorizedStudents = await User.find(studentQuery).select('_id');
      const studentIds = authorizedStudents.map(s => s._id);
      filter.user = { $in: studentIds };
    } else if (userRole === ROLES.HOD) {
      const dept = user.department || user.branch;
      const studentQuery = { role: 'student' };
      if (dept) studentQuery.branch = new RegExp(`^${dept}$`, 'i');
      if (user.campusId) studentQuery.campusId = user.campusId;

      if (req.query.campusId && user.campusId && req.query.campusId.toString() !== user.campusId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: Cross-campus notification history forbidden.'
        });
      }
      if (req.query.branch && dept && req.query.branch.toUpperCase() !== dept.toUpperCase()) {
        return res.status(403).json({
          success: false,
          error: 'Department Isolation: Cross-department notification history forbidden.'
        });
      }

      const deptStudents = await User.find(studentQuery).select('_id');
      const studentIds = deptStudents.map(s => s._id);
      filter.user = { $in: studentIds };
    } else if ([ROLES.DIRECTOR, ROLES.PRINCIPAL, ROLES.CAMPUS_ADMIN].includes(userRole)) {
      if (user.campusId) {
        const campusStudents = await User.find({ role: 'student', campusId: user.campusId }).select('_id');
        filter.user = { $in: campusStudents.map(s => s._id) };
      }
    } else if (userRole === ROLES.AUDITOR) {
      // Auditor read-only access
      if (user.campusId) {
        const campusStudents = await User.find({ role: 'student', campusId: user.campusId }).select('_id');
        filter.user = { $in: campusStudents.map(s => s._id) };
      }
    }
    // Super admin & admin get unrestricted or campus-filtered

    const notifications = await Notification.find(filter)
      .populate('user', 'name rollNumber email branch section')
      .populate('metadata.subjectId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    // Sanitize any sensitive attributes: ensure GPS / QR secrets are never returned
    const sanitized = notifications.map(n => {
      const doc = n.toObject ? n.toObject() : { ...n };
      if (doc.metadata) {
        delete doc.metadata.latitude;
        delete doc.metadata.longitude;
        delete doc.metadata.sessionNonce;
        delete doc.metadata.tokenNonce;
        delete doc.metadata.qrSecret;
      }
      return doc;
    });

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      data: sanitized
    });
  } catch (err) {
    console.error('Error fetching attendance notifications:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve attendance notifications.'
    });
  }
};

// ============================================================
// 19. NOTIFICATION PREFERENCES MANAGEMENT
// ============================================================
// @route   GET /api/attendance/notifications/preferences
// @access  Authenticated Users
exports.getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+guardianContacts +attendanceNotificationPreferences');
    return res.status(200).json({
      success: true,
      preferences: user.attendanceNotificationPreferences || {
        inApp: true,
        email: true,
        parentOptIn: false,
        dailyDigest: false
      },
      guardianContacts: user.guardianContacts || []
    });
  } catch (err) {
    console.error('Error fetching notification preferences:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification preferences.'
    });
  }
};

// @route   PUT /api/attendance/notifications/preferences
// @access  Authenticated Users
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+guardianContacts +attendanceNotificationPreferences');
    const { inApp, email, parentOptIn, dailyDigest, guardianContacts } = req.body;

    const currentPrefs = user.attendanceNotificationPreferences || {};

    // Institutional compliance rule: Students cannot disable inApp compliance alerts
    if (normalizeRole(user.role) === ROLES.STUDENT && inApp === false) {
      return res.status(400).json({
        success: false,
        error: 'Institutional Compliance Policy: In-app attendance alerts are mandatory and cannot be disabled.'
      });
    }

    if (inApp !== undefined) currentPrefs.inApp = Boolean(inApp);
    if (email !== undefined) currentPrefs.email = Boolean(email);
    if (parentOptIn !== undefined) currentPrefs.parentOptIn = Boolean(parentOptIn);
    if (dailyDigest !== undefined) currentPrefs.dailyDigest = Boolean(dailyDigest);

    user.attendanceNotificationPreferences = currentPrefs;

    if (guardianContacts && Array.isArray(guardianContacts)) {
      // Validate guardian contacts format
      const cleanedGuardians = guardianContacts.map(g => ({
        name: String(g.name || '').trim(),
        relationship: String(g.relationship || 'Parent').trim(),
        email: String(g.email || '').trim().toLowerCase(),
        phone: String(g.phone || '').trim().replace(/\D/g, ''),
        enabled: Boolean(g.enabled)
      }));
      user.guardianContacts = cleanedGuardians;
    }

    await user.save();

    await logActivity({
      user,
      action: 'ATTENDANCE_PREFERENCES_UPDATED',
      category: 'Smart Attendance',
      description: `Updated attendance notification preferences for ${user.name}`,
      details: {
        preferences: user.attendanceNotificationPreferences,
        guardianCount: user.guardianContacts?.length || 0
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully.',
      preferences: user.attendanceNotificationPreferences,
      guardianContacts: user.guardianContacts || []
    });
  } catch (err) {
    console.error('Error updating notification preferences:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences.'
    });
  }
};
