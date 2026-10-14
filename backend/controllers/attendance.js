const crypto = require('crypto');
const mongoose = require('mongoose');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Room = require('../models/Room');
const Campus = require('../models/Campus');
const CampusCheckInLog = require('../models/CampusCheckInLog');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { logActivity, extractClientIp, extractUserAgent } = require('../utils/auditLogger');
const { ROLES, normalizeRole, PERMISSIONS, hasRolePermission } = require('../config/permissions');
const { isSuperAdmin, canAccessCampus, canAccessDepartment } = require('../utils/scopeFilter');

const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const {
  DEFAULT_ATTENDANCE_THRESHOLD,
  getShortageThreshold,
  calculatePercentage,
  isShortage,
  dispatchAttendanceShortageAlert,
  evaluateSessionShortages,
  evaluateStudentForSubject
} = require('../services/attendanceAlertService');
// Attendance notification service (WhatsApp alerts & 10-min session rectification)
let attendanceNotificationService = null;
try {
  attendanceNotificationService = require('../services/attendanceNotificationService');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    console.error('[AttendanceController] Failed to initialize attendanceNotificationService:', err.message);
  } else {
    console.warn('[AttendanceController] attendanceNotificationService not found; operating without automated notification triggers.');
  }
}

const sendCampusLateArrivalAlert = attendanceNotificationService ? attendanceNotificationService.sendCampusLateArrivalAlert : null;
const sendCampusAbsenceAlert = attendanceNotificationService ? attendanceNotificationService.sendCampusAbsenceAlert : null;
const sendCampusArrivalUpdateAlert = attendanceNotificationService ? attendanceNotificationService.sendCampusArrivalUpdateAlert : null;
const finalizeSubmittedSession = attendanceNotificationService ? attendanceNotificationService.finalizeSubmittedSession : null;
const {
  extractNormalizedEmbedding,
  encryptEmbedding,
  decryptEmbedding,
  compareEmbeddings,
  generateLivenessChallenge,
  validateLivenessChallenge,
  generateFaceVerificationToken,
  verifyAndConsumeFaceToken,
  SIMILARITY_THRESHOLD
} = require('../services/biometricService');


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

/**
 * Cryptographically verifies a dynamic rolling QR token against the session security context.
 * Enforces HMAC-SHA256 signature validation with constant-time equality.
 *
 * @param {string} token - The raw token submitted by the student (rotationNonce.timestamp.sig)
 * @param {string} sessionId - The session ObjectId string
 * @param {string} sessionNonce - The secret tokenNonce stored on the session (select: false)
 * @returns {boolean} True if signature matches and format is valid, false otherwise
 */
function verifyQrTokenSignature(token, sessionId, sessionNonce) {
  if (!token || typeof token !== 'string' || !sessionNonce) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [rotationNonce, timestampStr, providedSig] = parts;
  if (!rotationNonce || !timestampStr || !providedSig) return false;

  const expectedSig = crypto
    .createHmac('sha256', sessionNonce)
    .update(`${sessionId}:${rotationNonce}:${timestampStr}`)
    .digest('hex')
    .substring(0, 32);

  const bufProvided = Buffer.from(providedSig);
  const bufExpected = Buffer.from(expectedSig);
  if (bufProvided.length !== bufExpected.length) return false;

  try {
    return crypto.timingSafeEqual(bufProvided, bufExpected);
  } catch (err) {
    return false;
  }
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
      roomNumber,
      buildingName,
      subjectId,
      branch,
      section,
      academicYear,
      semester = 1,
      period = '1',
      qrRefreshInterval = 15,
      geofenceEnforced = true,
      batchId = null,
      timetableId = null,
      latitude,
      longitude,
      geofenceRadiusMeters = 30,
      capacity = 60
    } = req.body;

    // 1. Basic required fields validation
    const cleanRoomInput = (roomNumber || (!mongoose.Types.ObjectId.isValid(roomId) && roomId !== 'default_room' ? roomId : '') || '').trim();

    if ((!roomId && !cleanRoomInput) || (!subjectId && !req.body.subjectName) || !branch || !section || !academicYear) {
      return res.status(400).json({
        success: false,
        error: 'Missing required session fields: designated room/lab, subject, branch, section, and academicYear are mandatory.'
      });
    }

    if (roomId === 'default_room' && !cleanRoomInput) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid room number or select an existing classroom/lab.'
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
    let room = null;

    // A. Check if a valid ObjectId was supplied for roomId
    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findById(roomId);
      if (room) {
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
        if (!room.active) {
          return res.status(400).json({
            success: false,
            error: `Room ${room.buildingName} ${room.roomNumber} is currently marked inactive.`
          });
        }
      }
    }

    // B. If no room found by ObjectId or manual room number provided
    if (!room && cleanRoomInput) {
      const escaped = escapeRegex(cleanRoomInput);
      const matchingRooms = await Room.find({
        campusId: targetCampusId,
        active: true,
        $or: [
          { roomNumber: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          { roomNumber: cleanRoomInput }
        ]
      });

      if (matchingRooms.length === 1) {
        room = matchingRooms[0];
      } else if (matchingRooms.length > 1) {
        if (buildingName) {
          const buildingMatch = matchingRooms.find(r =>
            r.buildingName.toLowerCase() === buildingName.trim().toLowerCase()
          );
          if (buildingMatch) {
            room = buildingMatch;
          }
        }
        if (!room) {
          return res.status(400).json({
            success: false,
            error: `Multiple rooms match "${cleanRoomInput}". Please specify the building name or select a designated room.`
          });
        }
      } else {
        // No pre-existing Room document found for this campus.
        // Support manual room entry by safely creating a verified Room record scoped to the target campus.
        const bName = (buildingName || 'Main Academic Block').trim();
        const parsedLat = parseFloat(latitude);
        const parsedLng = parseFloat(longitude);
        const parsedRadius = parseFloat(geofenceRadiusMeters) || 30;
        const parsedCap = parseInt(capacity, 10) || 60;

        let finalLat = !isNaN(parsedLat) ? parsedLat : null;
        let finalLng = !isNaN(parsedLng) ? parsedLng : null;

        if (finalLat === null || finalLng === null) {
          const anyCampusRoom = await Room.findOne({ campusId: targetCampusId });
          if (anyCampusRoom) {
            finalLat = anyCampusRoom.latitude;
            finalLng = anyCampusRoom.longitude;
          } else {
            // Default institutional campus reference coordinates (Hyderabad campus: 17.5204, 78.3678)
            finalLat = 17.5204;
            finalLng = 78.3678;
          }
        }

        room = await Room.create({
          campusId: targetCampusId,
          buildingName: bName,
          roomNumber: cleanRoomInput,
          capacity: parsedCap,
          latitude: finalLat,
          longitude: finalLng,
          geofenceRadiusMeters: parsedRadius,
          active: true
        });
      }
    }

    if (!room) {
      return res.status(404).json({
        success: false,
        error: `Classroom/Lab "${cleanRoomInput || roomId || ''}" does not exist. Please provide a valid room number or select from campus rooms.`
      });
    }

    // 4. Verify Subject exists
    let subject = null;
    if (mongoose.Types.ObjectId.isValid(subjectId)) {
      subject = await Subject.findById(subjectId);
    } else {
      subject = await Subject.findOne({
        $or: [
          { code: new RegExp(`^${escapeRegex(subjectId)}$`, 'i') },
          { name: new RegExp(`^${escapeRegex(subjectId)}$`, 'i') }
        ]
      });
    }

    if (!subject && (req.body.subjectName || subjectId)) {
      const subName = (req.body.subjectName || subjectId).trim();
      const subCode = (req.body.subjectCode || subName.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'SUBJ').trim();
      try {
        subject = await Subject.create({
          name: subName,
          code: subCode,
          academicYear: academicYear || '4th Year',
          branch: branch || 'CSE',
          section: section || 'A',
          createdBy: user._id,
          isActive: true
        });
      } catch (_) {
        subject = await Subject.findOne({ isActive: true });
      }
    }

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Selected subject does not exist. Please select an assigned course/subject.'
      });
    }

    // 5. Faculty ManagedScopes & Teaching Authorization Verification
    // Super Admins and Campus Admins bypass individual teaching assignment check
    const isAdministrativeStaff = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN, ROLES.ADMINISTRATOR].includes(userRole);

    if (userRole === ROLES.FACULTY) {
      const managedScopes = Array.isArray(user.managedScopes) ? user.managedScopes : [];
      if (managedScopes.length > 0) {
        const hasTeachingAssignment = managedScopes.some((scope) => {
          const matchesYear = !scope.academicYear || scope.academicYear.trim().toLowerCase() === academicYear.trim().toLowerCase();
          const matchesBranch = !scope.branch || scope.branch.trim().toLowerCase() === branch.trim().toLowerCase();
          const matchesSection = !scope.section || scope.section.trim().toLowerCase() === section.trim().toLowerCase();
          const matchesSubject = !scope.subject || scope.subject.toString() === subject._id.toString();

          return matchesYear && matchesBranch && matchesSection && matchesSubject;
        });

        if (!hasTeachingAssignment && req.body.enforceStrictScope === true) {
          await logActivity({
            user,
            action: 'ATTENDANCE_REJECTED',
            category: 'Smart Attendance',
            description: `Unauthorized class start attempt: Faculty not assigned to ${branch} Section ${section} (${academicYear})`,
            details: { branch, section, academicYear, subjectId: subject._id },
            req
          });
          return res.status(403).json({
            success: false,
            error: `Unauthorized: You are not assigned to teach ${branch} Section ${section} (${academicYear}) for ${subject.name}.`
          });
        }
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

    // Faculty Facial Identity Verification Check
    const { faceVerificationToken } = req.body;
    let facultyFaceVerified = false;
    let facultyVerificationAudit = { verifiedAt: null, similarityScore: null, fallbackReason: null };

    if (user.biometricProfile && user.biometricProfile.isEnrolled) {
      if (!faceVerificationToken) {
        await logActivity({
          user,
          action: 'FACULTY_SESSION_BLOCKED',
          category: 'Smart Attendance',
          description: 'Session creation blocked: Faculty biometric face verification required',
          details: { reason: 'MISSING_BIOMETRIC_TOKEN' },
          req
        });
        return res.status(403).json({
          success: false,
          error: 'Biometric Face Verification is required for your account before launching an attendance session. Please complete facial verification.'
        });
      }

      const tokenCheck = verifyAndConsumeFaceToken(faceVerificationToken, user._id, 'FACULTY_SESSION_LAUNCH');
      if (!tokenCheck.valid) {
        await logActivity({
          user,
          action: 'FACULTY_SESSION_BLOCKED',
          category: 'Smart Attendance',
          description: `Session creation blocked: ${tokenCheck.error}`,
          details: { reason: 'INVALID_BIOMETRIC_TOKEN', error: tokenCheck.error },
          req
        });
        return res.status(403).json({
          success: false,
          error: tokenCheck.error || 'Biometric Face Verification failed or expired.'
        });
      }

      facultyFaceVerified = true;
      facultyVerificationAudit = {
        verifiedAt: new Date(),
        similarityScore: tokenCheck.payload.similarity || null,
        fallbackReason: null
      };
    } else {
      facultyFaceVerified = false;
      facultyVerificationAudit = {
        verifiedAt: null,
        similarityScore: null,
        fallbackReason: 'BIOMETRIC_NOT_ENROLLED_ALTERNATIVE'
      };
    }

    // 9. Create AttendanceSession document
    const departmentId = user.departmentId || room.departmentId || null;

    const session = await AttendanceSession.create({
      _id: sessionIdTemp,
      campusId: targetCampusId,
      departmentId: departmentId || targetCampusId, // fallback to campus reference if dept unset
      facultyFaceVerified,
      facultyVerificationAudit,
      branch,
      batchId,
      section,
      subjectId: subject._id,
      facultyId: user._id,
      roomId: room._id,
      timetableId,
      academicYear,
      semester,
      period,
      sessionDate: new Date(),
      actualStartTime: new Date(),
      status: 'ACTIVE',
      attendanceClosed: false,
      attendanceClosedAt: null,
      attendanceTimerMinutes: req.body.attendanceTimerMinutes ? parseInt(req.body.attendanceTimerMinutes, 10) : 10,
      lectureStatus: 'ATTENDANCE_SCANNING',
      qrSessionIdentifier: initialQr.token,
      qrExpiresAt: initialQr.expiresAt,
      previousQrIdentifier: null,
      previousQrExpiresAt: null,
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
    const sessionPayload = {
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
      attendanceClosed: session.attendanceClosed,
      attendanceClosedAt: session.attendanceClosedAt,
      attendanceTimerMinutes: session.attendanceTimerMinutes,
      lectureStatus: session.lectureStatus,
      academicYear: session.academicYear,
      period: session.period || '1',
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
    };

    return res.status(201).json({
      success: true,
      message: 'Attendance session initiated successfully',
      session: sessionPayload,
      data: sessionPayload
    });
  } catch (err) {
    console.error('Error creating attendance session:', err);
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: `Invalid identifier provided for ${err.path || 'field'}. Please verify your selection.`
      });
    }
    if (err.name === 'ValidationError') {
      const firstError = Object.values(err.errors || {})[0]?.message || 'Validation failed';
      return res.status(400).json({
        success: false,
        error: firstError
      });
    }
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
// @access  Faculty, Admin, Campus Admin, Director, Principal, Administrator, HOD, Auditor
exports.getActiveSessions = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    const query = { status: 'ACTIVE' };

    // Role-scoped visibility
    if (userRole === ROLES.FACULTY && req.query.all !== 'true' && !user.isFacultyCoordinator) {
      query.facultyId = user._id;
    } else if (userRole === ROLES.HOD && req.query.all !== 'true') {
      const dept = (user.department || user.branch || '').trim();
      if (dept) {
        query.branch = new RegExp(`^${escapeRegex(dept)}$`, 'i');
      }
      if (user.campusId) {
        query.campusId = user.campusId;
      }
    } else if (user.campusId && userRole !== ROLES.SUPER_ADMIN) {
      // Director, Principal, Administrator, Campus Admin, Auditor, Admin see campus-wide live classes
      query.campusId = user.campusId;
    }

    const sessions = await AttendanceSession.find(query)
      .populate('subjectId', 'name code')
      .populate('roomId', 'buildingName roomNumber floor capacity geofenceRadiusMeters')
      .populate('facultyId', 'name email designation phone')
      .sort({ actualStartTime: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
      data: sessions
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

    // If Faculty / Admin / HOD, enforce role scoping before returning full roster
    if (userRole === ROLES.FACULTY) {
      const isHost = session.facultyId && (
        (session.facultyId._id && session.facultyId._id.toString() === user._id.toString()) ||
        session.facultyId.toString() === user._id.toString()
      );
      const managed = Array.isArray(user.managedScopes) ? user.managedScopes : [];
      const hasTeachingScope = managed.some((m) => {
        const branchMatch = !m.branch ? true : (m.branch || '').toLowerCase() === (session.branch || '').toLowerCase();
        const secMatch = !m.section ? true : (m.section || '').toUpperCase() === (session.section || '').toUpperCase();
        return branchMatch && secMatch;
      });

      if (!isHost && !hasTeachingScope) {
        return res.status(403).json({
          success: false,
          error: 'Scope Restriction: Faculty can only view rosters for their assigned classes.'
        });
      }
    }

    if (userRole === ROLES.HOD) {
      const hodDept = (user.department || user.branch || '').toLowerCase();
      const sessBranch = (session.branch || '').toLowerCase();
      if (hodDept && sessBranch && hodDept !== sessBranch) {
        return res.status(403).json({
          success: false,
          error: `Department Isolation: HOD access is restricted to department '${user.branch || user.department}'.`
        });
      }
    }

    // Fetch roster records for authorized leadership / assigned instructor
    const records = await AttendanceRecord.find({ sessionId: session._id })
      .select('studentId rollNumber studentName status verificationMethod scannedAt markedAt isFlaggedForReview flagReason calculatedDistanceMeters locationVerificationStatus correctionStatus correctionRequestedStatus correctionReason correctionNotes originalStatus')
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

    // Archive previous token; ensure it is accepted for at most the 5-second grace window and rotation never extends its validity
    session.previousQrIdentifier = session.qrSessionIdentifier;
    if (session.qrExpiresAt) {
      const fiveSecondsFromNow = new Date(Date.now() + 5000);
      const originalExpiresAt = new Date(session.qrExpiresAt);
      session.previousQrExpiresAt = originalExpiresAt < fiveSecondsFromNow ? originalExpiresAt : fiveSecondsFromNow;
    } else {
      session.previousQrExpiresAt = new Date(Date.now() + 5000);
    }

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

    if (session.attendanceClosed || session.lectureStatus === 'LIVE_CLASS') {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: `Check-in rejected: Attendance closed by faculty (Live class in progress)`,
        details: { sessionId: session._id, reason: 'ATTENDANCE_CLOSED' },
        req
      });
      return res.status(400).json({
        success: false,
        error: 'Attendance check-in has been closed by the faculty. Live class is currently in progress.'
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

    // Verify token matches active current token or previous token within its 5s grace window
    const now = new Date();
    const isCurrentToken = token === session.qrSessionIdentifier;
    const isPreviousToken = Boolean(session.previousQrIdentifier && token === session.previousQrIdentifier);

    if (!isCurrentToken && !isPreviousToken) {
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

    // Verify token expiry against authoritative server clock
    if (isCurrentToken) {
      if (session.qrExpiresAt && now > new Date(session.qrExpiresAt)) {
        await logActivity({
          user: student,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: 'Expired current QR token scanned',
          details: { sessionId: session._id, expiresAt: session.qrExpiresAt, reason: 'EXPIRED_QR' },
          req
        });
        return res.status(400).json({
          success: false,
          error: 'Attendance QR has expired. Please scan the newly refreshed QR.'
        });
      }
    } else if (isPreviousToken) {
      if (session.previousQrExpiresAt && now > new Date(session.previousQrExpiresAt)) {
        await logActivity({
          user: student,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: 'Grace period expired for previous QR token',
          details: { sessionId: session._id, previousExpiresAt: session.previousQrExpiresAt, reason: 'GRACE_PERIOD_EXPIRED' },
          req
        });
        return res.status(400).json({
          success: false,
          error: 'Attendance QR has expired. The grace period for the previous code has ended. Please scan the current code displayed on screen.'
        });
      }
    }

    // Verify cryptographic HMAC signature against session secret nonce
    if (session.tokenNonce && !verifyQrTokenSignature(token, session._id.toString(), session.tokenNonce)) {
      await logActivity({
        user: student,
        action: 'ATTENDANCE_REJECTED',
        category: 'Smart Attendance',
        description: 'Forged or modified QR HMAC signature rejected',
        details: { sessionId: session._id, reason: 'INVALID_SIGNATURE' },
        req
      });
      return res.status(400).json({
        success: false,
        error: 'Attendance verification failed: Invalid QR security signature.'
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

    // 7.5. BIOMETRIC FACE VERIFICATION ENFORCEMENT
    const { faceVerificationToken } = req.body;
    let verificationMethod = 'QR_SCAN';
    let faceVerificationAudit = {
      verified: false,
      similarityScore: null,
      verifiedAt: null,
      fallbackReason: null
    };

    if (student.biometricProfile && student.biometricProfile.isEnrolled) {
      if (!faceVerificationToken) {
        await logActivity({
          user: student,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: 'Check-in rejected: Biometric face verification required for enrolled student',
          details: { sessionId: session._id, reason: 'MISSING_FACE_VERIFICATION' },
          req
        });
        return res.status(403).json({
          success: false,
          error: 'Biometric Face Verification is required for your account. Please complete facial verification before submitting attendance.'
        });
      }

      const tokenCheck = verifyAndConsumeFaceToken(faceVerificationToken, student._id, 'ATTENDANCE_CHECKIN');
      if (!tokenCheck.valid) {
        await logActivity({
          user: student,
          action: 'ATTENDANCE_REJECTED',
          category: 'Smart Attendance',
          description: `Check-in rejected: ${tokenCheck.error}`,
          details: { sessionId: session._id, reason: 'INVALID_FACE_TOKEN', error: tokenCheck.error },
          req
        });
        return res.status(403).json({
          success: false,
          error: tokenCheck.error || 'Biometric Face Verification expired or invalid. Please re-verify your face.'
        });
      }

      verificationMethod = 'FACE_AND_QR';
      faceVerificationAudit = {
        verified: true,
        similarityScore: tokenCheck.payload.similarity || null,
        verifiedAt: new Date(),
        fallbackReason: null
      };
    } else {
      // Non-enrolled students can mark attendance via QR+geofence with fallback audit trail
      verificationMethod = 'QR_SCAN';
      faceVerificationAudit = {
        verified: false,
        similarityScore: null,
        verifiedAt: null,
        fallbackReason: 'BIOMETRIC_NOT_ENROLLED_ALTERNATIVE'
      };
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
      verificationMethod,
      faceVerificationAudit,
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
// 6A. CLOSE ATTENDANCE WINDOW & TRANSITION TO LIVE CLASS
// ============================================================
// @route   POST /api/attendance/sessions/:id/close-attendance
// @access  Faculty, Admin
exports.closeAttendance = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const session = await AttendanceSession.findById(id)
      .populate('subjectId', 'name code')
      .populate('roomId', 'buildingName roomNumber floor capacity geofenceRadiusMeters')
      .populate('facultyId', 'name email designation phone');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Attendance session not found.'
      });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Cannot close attendance: Session is already ${session.status.toLowerCase()}.`
      });
    }

    const userRole = normalizeRole(user.role);
    const facultyIdStr = session.facultyId?._id ? session.facultyId._id.toString() : (session.facultyId ? session.facultyId.toString() : '');
    const isOwner = Boolean(facultyIdStr && facultyIdStr === user._id.toString());
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the session faculty or administrator can close attendance.'
      });
    }

    // Compute turnout so far
    const presentCount = await AttendanceRecord.countDocuments({
      sessionId: session._id,
      status: 'PRESENT'
    });
    const lateCount = await AttendanceRecord.countDocuments({
      sessionId: session._id,
      status: 'LATE'
    });
    const totalAbsent = Math.max(0, (session.totalEnrolled || 0) - (presentCount + lateCount));

    // Lock attendance scanning and transition to LIVE_CLASS
    session.attendanceClosed = true;
    session.attendanceClosedAt = new Date();
    session.lectureStatus = 'LIVE_CLASS';
    session.totalPresent = presentCount;
    session.totalLate = lateCount;
    session.totalAbsent = totalAbsent;
    session.qrExpiresAt = new Date();
    session.previousQrExpiresAt = new Date();
    await session.save();

    // Broadcast session update to socket room and campus
    const io = req.app?.get ? (req.app.get('socketio') || req.app.get('io')) : null;
    if (io) {
      io.to(`attendance_session_${session._id}`).emit('attendance_closed_live_started', {
        sessionId: session._id,
        attendanceClosed: true,
        attendanceClosedAt: session.attendanceClosedAt,
        lectureStatus: 'LIVE_CLASS',
        totalPresent: session.totalPresent,
        totalEnrolled: session.totalEnrolled
      });
      io.emit('campus_attendance_updated', {
        sessionId: session._id,
        status: session.status,
        attendanceClosed: true,
        lectureStatus: 'LIVE_CLASS',
        totalPresent: session.totalPresent
      });
    }

    await logActivity({
      user,
      action: 'ATTENDANCE_WINDOW_CLOSED',
      category: 'Smart Attendance',
      description: `Faculty closed attendance for ${session.branch} - Sec ${session.section}. Class is now officially LIVE.`,
      details: {
        sessionId: session._id,
        totalPresent: session.totalPresent,
        totalEnrolled: session.totalEnrolled
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance closed. Class is now officially LIVE.',
      session
    });
  } catch (err) {
    console.error('Error closing attendance window:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to close attendance: ' + err.message
    });
  }
};

// ============================================================
// 6B. CLOSE / FINALIZE ATTENDANCE SESSION
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

    if (session.status === 'SUBMITTED') {
      return res.status(200).json({
        success: true,
        message: 'Attendance session has already been submitted and is currently in its 10-minute rectification period.',
        rectificationExpiresAt: session.rectificationExpiresAt,
        session
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

    // Start 10-minute rectification period (Requirement B.1)
    const now = new Date();
    const rectificationExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    session.status = 'SUBMITTED';
    session.attendanceClosed = true;
    session.lectureStatus = 'LIVE_CLASS';
    session.submittedAt = now;
    session.submittedBy = user._id;
    session.rectificationExpiresAt = rectificationExpiresAt;
    session.rectificationFinalized = false;
    session.absenceAlertsDispatched = false;
    session.actualEndTime = now;
    session.totalPresent = presentCount;
    session.totalLate = lateCount;
    session.totalAbsent = totalAbsent;
    session.qrExpiresAt = now; // Immediately expire active QR
    session.previousQrExpiresAt = now; // Immediately expire previous QR grace window
    await session.save();

    // Broadcast session submitted & rectification started to room
    const io = req.app.get('socketio') || req.app.get('io');
    if (io) {
      io.to(`attendance_session_${session._id}`).emit('session_submitted_rectification_started', {
        sessionId: session._id,
        status: 'SUBMITTED',
        rectificationExpiresAt,
        totalEnrolled: session.totalEnrolled,
        totalPresent: session.totalPresent,
        totalAbsent: session.totalAbsent
      });
    }

    await logActivity({
      user,
      action: 'ATTENDANCE_SESSION_SUBMITTED_RECTIFICATION_ACTIVE',
      category: 'Smart Attendance',
      description: `Submitted attendance session for ${session.branch} - Sec ${session.section}. 10-minute rectification period active until ${rectificationExpiresAt.toISOString()}`,
      details: {
        sessionId: session._id,
        totalEnrolled: session.totalEnrolled,
        totalPresent: presentCount,
        totalAbsent,
        rectificationExpiresAt
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance submitted. A 10-minute rectification window has started. Corrections may be applied before finalization.',
      rectificationExpiresAt,
      rectificationMinutes: 10,
      summary: {
        sessionId: session._id,
        status: session.status,
        actualStartTime: session.actualStartTime,
        actualEndTime: session.actualEndTime,
        totalEnrolled: session.totalEnrolled,
        totalPresent: session.totalPresent,
        totalAbsent: session.totalAbsent,
        rectificationExpiresAt,
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
// 6C. FINALIZE SESSION RECTIFICATION & DISPATCH CLASS-ABSENCE ALERTS
// ============================================================
// @route   POST /api/attendance/sessions/:id/finalize-rectification
// @access  Faculty, Admin
exports.finalizeSessionRectification = async (req, res) => {
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

    const userRole = normalizeRole(user.role);
    const isOwner = session.facultyId.toString() === user._id.toString();
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only the session host or administrator can finalize this session.'
      });
    }

    if (session.status === 'FINALIZED') {
      return res.status(200).json({
        success: true,
        alreadyFinalized: true,
        message: 'Attendance session has already been finalized.',
        session
      });
    }

    if (session.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        error: `Session is currently ${session.status.toLowerCase()}. Only submitted sessions can be finalized.`
      });
    }

    const now = new Date();
    const isExpired = session.rectificationExpiresAt && now >= new Date(session.rectificationExpiresAt);
    const allowForce = req.body && req.body.force === true;

    if (!isExpired && !allowForce && !isAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Rectification period is still active. Finalization will occur automatically once the 10-minute window expires.',
        rectificationExpiresAt: session.rectificationExpiresAt
      });
    }

    if (typeof finalizeSubmittedSession !== 'function') {
      return res.status(503).json({
        success: false,
        error: 'Attendance notification and finalization service is currently unavailable.'
      });
    }

    const io = req.app.get('socketio') || req.app.get('io');
    const result = await finalizeSubmittedSession(session._id, io);

    return res.status(200).json({
      success: true,
      message: 'Attendance session successfully finalized after rectification.',
      result
    });
  } catch (err) {
    console.error('Error finalizing session rectification:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to finalize session rectification: ' + err.message
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
      rooms,
      data: rooms
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
        correctionRequestedStatus: r.correctionRequestedStatus || null,
        correctionReason: r.correctionReason || '',
        correctionNotes: r.correctionNotes || '',
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

    const sanitizeCsv = (val) => {
      let str = String(val === null || val === undefined ? '' : val).trim();
      if (/^[=+\-@\t\r%]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Student Name', 'Roll Number', 'Branch', 'Section', 'Subject', 'Attendance Percentage', 'Present', 'Total', 'Shortage'];
    const rows = shortageList.map(s => [
      sanitizeCsv(s.studentName),
      sanitizeCsv(s.rollNumber),
      sanitizeCsv(s.branch),
      sanitizeCsv(s.section),
      sanitizeCsv(s.subjectName),
      sanitizeCsv(`${s.attendancePercentage}%`),
      sanitizeCsv(s.present),
      sanitizeCsv(s.total),
      sanitizeCsv('YES')
    ]);

    const csvContent = [headers.map(sanitizeCsv).join(','), ...rows.map(r => r.join(','))].join('\r\n');

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

    // 10-Minute Rectification Window handling (Requirement B.2)
    const isWithinRectification = session.status === 'SUBMITTED' && session.rectificationExpiresAt && (Date.now() < new Date(session.rectificationExpiresAt).getTime());
    const isSessionHost = session.facultyId.toString() === user._id.toString();

    if (isWithinRectification && (isSessionHost || [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN, ROLES.HOD].includes(userRole))) {
      const targetStatus = requestedStatus || req.body.status || 'PRESENT';
      if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(targetStatus)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid status (PRESENT, ABSENT, LATE, EXCUSED).'
        });
      }

      const prevStatus = record.status;
      record.originalStatus = record.originalStatus || prevStatus;
      record.status = targetStatus;
      record.correctionStatus = 'APPROVED';
      record.correctionReason = (reason || 'Rectified during 10-minute rectification window').trim();
      record.correctionNotes = (notes || '').trim();
      record.correctionReviewedBy = user._id;
      record.correctionReviewedAt = new Date();
      await record.save();

      // Adjust session counters safely
      if (prevStatus === 'ABSENT' && (targetStatus === 'PRESENT' || targetStatus === 'LATE')) {
        session.totalPresent = (session.totalPresent || 0) + 1;
        session.totalAbsent = Math.max(0, (session.totalAbsent || 0) - 1);
        await session.save();
      } else if ((prevStatus === 'PRESENT' || prevStatus === 'LATE') && targetStatus === 'ABSENT') {
        session.totalPresent = Math.max(0, (session.totalPresent || 0) - 1);
        session.totalAbsent = (session.totalAbsent || 0) + 1;
        await session.save();
      }

      await logActivity({
        user,
        action: 'ATTENDANCE_RECTIFICATION_APPLIED',
        category: 'Smart Attendance',
        description: `Rectification applied during 10-minute window for ${record.studentName} (${record.rollNumber}) to ${targetStatus}`,
        details: { recordId: record._id, sessionId: session._id, previousStatus: prevStatus, newStatus: targetStatus },
        req
      });

      return res.status(200).json({
        success: true,
        message: 'Attendance successfully rectified during the 10-minute rectification window.',
        record
      });
    }

    // Review Workflow (Approve / Reject)
    if (action === 'APPROVE' || action === 'REJECT') {
      if (userRole === ROLES.FACULTY) {
        return res.status(403).json({
          success: false,
          error: 'Dual-Control Policy: Faculty instructors cannot review or approve attendance corrections. HOD or Administrator review required.'
        });
      }

      if (userRole === ROLES.HOD) {
        const dept = (user.department || user.branch || '').toLowerCase();
        const sessBranch = (session.branch || '').toLowerCase();
        if (dept && sessBranch && dept !== sessBranch) {
          return res.status(403).json({
            success: false,
            error: `Department Isolation: HOD can only review corrections within department '${user.branch || user.department}'.`
          });
        }
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
    if (userRole === ROLES.FACULTY) {
      const isSessionHost = session.facultyId.toString() === user._id.toString();
      const hasManagedScope = user.managedScopes && user.managedScopes.some(s =>
        (!s.branch || s.branch.toUpperCase() === (session.branch || '').toUpperCase()) &&
        (!s.section || s.section.toUpperCase() === (session.section || '').toUpperCase())
      );
      if (!isSessionHost && !hasManagedScope) {
        return res.status(403).json({
          success: false,
          error: 'Scope Restriction: Faculty can only request attendance corrections for their assigned classes.'
        });
      }
    }

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

    if ([ROLES.STUDENT, ROLES.RECRUITER, ROLES.FACULTY].includes(userRole)) {
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

      if (branchSectionConditions.length === 0) {
        filter.user = { $in: [] };
      } else {
        let studentQuery = { role: 'student', $or: branchSectionConditions };
        if (user.campusId) studentQuery.campusId = user.campusId;

        const authorizedStudents = await User.find(studentQuery).select('_id');
        const studentIds = authorizedStudents.map(s => s._id);
        filter.user = { $in: studentIds };
      }
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

// ============================================================
// 17. GET AUTHORITATIVE CAMPUS ARRIVAL GEOFENCE STATUS
// ============================================================
// @route   GET /api/attendance/campus-arrival/config
// @route   GET /api/attendance/campus-arrival/config/:campusId
// @access  Authenticated Students / Staff (PERMISSIONS.ATTENDANCE_VIEW)
exports.getCampusArrivalConfig = async (req, res) => {
  try {
    const user = req.user;
    const requestedCampusId = req.params.campusId || req.query.campusId;

    // Check if an administrative user is requesting configuration for a specific campus
    const userRole = normalizeRole(user.role);
    const hasAdminView = hasRolePermission(user.role, PERMISSIONS.CAMPUS_VIEW) ||
      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN].includes(userRole);

    let targetCampusId = user?.campusId || user?.campus;
    if (requestedCampusId && hasAdminView) {
      if (!canAccessCampus(user, requestedCampusId)) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: You cannot inspect configuration of another campus.'
        });
      }
      targetCampusId = requestedCampusId;
    }

    if (!targetCampusId) {
      return res.status(200).json({
        success: true,
        configured: false,
        completenessStatus: 'INCOMPLETE',
        message: 'No campus is associated with your account.'
      });
    }

    const campus = await Campus.findById(targetCampusId);
    if (!campus || !campus.isActive) {
      return res.status(200).json({
        success: true,
        configured: false,
        completenessStatus: 'INCOMPLETE',
        message: 'Assigned campus was not found or is currently inactive.'
      });
    }

    const hasValidCoords =
      typeof campus.latitude === 'number' && Number.isFinite(campus.latitude) && Math.abs(campus.latitude) <= 90 &&
      typeof campus.longitude === 'number' && Number.isFinite(campus.longitude) && Math.abs(campus.longitude) <= 180;
    const hasValidRadius =
      typeof campus.arrivalPerimeterRadiusMeters === 'number' && Number.isFinite(campus.arrivalPerimeterRadiusMeters) && campus.arrivalPerimeterRadiusMeters >= 5 && campus.arrivalPerimeterRadiusMeters <= 5000;

    let completenessStatus = 'INCOMPLETE';
    if (hasValidCoords && hasValidRadius) {
      completenessStatus = 'COMPLETE';
    } else if (
      (campus.latitude !== null && (Math.abs(campus.latitude) > 90 || !Number.isFinite(campus.latitude))) ||
      (campus.longitude !== null && (Math.abs(campus.longitude) > 180 || !Number.isFinite(campus.longitude))) ||
      (campus.arrivalPerimeterRadiusMeters !== null && (campus.arrivalPerimeterRadiusMeters < 5 || campus.arrivalPerimeterRadiusMeters > 5000))
    ) {
      completenessStatus = 'INVALID';
    }

    const isFullyConfigured = hasValidCoords && hasValidRadius;

    // For authorized administrators with CAMPUS_UPDATE or admin roles, expose authoritative coordinates and status
    const hasAdminUpdate = hasRolePermission(user.role, PERMISSIONS.CAMPUS_UPDATE) ||
      [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CAMPUS_ADMIN].includes(userRole);

    if (hasAdminUpdate) {
      return res.status(200).json({
        success: true,
        configured: isFullyConfigured,
        completenessStatus,
        campusId: campus._id,
        campusName: campus.name,
        campusCode: campus.code,
        latitude: campus.latitude,
        longitude: campus.longitude,
        arrivalPerimeterRadiusMeters: campus.arrivalPerimeterRadiusMeters,
        arrivalCutoffTime: campus.arrivalCutoffTime || '10:00',
        absenceEvaluationTime: campus.absenceEvaluationTime || '10:30',
        timezone: campus.timezone || 'Asia/Kolkata',
        campusCoordinatesExposed: true
      });
    }

    if (!isFullyConfigured) {
      return res.status(200).json({
        success: true,
        configured: false,
        completenessStatus,
        campusName: campus.name,
        arrivalCutoffTime: campus.arrivalCutoffTime || '10:00',
        absenceEvaluationTime: campus.absenceEvaluationTime || '10:30',
        timezone: campus.timezone || 'Asia/Kolkata',
        message: 'Campus arrival geofence perimeter is not configured on the server for this campus.'
      });
    }

    // Return institutional status and boundary radius without exposing exact coordinates to students
    return res.status(200).json({
      success: true,
      configured: true,
      completenessStatus,
      campusName: campus.name,
      arrivalPerimeterRadiusMeters: campus.arrivalPerimeterRadiusMeters,
      arrivalCutoffTime: campus.arrivalCutoffTime || '10:00',
      absenceEvaluationTime: campus.absenceEvaluationTime || '10:30',
      timezone: campus.timezone || 'Asia/Kolkata',
      campusCoordinatesExposed: false
    });
  } catch (err) {
    console.error('Error fetching campus arrival config:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve campus configuration.'
    });
  }
};

// ============================================================
// 17B. CONFIGURE CAMPUS ARRIVAL GEOFENCE BOUNDARIES (ADMINISTRATIVE)
// ============================================================
// @route   PUT /api/attendance/campus-arrival/config/:campusId
// @access  Authorized Administrators (PERMISSIONS.CAMPUS_UPDATE)
exports.updateCampusArrivalConfig = async (req, res) => {
  try {
    const user = req.user;
    const { campusId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(campusId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campus identifier provided.'
      });
    }

    // Authoritative campus-level scope enforcement
    if (!canAccessCampus(user, campusId)) {
      await logActivity({
        user,
        action: 'CAMPUS_GEOFENCE_CONFIG_REJECTED',
        category: 'Campus Management',
        description: `Unauthorized cross-campus geofence configuration attempt on campus ${campusId}`,
        details: { targetCampusId: campusId, reason: 'CROSS_CAMPUS_FORBIDDEN' },
        req
      });
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: You cannot configure geofencing for another campus.'
      });
    }

    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(404).json({
        success: false,
        error: 'Campus record not found.'
      });
    }

    const { latitude, longitude, arrivalPerimeterRadiusMeters } = req.body;

    // Resetting/Clearing values if explicitly null
    const isClearing = latitude === null && longitude === null && arrivalPerimeterRadiusMeters === null;

    if (!isClearing) {
      const parsedLat = parseFloat(latitude);
      const parsedLng = parseFloat(longitude);
      const parsedRadius = parseFloat(arrivalPerimeterRadiusMeters);

      if (isNaN(parsedLat) || !Number.isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        return res.status(400).json({
          success: false,
          completenessStatus: 'INVALID',
          error: 'Latitude must be a valid number between -90 and 90 degrees.'
        });
      }

      if (isNaN(parsedLng) || !Number.isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        return res.status(400).json({
          success: false,
          completenessStatus: 'INVALID',
          error: 'Longitude must be a valid number between -180 and 180 degrees.'
        });
      }

      if (isNaN(parsedRadius) || !Number.isFinite(parsedRadius) || parsedRadius < 5 || parsedRadius > 5000) {
        return res.status(400).json({
          success: false,
          completenessStatus: 'INVALID',
          error: 'Arrival perimeter radius must be a sensible value between 5 and 5000 meters.'
        });
      }

      campus.latitude = Math.round(parsedLat * 1e7) / 1e7;
      campus.longitude = Math.round(parsedLng * 1e7) / 1e7;
      campus.arrivalPerimeterRadiusMeters = Math.round(parsedRadius);
    } else {
      campus.latitude = null;
      campus.longitude = null;
      campus.arrivalPerimeterRadiusMeters = null;
    }

    // Optional campus arrival timing configurations
    if (typeof req.body.arrivalCutoffTime === 'string' && req.body.arrivalCutoffTime.trim()) {
      campus.arrivalCutoffTime = req.body.arrivalCutoffTime.trim();
    }
    if (typeof req.body.absenceEvaluationTime === 'string' && req.body.absenceEvaluationTime.trim()) {
      campus.absenceEvaluationTime = req.body.absenceEvaluationTime.trim();
    }
    if (typeof req.body.timezone === 'string' && req.body.timezone.trim()) {
      campus.timezone = req.body.timezone.trim();
    }

    await campus.save();

    const isComplete =
      typeof campus.latitude === 'number' && Number.isFinite(campus.latitude) &&
      typeof campus.longitude === 'number' && Number.isFinite(campus.longitude) &&
      typeof campus.arrivalPerimeterRadiusMeters === 'number' && campus.arrivalPerimeterRadiusMeters >= 5;

    const completenessStatus = isComplete ? 'COMPLETE' : 'INCOMPLETE';

    await logActivity({
      user,
      action: 'CAMPUS_GEOFENCE_CONFIG_UPDATED',
      category: 'Campus Management',
      description: `Updated arrival geofence for ${campus.name} (Status: ${completenessStatus}, Radius: ${campus.arrivalPerimeterRadiusMeters}m, Cutoff: ${campus.arrivalCutoffTime || '10:00'})`,
      details: {
        campusId: campus._id,
        campusName: campus.name,
        latitude: campus.latitude,
        longitude: campus.longitude,
        arrivalPerimeterRadiusMeters: campus.arrivalPerimeterRadiusMeters,
        arrivalCutoffTime: campus.arrivalCutoffTime,
        absenceEvaluationTime: campus.absenceEvaluationTime,
        timezone: campus.timezone,
        completenessStatus
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Campus arrival geofence configuration updated successfully.',
      configured: isComplete,
      completenessStatus,
      campus: {
        id: campus._id,
        name: campus.name,
        code: campus.code,
        latitude: campus.latitude,
        longitude: campus.longitude,
        arrivalPerimeterRadiusMeters: campus.arrivalPerimeterRadiusMeters,
        arrivalCutoffTime: campus.arrivalCutoffTime || '10:00',
        absenceEvaluationTime: campus.absenceEvaluationTime || '10:30',
        timezone: campus.timezone || 'Asia/Kolkata'
      }
    });
  } catch (err) {
    console.error('Error updating campus geofence config:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update campus geofence configuration.'
    });
  }
};

// ============================================================
// 18. VERIFY & RECORD CAMPUS ARRIVAL (INDEPENDENT FROM CLASSROOM)
// ============================================================
// @route   POST /api/attendance/campus-arrival
// @access  Authenticated Students / Staff (PERMISSIONS.ATTENDANCE_VIEW)
exports.recordCampusArrival = async (req, res) => {
  try {
    const user = req.user;
    const { latitude, longitude, accuracy } = req.body;
    const userCampusId = user?.campusId || user?.campus;

    // 1. Resolve user's permitted campus from authoritative session context
    if (!userCampusId) {
      await logActivity({
        user,
        action: 'CAMPUS_ARRIVAL_REJECTED',
        category: 'Smart Attendance',
        description: 'Check-in rejected: No campus associated with user account',
        details: { reason: 'UNASSIGNED_CAMPUS' },
        req
      });
      return res.status(400).json({
        success: false,
        error: 'No campus is associated with your account. Campus arrival check-in requires an assigned campus.'
      });
    }

    // 2. Load authoritative campus configuration from database
    const campus = await Campus.findById(userCampusId);
    if (!campus || !campus.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Assigned campus was not found or is currently inactive.'
      });
    }

    // 3. Verify server-configured geofence bounds
    const hasValidCoords =
      typeof campus.latitude === 'number' && Number.isFinite(campus.latitude) && Math.abs(campus.latitude) <= 90 &&
      typeof campus.longitude === 'number' && Number.isFinite(campus.longitude) && Math.abs(campus.longitude) <= 180;
    const hasValidRadius =
      typeof campus.arrivalPerimeterRadiusMeters === 'number' && Number.isFinite(campus.arrivalPerimeterRadiusMeters) && campus.arrivalPerimeterRadiusMeters > 0;

    if (!hasValidCoords || !hasValidRadius) {
      return res.status(400).json({
        success: false,
        error: 'Campus geofence perimeter is not configured on the server for your assigned campus. Campus arrival check-in is unavailable.'
      });
    }

    // 4. Validate submitted location telemetry
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);
    const parsedAccuracy = parseFloat(accuracy);

    if (
      isNaN(parsedLat) || isNaN(parsedLng) ||
      !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng) ||
      Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180
    ) {
      return res.status(400).json({
        success: false,
        error: 'Valid geographic coordinates (latitude -90 to 90, longitude -180 to 180) are required.'
      });
    }

    // Accuracy policy: Maximum acceptable error threshold
    const maxAllowedAccuracyMeters = Math.min(100, Math.max(50, campus.arrivalPerimeterRadiusMeters * 0.25));
    if (isNaN(parsedAccuracy) || parsedAccuracy <= 0 || parsedAccuracy > maxAllowedAccuracyMeters) {
      await logActivity({
        user,
        action: 'CAMPUS_ARRIVAL_REJECTED',
        category: 'Smart Attendance',
        description: `Location rejected due to poor accuracy (±${Math.round(parsedAccuracy || 0)}m vs max ±${Math.round(maxAllowedAccuracyMeters)}m)`,
        details: { accuracy: parsedAccuracy, maxAllowed: maxAllowedAccuracyMeters, reason: 'LOW_ACCURACY' },
        req
      });
      return res.status(400).json({
        success: false,
        error: `Location accuracy is insufficient (±${Math.round(parsedAccuracy || 0)}m). Minimum required: ±${Math.round(maxAllowedAccuracyMeters)}m. Please ensure high-accuracy GPS is enabled with a clear sky view.`
      });
    }

    // 5. Authoritative server distance calculation
    const distanceMeters = calculateDistanceMeters(parsedLat, parsedLng, campus.latitude, campus.longitude);

    // 6. Perimeter boundary enforcement
    if (distanceMeters > campus.arrivalPerimeterRadiusMeters) {
      await logActivity({
        user,
        action: 'CAMPUS_ARRIVAL_REJECTED',
        category: 'Smart Attendance',
        description: `Student outside campus perimeter (${distanceMeters}m > ${campus.arrivalPerimeterRadiusMeters}m boundary)`,
        details: {
          campusId: campus._id,
          distanceMeters,
          radiusLimit: campus.arrivalPerimeterRadiusMeters,
          reason: 'OUTSIDE_PERIMETER'
        },
        req
      });
      return res.status(400).json({
        success: false,
        error: `Perimeter boundary discrepancy: Device is ${Math.round(distanceMeters)}m from the campus entrance. Campus arrival check-in is restricted to the ${campus.arrivalPerimeterRadiusMeters}m campus boundary.`
      });
    }

    // 6.5. Biometric Face Verification Check
    const { faceVerificationToken } = req.body;
    let arrivalVerificationMethod = 'DEVICE_GEOFENCE_PERIMETER';
    let arrivalFaceAudit = {
      verified: false,
      similarityScore: null,
      verifiedAt: null,
      fallbackReason: null
    };

    if (user.biometricProfile && user.biometricProfile.isEnrolled) {
      if (!faceVerificationToken) {
        await logActivity({
          user,
          action: 'CAMPUS_ARRIVAL_REJECTED',
          category: 'Smart Attendance',
          description: 'Campus arrival rejected: Biometric face verification required for enrolled student',
          details: { reason: 'MISSING_FACE_VERIFICATION' },
          req
        });
        return res.status(403).json({
          success: false,
          error: 'Biometric Face Verification is required for your account before campus arrival check-in. Please complete facial verification.'
        });
      }

      const tokenCheck = verifyAndConsumeFaceToken(faceVerificationToken, user._id, 'CAMPUS_ARRIVAL');
      if (!tokenCheck.valid) {
        await logActivity({
          user,
          action: 'CAMPUS_ARRIVAL_REJECTED',
          category: 'Smart Attendance',
          description: `Campus arrival rejected: ${tokenCheck.error}`,
          details: { reason: 'INVALID_FACE_TOKEN', error: tokenCheck.error },
          req
        });
        return res.status(403).json({
          success: false,
          error: tokenCheck.error || 'Biometric Face Verification expired or invalid. Please re-verify your face.'
        });
      }

      arrivalVerificationMethod = 'FACE_RECOGNITION_PERIMETER';
      arrivalFaceAudit = {
        verified: true,
        similarityScore: tokenCheck.payload.similarity || null,
        verifiedAt: new Date(),
        fallbackReason: null
      };
    } else {
      arrivalVerificationMethod = 'DEVICE_GEOFENCE_PERIMETER';
      arrivalFaceAudit = {
        verified: false,
        similarityScore: null,
        verifiedAt: null,
        fallbackReason: 'BIOMETRIC_NOT_ENROLLED_ALTERNATIVE'
      };
    }

    // 7. Duplicate Prevention Policy: One verified arrival log per student per calendar date (IST)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowUtc = new Date();
    const istDate = new Date(nowUtc.getTime() + IST_OFFSET_MS);
    const arrivalDateKey = istDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const checkInTimeIST = istDate.toISOString().slice(11, 16); // 'HH:MM'
    const cutoffTime = campus.arrivalCutoffTime || '10:00';
    const isLate = checkInTimeIST > cutoffTime;
    const punctuality = isLate ? 'LATE' : 'ON_TIME';

    const existingArrivalToday = await CampusCheckInLog.findOne({
      user: user._id,
      campus: campus._id,
      arrivalDateKey
    });

    if (existingArrivalToday) {
      if (existingArrivalToday.status === 'VERIFIED') {
        return res.status(200).json({
          success: true,
          alreadyCheckedIn: true,
          message: 'Campus arrival has already been verified for today.',
          checkIn: {
            id: existingArrivalToday._id,
            referenceCode: existingArrivalToday.referenceCode,
            timestamp: existingArrivalToday.timestamp,
            status: existingArrivalToday.status,
            punctuality: existingArrivalToday.punctuality || 'ON_TIME',
            distanceMeters: existingArrivalToday.calculatedDistanceMeters,
            campusName: campus.name
          }
        });
      }
      if (existingArrivalToday.status === 'PENDING_REVIEW') {
        return res.status(200).json({
          success: true,
          pendingReview: true,
          message: 'A campus arrival assistance request is currently pending administrative review.',
          checkIn: {
            id: existingArrivalToday._id,
            referenceCode: existingArrivalToday.referenceCode,
            timestamp: existingArrivalToday.timestamp,
            status: existingArrivalToday.status,
            campusName: campus.name
          }
        });
      }

      // If prior log was ABSENT (evaluated absent earlier in the day), update to VERIFIED & LATE and supersede (Requirement A.7)
      const wasPriorAbsent = existingArrivalToday.status === 'ABSENT';

      existingArrivalToday.timestamp = nowUtc;
      existingArrivalToday.latitude = parsedLat;
      existingArrivalToday.longitude = parsedLng;
      existingArrivalToday.accuracy = parsedAccuracy;
      existingArrivalToday.calculatedDistanceMeters = distanceMeters;
      existingArrivalToday.configuredPerimeterRadiusMeters = campus.arrivalPerimeterRadiusMeters;
      existingArrivalToday.status = 'VERIFIED';
      existingArrivalToday.punctuality = wasPriorAbsent ? 'LATE' : punctuality;
      existingArrivalToday.verificationMethod = arrivalVerificationMethod;
      existingArrivalToday.faceVerificationAudit = arrivalFaceAudit;
      existingArrivalToday.ipAddress = extractClientIp(req);
      existingArrivalToday.userAgent = extractUserAgent(req);

      if (wasPriorAbsent) {
        existingArrivalToday.absenceAlertSuperseded = true;
        existingArrivalToday.absenceAlertSupersededAt = nowUtc;
      }

      await existingArrivalToday.save();

      // Dispatch appropriate WhatsApp notification
      if (wasPriorAbsent) {
        // Send superseding late arrival notice to parent without duplicate or misleading alerts (Requirement A.7)
        if (typeof sendCampusArrivalUpdateAlert === 'function') {
          sendCampusArrivalUpdateAlert({
            student: user,
            campus,
            checkInLog: existingArrivalToday
          }).catch(alertErr => {
            console.warn('[AttendanceNotification] Campus arrival update alert warning:', alertErr.message);
          });
        }
      } else if (existingArrivalToday.punctuality === 'LATE') {
        // Send late arrival notice
        if (typeof sendCampusLateArrivalAlert === 'function') {
          sendCampusLateArrivalAlert({
            student: user,
            campus,
            checkInLog: existingArrivalToday
          }).catch(alertErr => {
            console.warn('[AttendanceNotification] Campus late arrival alert warning:', alertErr.message);
          });
        }
      }

      await logActivity({
        user,
        action: 'CAMPUS_ARRIVAL_VERIFIED',
        category: 'Smart Attendance',
        description: `Campus arrival verified for ${user.name} at ${campus.name} (Punctuality: ${existingArrivalToday.punctuality}${wasPriorAbsent ? ' - Superseded prior absence' : ''})`,
        details: {
          campusId: campus._id,
          campusName: campus.name,
          referenceCode: existingArrivalToday.referenceCode,
          distanceMeters,
          status: 'VERIFIED',
          punctuality: existingArrivalToday.punctuality,
          cutoffTime,
          checkInTimeIST
        },
        req
      });

      return res.status(200).json({
        success: true,
        message: existingArrivalToday.punctuality === 'LATE'
          ? `Campus arrival verified. Recorded as LATE (check-in at ${checkInTimeIST} after ${cutoffTime} cutoff).`
          : 'Campus arrival successfully verified on time!',
        checkIn: {
          id: existingArrivalToday._id,
          referenceCode: existingArrivalToday.referenceCode,
          timestamp: existingArrivalToday.timestamp,
          status: existingArrivalToday.status,
          punctuality: existingArrivalToday.punctuality,
          isLate: existingArrivalToday.punctuality === 'LATE',
          distanceMeters,
          campusName: campus.name
        }
      });
    }

    // 8. Persist to CampusCheckInLog (does NOT touch AttendanceRecord or AttendanceSession)
    const referenceCode = `CB-ARR-${arrivalDateKey.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const logRecord = await CampusCheckInLog.create({
      user: user._id,
      campus: campus._id,
      timestamp: nowUtc,
      arrivalDateKey,
      latitude: parsedLat,
      longitude: parsedLng,
      accuracy: parsedAccuracy,
      calculatedDistanceMeters: distanceMeters,
      configuredPerimeterRadiusMeters: campus.arrivalPerimeterRadiusMeters,
      status: 'VERIFIED',
      punctuality,
      verificationMethod: arrivalVerificationMethod,
      faceVerificationAudit: arrivalFaceAudit,
      ipAddress: extractClientIp(req),
      userAgent: extractUserAgent(req),
      referenceCode
    });

    // If check-in after cutoff, dispatch WhatsApp alert to parent/guardian (Requirement A.4)
    if (punctuality === 'LATE' && typeof sendCampusLateArrivalAlert === 'function') {
      sendCampusLateArrivalAlert({
        student: user,
        campus,
        checkInLog: logRecord
      }).catch(alertErr => {
        console.warn('[AttendanceNotification] Campus late arrival alert warning:', alertErr.message);
      });
    }

    // 9. Compliance audit event
    await logActivity({
      user,
      action: 'CAMPUS_ARRIVAL_VERIFIED',
      category: 'Smart Attendance',
      description: `Campus arrival verified for ${user.name} at ${campus.name} (Punctuality: ${punctuality})`,
      details: {
        campusId: campus._id,
        campusName: campus.name,
        referenceCode,
        distanceMeters,
        status: 'VERIFIED',
        punctuality,
        cutoffTime,
        checkInTimeIST
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: punctuality === 'LATE'
        ? `Campus arrival verified. Recorded as LATE (check-in at ${checkInTimeIST} after ${cutoffTime} cutoff). Parent notified.`
        : 'Campus arrival successfully verified on time!',
      checkIn: {
        id: logRecord._id,
        referenceCode,
        timestamp: logRecord.timestamp,
        status: logRecord.status,
        punctuality: logRecord.punctuality,
        isLate,
        cutoffTime,
        distanceMeters,
        campusName: campus.name
      }
    });
  } catch (err) {
    // Atomic race condition handling: Concurrent requests colliding on unique index
    if (err.code === 11000) {
      try {
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(Date.now() + IST_OFFSET_MS);
        const arrivalDateKey = istDate.toISOString().slice(0, 10);
        const raceRecord = await CampusCheckInLog.findOne({
          user: req.user?._id,
          arrivalDateKey,
          status: 'VERIFIED'
        });
        if (raceRecord) {
          return res.status(200).json({
            success: true,
            alreadyCheckedIn: true,
            message: 'Campus arrival has already been verified for today.',
            checkIn: {
              id: raceRecord._id,
              referenceCode: raceRecord.referenceCode,
              timestamp: raceRecord.timestamp,
              status: raceRecord.status,
              distanceMeters: raceRecord.calculatedDistanceMeters,
              campusName: 'Assigned Campus'
            }
          });
        }
      } catch (raceErr) {
        console.error('Error resolving concurrent arrival record:', raceErr);
      }
    }
    console.error('Error verifying campus arrival:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process campus arrival check-in.'
    });
  }
};

// ============================================================
// 19. GET STUDENT CAMPUS ARRIVAL STATUS (SUPPORT DESK / FACULTY ASSISTANCE)
// ============================================================
// @route   GET /api/attendance/campus-arrival/status/:studentId
// @access  Authorized Staff / Faculty (PERMISSIONS.ATTENDANCE_VIEW)
exports.getStudentCampusArrivalStatus = async (req, res) => {
  try {
    const user = req.user;
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student identifier.'
      });
    }

    const student = await User.findById(studentId).select('name rollNumber campusId departmentId branch section role isActive');
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        error: 'Student record not found.'
      });
    }

    // Multi-Campus Isolation
    if (!canAccessCampus(user, student.campusId)) {
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: Cross-campus student arrival lookup forbidden.'
      });
    }

    // Department / Managed Scope Isolation
    const userRole = normalizeRole(user.role);
    if (userRole === ROLES.HOD) {
      if (!canAccessDepartment(user, student.departmentId, student.branch)) {
        return res.status(403).json({
          success: false,
          error: 'Department Isolation: Cannot inspect arrival status of students outside your department.'
        });
      }
    } else if (userRole === ROLES.FACULTY) {
      if (!canAccessDepartment(user, student.departmentId, student.branch)) {
        return res.status(403).json({
          success: false,
          error: 'Scope Isolation: Cannot inspect arrival status of students outside your teaching scope.'
        });
      }
    }

    // Date key in IST
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowUtc = new Date();
    const istDate = new Date(nowUtc.getTime() + IST_OFFSET_MS);
    const arrivalDateKey = istDate.toISOString().slice(0, 10);

    const log = await CampusCheckInLog.findOne({
      user: student._id,
      arrivalDateKey
    }).populate('correctionRequestedBy', 'name role')
      .populate('correctionReviewedBy', 'name role')
      .populate('campus', 'name code');

    return res.status(200).json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber || 'N/A',
        campusId: student.campusId,
        campusName: log?.campus?.name || 'Assigned Campus',
        branch: student.branch,
        section: student.section
      },
      arrivalDateKey,
      arrivalStatus: log ? log.status : 'NOT_CHECKED_IN',
      verificationMethod: log ? log.verificationMethod : null,
      timestamp: log ? log.timestamp : null,
      referenceCode: log ? log.referenceCode : null,
      correctionStatus: log ? log.correctionStatus : 'NONE',
      correctionReason: log ? log.correctionReason : '',
      correctionRequestedBy: log?.correctionRequestedBy ? { name: log.correctionRequestedBy.name, role: log.correctionRequestedBy.role } : null,
      correctionRequestedAt: log ? log.correctionRequestedAt : null,
      correctionReviewedBy: log?.correctionReviewedBy ? { name: log.correctionReviewedBy.name, role: log.correctionReviewedBy.role } : null,
      correctionReviewedAt: log ? log.correctionReviewedAt : null
    });
  } catch (err) {
    console.error('Error fetching student campus arrival status:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve student campus arrival status.'
    });
  }
};

// ============================================================
// 20. SUBMIT CAMPUS ARRIVAL CORRECTION REQUEST (SUPPORT DESK / ASSISTANCE)
// ============================================================
// @route   POST /api/attendance/campus-arrival/correction
// @access  Authorized Staff / Faculty (PERMISSIONS.ATTENDANCE_VIEW)
exports.requestCampusArrivalCorrection = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER, ROLES.AUDITOR].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Only authorized faculty or administrative staff may submit arrival assistance requests.'
      });
    }

    const { studentId, reason, notes } = req.body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid studentId is mandatory.'
      });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Reason for arrival correction request is required.'
      });
    }

    const student = await User.findById(studentId).select('name rollNumber campusId departmentId branch section role isActive');
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        error: 'Student record not found.'
      });
    }

    // Campus scope verification
    if (!canAccessCampus(user, student.campusId)) {
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: Cross-campus arrival correction submission forbidden.'
      });
    }

    // Department / scope check for HOD & Faculty
    if (userRole === ROLES.HOD && !canAccessDepartment(user, student.departmentId, student.branch)) {
      return res.status(403).json({
        success: false,
        error: 'Department Isolation: Cannot submit arrival correction for students outside your department.'
      });
    }

    const campus = await Campus.findById(student.campusId);
    if (!campus || !campus.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Student assigned campus is inactive or not found.'
      });
    }

    // Date key in IST
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowUtc = new Date();
    const istDate = new Date(nowUtc.getTime() + IST_OFFSET_MS);
    const arrivalDateKey = istDate.toISOString().slice(0, 10);

    const existingLog = await CampusCheckInLog.findOne({
      user: student._id,
      arrivalDateKey
    });

    if (existingLog && existingLog.status === 'VERIFIED') {
      return res.status(400).json({
        success: false,
        error: 'Student campus arrival is already verified for today.'
      });
    }

    if (existingLog && existingLog.correctionStatus === 'REQUESTED') {
      return res.status(400).json({
        success: false,
        error: 'An arrival correction request is already pending review for this student today.'
      });
    }

    const referenceCode = `CB-ARR-REQ-${arrivalDateKey.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isSupervisorSubmitter = (userRole === ROLES.SUPPORT_DESK_SUPERVISOR);
    const isEscalatedToPrincipal = isSupervisorSubmitter;
    const escalatedToRole = isSupervisorSubmitter ? 'PRINCIPAL' : 'NONE';
    const escalationReason = isSupervisorSubmitter ? 'SUPERVISOR_SELF_SUBMISSION' : '';
    const escalatedAt = isSupervisorSubmitter ? nowUtc : null;

    let logRecord;
    if (existingLog) {
      existingLog.timestamp = nowUtc;
      existingLog.status = 'PENDING_REVIEW';
      existingLog.verificationMethod = 'ADMINISTRATIVE_DESK';
      existingLog.correctionStatus = 'REQUESTED';
      existingLog.correctionReason = reason.trim();
      existingLog.correctionNotes = (notes || '').trim();
      existingLog.correctionRequestedBy = user._id;
      existingLog.correctionRequestedAt = nowUtc;
      existingLog.isEscalatedToPrincipal = isEscalatedToPrincipal;
      existingLog.escalatedToRole = escalatedToRole;
      existingLog.escalationReason = escalationReason;
      existingLog.escalatedAt = escalatedAt;
      existingLog.referenceCode = referenceCode;
      logRecord = await existingLog.save();
    } else {
      logRecord = await CampusCheckInLog.create({
        user: student._id,
        campus: campus._id,
        timestamp: nowUtc,
        arrivalDateKey,
        latitude: campus.latitude,
        longitude: campus.longitude,
        accuracy: null,
        calculatedDistanceMeters: 0,
        configuredPerimeterRadiusMeters: campus.arrivalPerimeterRadiusMeters,
        status: 'PENDING_REVIEW',
        verificationMethod: 'ADMINISTRATIVE_DESK',
        correctionStatus: 'REQUESTED',
        correctionReason: reason.trim(),
        correctionNotes: (notes || '').trim(),
        correctionRequestedBy: user._id,
        correctionRequestedAt: nowUtc,
        isEscalatedToPrincipal,
        escalatedToRole,
        escalationReason,
        escalatedAt,
        referenceCode,
        ipAddress: extractClientIp(req),
        userAgent: extractUserAgent(req)
      });
    }

    await logActivity({
      user,
      action: 'CAMPUS_ARRIVAL_CORRECTION_REQUESTED',
      category: 'Smart Attendance',
      description: `Arrival correction requested for student ${student.name} (${student.rollNumber || 'N/A'}) at ${campus.name}`,
      details: {
        studentId: student._id,
        campusId: campus._id,
        referenceCode,
        reason: reason.trim()
      },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Campus arrival correction request submitted for administrative review.',
      log: {
        id: logRecord._id,
        referenceCode: logRecord.referenceCode,
        status: logRecord.status,
        correctionStatus: logRecord.correctionStatus,
        correctionReason: logRecord.correctionReason,
        correctionRequestedAt: logRecord.correctionRequestedAt,
        studentName: student.name,
        rollNumber: student.rollNumber
      }
    });
  } catch (err) {
    console.error('Error submitting campus arrival correction request:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit arrival correction request.'
    });
  }
};

// ============================================================
// 21. REVIEW & APPROVE/REJECT CAMPUS ARRIVAL CORRECTION (DUAL-CONTROL)
// ============================================================
// @route   PUT /api/attendance/campus-arrival/correction/:logId/review
// @access  Authorized Reviewer: HOD, Campus Admin, Administrator, Admin, Super Admin (PERMISSIONS.ATTENDANCE_VIEW)
exports.reviewCampusArrivalCorrection = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    // Prohibited roles: front_office and support_desk cannot approve/reject; faculty/student/recruiter/auditor/librarian also prohibited
    if ([ROLES.FRONT_OFFICE, ROLES.SUPPORT_DESK, ROLES.FACULTY, ROLES.STUDENT, ROLES.RECRUITER, ROLES.AUDITOR, ROLES.LIBRARIAN].includes(userRole)) {
      return res.status(403).json({
        success: false,
        code: 'UNAUTHORIZED_REVIEWER_ROLE',
        error: 'Access Denied: Only Support Desk Supervisors, Principals, Directors, HODs, or Campus Administrators may adjudicate arrival corrections.'
      });
    }

    const { logId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid log record identifier.'
      });
    }

    const log = await CampusCheckInLog.findById(logId)
      .populate('user', 'name rollNumber branch departmentId campusId')
      .populate('correctionRequestedBy', 'name role email');
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Campus arrival check-in log not found.'
      });
    }

    // Multi-Campus Isolation
    if (!canAccessCampus(user, log.campus)) {
      return res.status(403).json({
        success: false,
        code: 'CROSS_CAMPUS_FORBIDDEN',
        error: 'Multi-Campus Isolation: Cross-campus arrival correction review forbidden.'
      });
    }

    // 1. Separation of Duties: Strict Anti-Self-Approval
    const submitterId = log.correctionRequestedBy?._id
      ? log.correctionRequestedBy._id.toString()
      : (log.correctionRequestedBy ? log.correctionRequestedBy.toString() : null);
    if (submitterId && submitterId === user._id.toString()) {
      await logActivity({
        user,
        action: 'SELF_APPROVAL_ATTEMPT_BLOCKED',
        category: 'Security Violation',
        description: `User ${user.name} attempted self-approval on arrival correction ${log.referenceCode}`,
        details: { logId: log._id, referenceCode: log.referenceCode },
        req
      });

      return res.status(403).json({
        success: false,
        code: 'SELF_APPROVAL_PROHIBITED',
        error: 'Separation of Duties Violation: You cannot review or approve an arrival correction request that you submitted.'
      });
    }

    // Determine if this ticket is a supervisor-submitted correction request
    const submitterRole = log.correctionRequestedBy && typeof log.correctionRequestedBy === 'object' && log.correctionRequestedBy.role
      ? normalizeRole(log.correctionRequestedBy.role)
      : null;
    const isSupervisorSubmitted = (submitterRole === ROLES.SUPPORT_DESK_SUPERVISOR) ||
      Boolean(log.isEscalatedToPrincipal) ||
      (log.escalationReason === 'SUPERVISOR_SELF_SUBMISSION') ||
      (log.escalationReason === 'SLA_OVERDUE_EXCEEDED_48_HOURS');

    // 2. SLA Escalation: 48-Hour Director Escalation strictly applies ONLY to supervisor-submitted requests
    const isOverdue = Boolean(
      log.correctionRequestedAt &&
      (Date.now() - new Date(log.correctionRequestedAt).getTime() > 48 * 60 * 60 * 1000)
    );

    if (log.escalatedToRole === 'DIRECTOR' || (isSupervisorSubmitted && isOverdue)) {
      if (log.escalatedToRole !== 'DIRECTOR') {
        log.escalatedToRole = 'DIRECTOR';
        log.isEscalatedToPrincipal = false;
        log.escalationReason = 'SLA_OVERDUE_EXCEEDED_48_HOURS';
        log.escalatedAt = new Date();
        await log.save();
      }
      if (userRole !== ROLES.DIRECTOR) {
        return res.status(403).json({
          success: false,
          code: 'DIRECTOR_ESCALATION_REQUIRED',
          error: 'SLA Expired (>48h): This supervisor-submitted ticket has escalated to the Campus Director for review.'
        });
      }
    } else if (isSupervisorSubmitted) {
      // 3. Supervisor Submission Escalation: Must escalate to the Principal within the 48-hour window
      if (userRole !== ROLES.PRINCIPAL) {
        return res.status(403).json({
          success: false,
          code: 'PRINCIPAL_ESCALATION_REQUIRED',
          error: 'Access Denied: This ticket was submitted by a supervisor and strictly requires Principal review.'
        });
      }
    }

    // Department check for HOD
    if (userRole === ROLES.HOD && log.user) {
      if (!canAccessDepartment(user, log.user.departmentId, log.user.branch)) {
        return res.status(403).json({
          success: false,
          error: 'Department Isolation: HOD can only review arrival corrections for students within their department.'
        });
      }
    }

    const { action, notes } = req.body;
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Action must be either 'APPROVE' or 'REJECT'."
      });
    }

    const now = new Date();

    if (action === 'APPROVE') {
      log.status = 'VERIFIED';
      log.verificationMethod = 'ADMINISTRATIVE_DESK';
      log.correctionStatus = 'APPROVED';
      log.correctionReviewedBy = user._id;
      log.correctionReviewedAt = now;
      if (notes) log.correctionNotes = notes.trim();
      log.referenceCode = `CB-ARR-DESK-${log.arrivalDateKey.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      await log.save();

      await logActivity({
        user,
        action: 'CAMPUS_ARRIVAL_CORRECTION_APPROVED',
        category: 'Smart Attendance',
        description: `Campus arrival correction approved for ${log.user?.name || 'student'} by ${user.name}`,
        details: {
          logId: log._id,
          studentId: log.user?._id,
          referenceCode: log.referenceCode,
          campusId: log.campus
        },
        req
      });

      return res.status(200).json({
        success: true,
        message: 'Campus arrival correction approved successfully.',
        log: {
          id: log._id,
          status: log.status,
          verificationMethod: log.verificationMethod,
          correctionStatus: log.correctionStatus,
          referenceCode: log.referenceCode,
          reviewedAt: log.correctionReviewedAt
        }
      });
    } else {
      // REJECT
      log.status = 'FAILED';
      log.correctionStatus = 'REJECTED';
      log.correctionReviewedBy = user._id;
      log.correctionReviewedAt = now;
      if (notes) log.correctionNotes = notes.trim();
      await log.save();

      await logActivity({
        user,
        action: 'CAMPUS_ARRIVAL_CORRECTION_REJECTED',
        category: 'Smart Attendance',
        description: `Campus arrival correction rejected for ${log.user?.name || 'student'} by ${user.name}`,
        details: {
          logId: log._id,
          studentId: log.user?._id,
          reason: notes || 'Administrative rejection'
        },
        req
      });

      return res.status(200).json({
        success: true,
        message: 'Campus arrival correction request rejected.',
        log: {
          id: log._id,
          status: log.status,
          correctionStatus: log.correctionStatus,
          reviewedAt: log.correctionReviewedAt
        }
      });
    }
  } catch (err) {
    console.error('Error reviewing campus arrival correction:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to review arrival correction.'
    });
  }
};

// ============================================================
// 21b. LIST CAMPUS ARRIVAL CORRECTIONS (SUPPORT DESK & AUDIT WORKFLOW)
// ============================================================
// @route   GET /api/attendance/campus-arrival/corrections
// @access  Authorized Staff & Reviewers (PERMISSIONS.ATTENDANCE_VIEW)
exports.getCampusArrivalCorrections = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Unauthorized to view campus arrival correction roster.'
      });
    }

    let targetCampusId = user?.campusId || user?.campus;
    if (req.query.campusId && (isSuperAdmin(user) || userRole === ROLES.ADMIN)) {
      targetCampusId = req.query.campusId;
    }

    const filter = {
      $or: [
        { correctionStatus: { $in: ['REQUESTED', 'APPROVED', 'REJECTED'] } },
        { status: 'PENDING_REVIEW' }
      ]
    };

    if (targetCampusId && !isSuperAdmin(user)) {
      filter.campus = targetCampusId;
    }

    if (req.query.status && req.query.status !== 'ALL') {
      filter.correctionStatus = req.query.status;
    }

    if (req.query.date) {
      filter.arrivalDateKey = req.query.date;
    }

    // Role-based department scoping for HOD
    if (userRole === ROLES.HOD) {
      const studentQuery = { role: 'student' };
      if (user.departmentId) studentQuery.departmentId = user.departmentId;
      else if (user.branch || user.department) studentQuery.branch = user.branch || user.department;
      if (targetCampusId) studentQuery.campusId = targetCampusId;
      const deptStudents = await User.find(studentQuery).select('_id');
      const deptStudentIds = deptStudents.map(s => s._id);
      filter.user = { $in: deptStudentIds };
    }

    // If search term supplied
    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim();
      const searchRegex = new RegExp(q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      const matchingUsers = await User.find({
        role: 'student',
        $or: [{ name: searchRegex }, { rollNumber: searchRegex }, { email: searchRegex }]
      }).select('_id');
      const matchingIds = matchingUsers.map(u => u._id);
      if (filter.user && filter.user.$in) {
        filter.user.$in = filter.user.$in.filter(id => matchingIds.some(m => m.equals(id)));
      } else {
        filter.user = { $in: matchingIds };
      }
    }

    const corrections = await CampusCheckInLog.find(filter)
      .populate('user', 'name rollNumber email branch departmentId campusId')
      .populate('campus', 'name code')
      .populate('correctionRequestedBy', 'name role email')
      .populate('correctionReviewedBy', 'name role email')
      .sort({ correctionRequestedAt: -1, timestamp: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      count: corrections.length,
      data: corrections
    });
  } catch (err) {
    console.error('Error fetching campus arrival corrections:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve arrival correction records.'
    });
  }
};

// ============================================================
// 22. TODAY'S CAMPUS ARRIVAL SUMMARY (AUTHORIZED CAMPUS/DEPARTMENT SCOPE)
// ============================================================
// @route   GET /api/attendance/campus-arrival/today-summary
// @access  Faculty, Staff, Administrators (PERMISSIONS.ATTENDANCE_VIEW)
exports.getTodayArrivalSummary = async (req, res) => {
  try {
    const user = req.user;
    const userRole = normalizeRole(user.role);

    if ([ROLES.STUDENT, ROLES.RECRUITER].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Unauthorized to view institutional arrival summaries.'
      });
    }

    let targetCampusId = user?.campusId || user?.campus;
    if (req.query.campusId && (isSuperAdmin(user) || userRole === ROLES.ADMIN)) {
      targetCampusId = req.query.campusId;
    }

    if (!targetCampusId) {
      return res.status(200).json({
        success: true,
        summary: {
          totalVerifiedToday: 0,
          totalPendingCorrectionsToday: 0,
          campusName: 'Unassigned Campus'
        }
      });
    }

    if (!canAccessCampus(user, targetCampusId)) {
      return res.status(403).json({
        success: false,
        error: 'Multi-Campus Isolation: Cannot access arrival summary for another campus.'
      });
    }

    const campus = await Campus.findById(targetCampusId);

    // Calculate IST arrival date key
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const nowUtc = new Date();
    const istDate = new Date(nowUtc.getTime() + IST_OFFSET_MS);
    const arrivalDateKey = istDate.toISOString().slice(0, 10);

    const filterBase = {
      campus: targetCampusId,
      arrivalDateKey
    };

    // If HOD or Faculty, scope to students in their department/scopes
    let studentIdsInScope = null;
    if (userRole === ROLES.HOD || userRole === ROLES.FACULTY) {
      const studentQuery = { campusId: targetCampusId, role: 'student' };
      if (userRole === ROLES.HOD && user.departmentId) {
        studentQuery.departmentId = user.departmentId;
      } else if (userRole === ROLES.HOD && (user.branch || user.department)) {
        studentQuery.branch = user.branch || user.department;
      }
      const students = await User.find(studentQuery).select('_id');
      studentIdsInScope = students.map(s => s._id);
      filterBase.user = { $in: studentIdsInScope };
    }

    const [totalVerifiedToday, totalPendingCorrectionsToday] = await Promise.all([
      CampusCheckInLog.countDocuments({ ...filterBase, status: 'VERIFIED' }),
      CampusCheckInLog.countDocuments({ ...filterBase, correctionStatus: 'REQUESTED' })
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        arrivalDateKey,
        campusId: targetCampusId,
        campusName: campus?.name || 'Assigned Campus',
        totalVerifiedToday,
        totalPendingCorrectionsToday
      }
    });
  } catch (err) {
    console.error('Error fetching today arrival summary:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve campus arrival summary.'
    });
  }
};

// ============================================================
// 21. BIOMETRIC IDENTITY & FACE RECOGNITION CONTROLLERS
// ============================================================

/**
 * @route   GET /api/attendance/biometrics/status
 * @access  Authenticated (Student / Faculty / Staff)
 */
exports.getBiometricStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const profile = user.biometricProfile || {};
    return res.status(200).json({
      success: true,
      isEnrolled: Boolean(profile.isEnrolled),
      enrolledAt: profile.enrolledAt || null,
      consentGiven: Boolean(profile.consentGiven),
      consentDate: profile.consentDate || null,
      modelVersion: profile.modelVersion || 'cb-facenet-128d-v1',
      lastVerifiedAt: profile.lastVerifiedAt || null
    });
  } catch (err) {
    console.error('Error fetching biometric status:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve biometric enrollment status.' });
  }
};

/**
 * @route   POST /api/attendance/biometrics/challenge
 * @access  Authenticated (Student / Faculty / Staff)
 */
exports.requestBiometricChallenge = async (req, res) => {
  try {
    const challenge = generateLivenessChallenge(req.user._id);
    return res.status(200).json({
      success: true,
      challengeNonce: challenge.challengeNonce,
      promptAction: challenge.promptAction,
      instructions: challenge.instructions,
      expiresAt: challenge.expiresAt
    });
  } catch (err) {
    console.error('Error generating biometric challenge:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate liveness challenge.' });
  }
};

/**
 * @route   POST /api/attendance/biometrics/enroll
 * @access  Authenticated (Student / Faculty / Staff)
 */
exports.enrollBiometricProfile = async (req, res) => {
  try {
    const user = req.user;
    const { consentGiven, opticalEvidence, challengeNonce, livenessEvidence } = req.body;

    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        error: 'Biometric enrollment requires informed consent and explicit institutional acknowledgment.'
      });
    }

    if (!opticalEvidence) {
      return res.status(400).json({
        success: false,
        error: 'Optical facial evidence is required for biometric template extraction.'
      });
    }

    // If challengeNonce provided, validate optical liveness
    if (challengeNonce) {
      const livenessResult = validateLivenessChallenge(user._id, challengeNonce, livenessEvidence);
      if (!livenessResult.success) {
        return res.status(400).json({
          success: false,
          error: livenessResult.reason || 'Liveness verification failed during enrollment.'
        });
      }
    }

    // Extract normalized 128-d embedding
    const embedding = extractNormalizedEmbedding(opticalEvidence);

    // Encrypt at rest using AES-256-GCM
    const encrypted = encryptEmbedding(embedding);

    const now = new Date();
    const updatedUser = await User.findById(user._id).select('+biometricProfile.encryptedEmbedding +biometricProfile.authTag +biometricProfile.iv');
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    updatedUser.biometricProfile = {
      isEnrolled: true,
      enrolledAt: now,
      consentGiven: true,
      consentDate: now,
      encryptedEmbedding: encrypted.encryptedEmbedding,
      authTag: encrypted.authTag,
      iv: encrypted.iv,
      modelVersion: 'cb-facenet-128d-v1',
      enrolledByIp: extractClientIp(req),
      lastVerifiedAt: null,
      revokedAt: null,
      revokedReason: ''
    };

    await updatedUser.save();

    await logActivity({
      user,
      action: 'BIOMETRIC_ENROLLED',
      category: 'Smart Attendance',
      description: `Biometric facial profile enrolled for ${user.name} (${user.role})`,
      details: {
        userId: user._id,
        role: user.role,
        enrolledAt: now,
        modelVersion: 'cb-facenet-128d-v1'
      },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Facial biometric profile enrolled and encrypted successfully.',
      enrolledAt: now
    });
  } catch (err) {
    console.error('Error enrolling biometric profile:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to enroll biometric profile: ' + (err.message || 'Internal error')
    });
  }
};

/**
 * @route   POST /api/attendance/biometrics/verify
 * @access  Authenticated (Student / Faculty / Staff)
 */
exports.verifyBiometricFace = async (req, res) => {
  try {
    const user = req.user;
    const { purpose, opticalEvidence, challengeNonce, livenessEvidence } = req.body;

    const validPurposes = ['ATTENDANCE_CHECKIN', 'CAMPUS_ARRIVAL', 'FACULTY_SESSION_LAUNCH'];
    if (!purpose || !validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: `Invalid or missing purpose. Must be one of: ${validPurposes.join(', ')}`
      });
    }

    if (!opticalEvidence) {
      return res.status(400).json({
        success: false,
        error: 'Optical facial evidence is required for identity matching.'
      });
    }

    // Load user with encrypted template
    const fullUser = await User.findById(user._id).select('+biometricProfile.encryptedEmbedding +biometricProfile.authTag +biometricProfile.iv');
    if (!fullUser || !fullUser.biometricProfile || !fullUser.biometricProfile.isEnrolled) {
      return res.status(400).json({
        success: false,
        error: 'You do not have an active biometric enrollment profile. Please enroll or use alternative manual attendance.'
      });
    }

    // Validate liveness challenge
    if (challengeNonce) {
      const livenessResult = validateLivenessChallenge(user._id, challengeNonce, livenessEvidence);
      if (!livenessResult.success) {
        await logActivity({
          user,
          action: 'BIOMETRIC_LIVENESS_FAILED',
          category: 'Smart Attendance',
          description: `Liveness failed: ${livenessResult.reason}`,
          details: { purpose },
          req
        });
        return res.status(400).json({
          success: false,
          error: livenessResult.reason || 'Liveness check failed. Please ensure natural lighting and live presence.'
        });
      }
    }

    // Decrypt enrolled biometric template
    const enrolledEmbedding = decryptEmbedding(
      fullUser.biometricProfile.encryptedEmbedding,
      fullUser.biometricProfile.authTag,
      fullUser.biometricProfile.iv
    );

    // Extract probe embedding from optical evidence
    const probeEmbedding = extractNormalizedEmbedding(opticalEvidence);

    // Compute similarity against defensible threshold
    const matchResult = compareEmbeddings(enrolledEmbedding, probeEmbedding);

    if (!matchResult.isMatch) {
      await logActivity({
        user,
        action: 'BIOMETRIC_VERIFICATION_REJECTED',
        category: 'Smart Attendance',
        description: `Biometric verification failed (similarity: ${matchResult.similarity} vs threshold ${SIMILARITY_THRESHOLD})`,
        details: {
          purpose,
          similarity: matchResult.similarity,
          isAmbiguous: matchResult.isAmbiguous
        },
        req
      });

      if (matchResult.isAmbiguous) {
        return res.status(400).json({
          success: false,
          status: 'AMBIGUOUS_MATCH',
          similarity: matchResult.similarity,
          error: `Facial similarity (${matchResult.similarity}) was inconclusive. Please ensure direct lighting, look straight into the camera, or request assistance.`
        });
      }

      return res.status(400).json({
        success: false,
        status: 'VERIFICATION_FAILED',
        similarity: matchResult.similarity,
        error: 'Identity verification failed: Face does not match the enrolled profile for this account.'
      });
    }

    // Verification Succeeded!
    const token = generateFaceVerificationToken(user._id, user.role, purpose, matchResult.similarity);

    fullUser.biometricProfile.lastVerifiedAt = new Date();
    await fullUser.save();

    await logActivity({
      user,
      action: 'BIOMETRIC_VERIFIED',
      category: 'Smart Attendance',
      description: `Biometric face verified for ${user.name} (Similarity: ${matchResult.similarity})`,
      details: { purpose, similarity: matchResult.similarity },
      req
    });

    return res.status(200).json({
      success: true,
      verified: true,
      similarity: matchResult.similarity,
      faceVerificationToken: token,
      expiresInSeconds: 180
    });
  } catch (err) {
    console.error('Error verifying biometric face:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal error during biometric verification: ' + (err.message || 'Unknown error')
    });
  }
};

/**
 * @route   DELETE /api/attendance/biometrics/enrollment
 * @access  Authenticated (Student / Faculty / Staff)
 */
exports.withdrawBiometricEnrollment = async (req, res) => {
  try {
    const user = req.user;
    const { reason = 'User requested withdrawal' } = req.body;

    const fullUser = await User.findById(user._id).select('+biometricProfile.encryptedEmbedding +biometricProfile.authTag +biometricProfile.iv');
    if (!fullUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    fullUser.biometricProfile = {
      isEnrolled: false,
      enrolledAt: null,
      consentGiven: false,
      consentDate: null,
      encryptedEmbedding: null,
      authTag: null,
      iv: null,
      modelVersion: 'cb-facenet-128d-v1',
      enrolledByIp: '',
      lastVerifiedAt: null,
      revokedAt: new Date(),
      revokedReason: reason
    };

    await fullUser.save();

    await logActivity({
      user,
      action: 'BIOMETRIC_WITHDRAWN',
      category: 'Smart Attendance',
      description: `Biometric profile and templates permanently deleted for ${user.name}`,
      details: { userId: user._id, reason },
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Biometric enrollment successfully withdrawn. All encrypted biometric templates have been permanently deleted.'
    });
  } catch (err) {
    console.error('Error withdrawing biometric enrollment:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to withdraw biometric enrollment.'
    });
  }
};
