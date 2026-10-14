const User = require('../models/User');
const Campus = require('../models/Campus');
const Subject = require('../models/Subject');
const Holiday = require('../models/Holiday');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const CampusCheckInLog = require('../models/CampusCheckInLog');
const WhatsAppNotificationLog = require('../models/WhatsAppNotificationLog');
const { sendWhatsAppMessage, normalizeIndianMobileNumber, OFFICIAL_SENDER_NUMBER, OFFICIAL_SENDER_INTL } = require('../utils/sendWhatsApp');
const { logActivity } = require('../utils/auditLogger');

// Constants
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const RECTIFICATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Returns current or given date details in Indian Standard Time (IST, UTC+5:30).
 */
function getISTDateInfo(date = new Date()) {
  const istTimeMs = date.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istTimeMs);
  const dateKey = istDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const timeStr = istDate.toISOString().slice(11, 16); // 'HH:MM' (24-hr)
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const dayOfWeek = istDate.getUTCDay(); // 0 = Sunday
  const isWeekend = dayOfWeek === 0; // Sunday institutional non-instructional day

  // Formatted 12-hour display string
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  const formattedTime = `${displayHours}:${displayMinutes} ${period}`;

  return {
    dateKey,
    timeStr,
    hours,
    minutes,
    isWeekend,
    formattedTime,
    istDate
  };
}

/**
 * Compares two 'HH:MM' time strings (24-hour).
 * Returns positive if timeA > timeB, negative if timeA < timeB, 0 if equal.
 */
function compareTimeStrings(timeA, timeB) {
  const [hA, mA] = (timeA || '00:00').split(':').map(Number);
  const [hB, mB] = (timeB || '00:00').split(':').map(Number);
  if (hA !== hB) return hA - hB;
  return mA - mB;
}

/**
 * Checks if a given dateKey ('YYYY-MM-DD') is an official registered holiday.
 */
async function isOfficialHoliday(dateKey) {
  try {
    const holiday = await Holiday.findOne({ date: dateKey });
    return Boolean(holiday);
  } catch (err) {
    console.warn('[AttendanceNotification] Error querying holiday table:', err.message);
    return false;
  }
}

/**
 * Authoritatively resolves the student's registered parent/guardian mobile number.
 * Looks into student.guardianContacts for verified/enabled contact details.
 */
function resolveGuardianContact(student) {
  if (!student) return { phone: null, name: 'Parent/Guardian', error: 'STUDENT_NOT_FOUND' };

  const contacts = Array.isArray(student.guardianContacts) ? student.guardianContacts : [];

  // 1. Look for enabled contact with a phone number
  const enabledContact = contacts.find(c => c.enabled !== false && c.phone && c.phone.trim());
  if (enabledContact) {
    const cleanPhone = normalizeIndianMobileNumber(enabledContact.phone);
    if (cleanPhone) {
      return {
        phone: cleanPhone,
        name: enabledContact.name || 'Parent/Guardian',
        relationship: enabledContact.relationship || 'Guardian'
      };
    }
  }

  // 2. Fall back to any contact in array with a valid phone number
  const anyContact = contacts.find(c => c.phone && c.phone.trim());
  if (anyContact) {
    const cleanPhone = normalizeIndianMobileNumber(anyContact.phone);
    if (cleanPhone) {
      return {
        phone: cleanPhone,
        name: anyContact.name || 'Parent/Guardian',
        relationship: anyContact.relationship || 'Guardian'
      };
    }
  }

  return {
    phone: null,
    name: 'Parent/Guardian',
    error: 'NO_REGISTERED_GUARDIAN_PHONE'
  };
}

// ============================================================
// A. CAMPUS ARRIVAL NOTIFICATION HANDLERS
// ============================================================

/**
 * Sends a WhatsApp notification when a student checks in after the cutoff (Late Arrival).
 */
async function sendCampusLateArrivalAlert({ student, campus, checkInLog }) {
  try {
    const ist = getISTDateInfo(checkInLog.timestamp || new Date());
    const cutoff = campus.arrivalCutoffTime || '10:00';
    const dedupKey = `campus_late:${student._id}:${ist.dateKey}`;

    // Atomically check if already dispatched for this student & date
    const existingLog = await WhatsAppNotificationLog.findOne({ dedupKey });
    if (existingLog) {
      return { skipped: true, reason: 'ALREADY_DISPATCHED', logId: existingLog._id };
    }

    const guardian = resolveGuardianContact(student);
    const messageBody = [
      `🏛️ *CAMPUSBRIDGE — CAMPUS ARRIVAL NOTICE*`,
      ``,
      `Dear Parent/Guardian,`,
      ``,
      `This is an official institutional attendance notice regarding your ward:`,
      `👤 *Student Name:* ${student.name}`,
      `🆔 *Roll Number:* ${student.rollNumber || 'N/A'}`,
      `📍 *Campus:* ${campus.name}`,
      `⏰ *Arrival Time:* ${ist.formattedTime} (Late Check-in)`,
      `⚠️ *Standard Campus Cutoff:* ${cutoff} AM`,
      ``,
      `Your ward recorded an entry into the campus after the official cutoff time. Please ensure timely arrival on campus.`,
      ``,
      `📅 *Date:* ${ist.dateKey}`,
      `📱 *Official Sender:* ${OFFICIAL_SENDER_INTL}`
    ].join('\n');

    if (!guardian.phone) {
      // Record failure log due to missing parent phone number
      const failLog = await WhatsAppNotificationLog.create({
        dedupKey,
        category: 'CAMPUS_LATE_ARRIVAL',
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber || '',
        guardianName: guardian.name,
        guardianPhone: '',
        senderNumber: OFFICIAL_SENDER_NUMBER,
        campusId: campus._id,
        dateKey: ist.dateKey,
        status: 'FAILED',
        errorCode: 'MISSING_GUARDIAN_PHONE',
        errorMessage: 'Student record does not have a valid registered parent/guardian mobile number.',
        messageBody
      });

      checkInLog.lateAlertSent = true;
      checkInLog.lateAlertSentAt = new Date();
      checkInLog.lateAlertStatus = 'FAILED';
      await checkInLog.save();

      return { success: false, status: 'FAILED', logId: failLog._id, error: 'MISSING_GUARDIAN_PHONE' };
    }

    // Dispatch WhatsApp via Meta WhatsApp Cloud API
    const templateName = process.env.META_WHATSAPP_TEMPLATE_LATE_ARRIVAL || null;
    const templateLanguage = process.env.META_WHATSAPP_TEMPLATE_LANG || 'en';
    const dispatchResult = await sendWhatsAppMessage({
      to: guardian.phone,
      message: messageBody,
      studentName: student.name,
      category: 'Campus Late Arrival',
      templateName,
      templateLanguage,
      templateParams: templateName ? [
        student.name,
        student.rollNumber || 'N/A',
        campus.name,
        ist.formattedTime,
        `${campus.arrivalCutoffTime || '10:00'} AM`
      ] : null
    });

    const status = dispatchResult.providerDispatched ? 'SENT' : (dispatchResult.success ? 'DELIVERED' : 'FAILED');
    const logRecord = await WhatsAppNotificationLog.create({
      dedupKey,
      category: 'CAMPUS_LATE_ARRIVAL',
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber || '',
      guardianName: guardian.name,
      guardianPhone: guardian.phone,
      senderNumber: OFFICIAL_SENDER_NUMBER,
      campusId: campus._id,
      dateKey: ist.dateKey,
      status,
      messageId: dispatchResult.providerDetails?.messageId || null,
      errorCode: dispatchResult.error || '',
      errorMessage: dispatchResult.message || '',
      messageBody,
      providerResponse: dispatchResult.providerDetails || null
    });

    checkInLog.lateAlertSent = true;
    checkInLog.lateAlertSentAt = new Date();
    checkInLog.lateAlertStatus = status === 'DELIVERED' ? 'SENT' : 'FAILED';
    await checkInLog.save();

    return { success: dispatchResult.success, status, logId: logRecord._id };
  } catch (err) {
    console.error('[AttendanceNotification] Error sending campus late alert:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a WhatsApp notification when a student has NO check-in at the absence evaluation time.
 */
async function sendCampusAbsenceAlert({ student, campus, dateKey }) {
  try {
    const dedupKey = `campus_absence:${student._id}:${dateKey}`;
    const cutoff = campus.arrivalCutoffTime || '10:00';

    const existingLog = await WhatsAppNotificationLog.findOne({ dedupKey });
    if (existingLog) {
      return { skipped: true, reason: 'ALREADY_DISPATCHED', logId: existingLog._id };
    }

    const guardian = resolveGuardianContact(student);
    const messageBody = [
      `🏛️ *CAMPUSBRIDGE — CAMPUS ABSENCE NOTICE*`,
      ``,
      `Dear Parent/Guardian,`,
      ``,
      `This is an official notice that your ward has *NOT* checked into campus today:`,
      `👤 *Student Name:* ${student.name}`,
      `🆔 *Roll Number:* ${student.rollNumber || 'N/A'}`,
      `📍 *Campus:* ${campus.name}`,
      `📅 *Date:* ${dateKey}`,
      `⏰ *Evaluation Cutoff:* ${cutoff} AM`,
      ``,
      `No valid campus arrival check-in was recorded for today. If your ward is absent with prior notice or on approved leave, please ensure department records are updated.`,
      ``,
      `📱 *Official Sender:* ${OFFICIAL_SENDER_INTL}`
    ].join('\n');

    if (!guardian.phone) {
      const failLog = await WhatsAppNotificationLog.create({
        dedupKey,
        category: 'CAMPUS_ABSENCE',
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber || '',
        guardianName: guardian.name,
        guardianPhone: '',
        senderNumber: OFFICIAL_SENDER_NUMBER,
        campusId: campus._id,
        dateKey,
        status: 'FAILED',
        errorCode: 'MISSING_GUARDIAN_PHONE',
        errorMessage: 'Student record does not have a valid registered parent/guardian mobile number.',
        messageBody
      });
      return { success: false, status: 'FAILED', logId: failLog._id, error: 'MISSING_GUARDIAN_PHONE' };
    }

    // Dispatch WhatsApp via Meta WhatsApp Cloud API (reusing approved template campus_arrival_unmarked)
    const templateName = process.env.META_WHATSAPP_TEMPLATE_ABSENCE || 'campus_arrival_unmarked';
    const templateLanguage = process.env.META_WHATSAPP_TEMPLATE_LANG || 'en';
    const dispatchResult = await sendWhatsAppMessage({
      to: guardian.phone,
      message: messageBody,
      studentName: student.name,
      category: 'Campus Absence',
      templateName,
      templateLanguage,
      templateParams: [
        student.name,
        student.rollNumber || 'N/A',
        campus.name,
        dateKey,
        `${cutoff} AM`
      ]
    });

    const status = dispatchResult.providerDispatched ? 'SENT' : (dispatchResult.success ? 'DELIVERED' : 'FAILED');
    const logRecord = await WhatsAppNotificationLog.create({
      dedupKey,
      category: 'CAMPUS_ABSENCE',
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber || '',
      guardianName: guardian.name,
      guardianPhone: guardian.phone,
      senderNumber: OFFICIAL_SENDER_NUMBER,
      campusId: campus._id,
      dateKey,
      status,
      messageId: dispatchResult.providerDetails?.messageId || null,
      errorCode: dispatchResult.error || '',
      errorMessage: dispatchResult.message || '',
      messageBody,
      providerResponse: dispatchResult.providerDetails || null
    });

    return { success: dispatchResult.success, status, logId: logRecord._id };
  } catch (err) {
    console.error('[AttendanceNotification] Error sending campus absence alert:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a WhatsApp notification when a student checks in AFTER an absence notification was sent.
 * Corrects and supersedes the earlier morning absence notice without misleading or duplicate messages.
 */
async function sendCampusArrivalUpdateAlert({ student, campus, checkInLog }) {
  try {
    const ist = getISTDateInfo(checkInLog.timestamp || new Date());
    const dedupKey = `campus_arrival_update:${student._id}:${ist.dateKey}`;

    const existingLog = await WhatsAppNotificationLog.findOne({ dedupKey });
    if (existingLog) {
      return { skipped: true, reason: 'ALREADY_DISPATCHED', logId: existingLog._id };
    }

    const guardian = resolveGuardianContact(student);
    const messageBody = [
      `🏛️ *CAMPUSBRIDGE — CAMPUS ARRIVAL UPDATE*`,
      ``,
      `Dear Parent/Guardian,`,
      ``,
      `Attendance status update regarding your ward:`,
      `👤 *Student Name:* ${student.name}`,
      `🆔 *Roll Number:* ${student.rollNumber || 'N/A'}`,
      `📍 *Campus:* ${campus.name}`,
      `⏰ *Actual Arrival Time:* ${ist.formattedTime} (Late Check-in)`,
      ``,
      `Your ward has now arrived and checked into campus. This update supersedes the earlier morning campus absence notice.`,
      ``,
      `📅 *Date:* ${ist.dateKey}`,
      `📱 *Official Sender:* ${OFFICIAL_SENDER_INTL}`
    ].join('\n');

    if (!guardian.phone) {
      const failLog = await WhatsAppNotificationLog.create({
        dedupKey,
        category: 'CAMPUS_ARRIVAL_UPDATE',
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber || '',
        guardianName: guardian.name,
        guardianPhone: '',
        senderNumber: OFFICIAL_SENDER_NUMBER,
        campusId: campus._id,
        dateKey: ist.dateKey,
        status: 'FAILED',
        errorCode: 'MISSING_GUARDIAN_PHONE',
        errorMessage: 'Student record does not have a valid registered parent/guardian mobile number.',
        messageBody
      });
      return { success: false, status: 'FAILED', logId: failLog._id, error: 'MISSING_GUARDIAN_PHONE' };
    }

    // Dispatch WhatsApp via Meta WhatsApp Cloud API
    const templateName = process.env.META_WHATSAPP_TEMPLATE_ARRIVAL_UPDATE || null;
    const templateLanguage = process.env.META_WHATSAPP_TEMPLATE_LANG || 'en';
    const dispatchResult = await sendWhatsAppMessage({
      to: guardian.phone,
      message: messageBody,
      studentName: student.name,
      category: 'Campus Arrival Update',
      templateName,
      templateLanguage,
      templateParams: templateName ? [
        student.name,
        student.rollNumber || 'N/A',
        campus.name,
        ist.formattedTime
      ] : null
    });

    const status = dispatchResult.providerDispatched ? 'SENT' : (dispatchResult.success ? 'DELIVERED' : 'FAILED');
    const logRecord = await WhatsAppNotificationLog.create({
      dedupKey,
      category: 'CAMPUS_ARRIVAL_UPDATE',
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber || '',
      guardianName: guardian.name,
      guardianPhone: guardian.phone,
      senderNumber: OFFICIAL_SENDER_NUMBER,
      campusId: campus._id,
      dateKey: ist.dateKey,
      status,
      messageId: dispatchResult.providerDetails?.messageId || null,
      errorCode: dispatchResult.error || '',
      errorMessage: dispatchResult.message || '',
      messageBody,
      providerResponse: dispatchResult.providerDetails || null
    });

    checkInLog.absenceAlertSuperseded = true;
    checkInLog.absenceAlertSupersededAt = new Date();
    await checkInLog.save();

    return { success: dispatchResult.success, status, logId: logRecord._id };
  } catch (err) {
    console.error('[AttendanceNotification] Error sending arrival update alert:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// B. CLASSROOM ATTENDANCE NOTIFICATION HANDLERS
// ============================================================

/**
 * Sends a separate classroom session absence WhatsApp notification to the absent student's registered guardian.
 */
async function sendClassroomAbsenceAlert({ student, session, subject, faculty }) {
  try {
    const dedupKey = `classroom_absence:${session._id}:${student._id}`;

    // Durable check
    const existingLog = await WhatsAppNotificationLog.findOne({ dedupKey });
    if (existingLog) {
      return { skipped: true, reason: 'ALREADY_DISPATCHED', logId: existingLog._id };
    }

    const ist = getISTDateInfo(session.sessionDate || new Date());
    const subjectName = subject?.name || 'Classroom Course';
    const subjectCode = subject?.code || 'SUBJ';
    const facultyName = faculty?.name || 'Assigned Instructor';
    const classPeriod = session.period ? `Period ${session.period}` : 'Regular Class Session';

    const guardian = resolveGuardianContact(student);
    const messageBody = [
      `📚 *CAMPUSBRIDGE — CLASSROOM ABSENCE NOTICE*`,
      ``,
      `Dear Parent/Guardian,`,
      ``,
      `Your ward was marked *ABSENT* for the following class session:`,
      `👤 *Student Name:* ${student.name}`,
      `🆔 *Roll Number:* ${student.rollNumber || 'N/A'}`,
      `📖 *Course / Subject:* ${subjectName} (${subjectCode})`,
      `👨‍🏫 *Faculty:* ${facultyName}`,
      `📅 *Class Date:* ${ist.dateKey}`,
      `⏰ *Class Session:* ${classPeriod}`,
      `🏛️ *Cohort:* ${session.branch} - Sec ${session.section}`,
      ``,
      `Please note: Campus arrival attendance is recorded separately from classroom attendance.`,
      ``,
      `📱 *Official Sender:* ${OFFICIAL_SENDER_INTL}`
    ].join('\n');

    if (!guardian.phone) {
      const failLog = await WhatsAppNotificationLog.create({
        dedupKey,
        category: 'CLASSROOM_ABSENCE',
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber || '',
        guardianName: guardian.name,
        guardianPhone: '',
        senderNumber: OFFICIAL_SENDER_NUMBER,
        campusId: session.campusId,
        sessionId: session._id,
        subjectName,
        subjectCode,
        facultyName,
        dateKey: ist.dateKey,
        status: 'FAILED',
        errorCode: 'MISSING_GUARDIAN_PHONE',
        errorMessage: 'Student record does not have a valid registered parent/guardian mobile number.',
        messageBody
      });
      return { success: false, status: 'FAILED', logId: failLog._id, error: 'MISSING_GUARDIAN_PHONE' };
    }

    // Dispatch WhatsApp via Meta WhatsApp Cloud API
    const templateName = process.env.META_WHATSAPP_TEMPLATE_CLASSROOM_ABSENCE || null;
    const templateLanguage = process.env.META_WHATSAPP_TEMPLATE_LANG || 'en';
    const dispatchResult = await sendWhatsAppMessage({
      to: guardian.phone,
      message: messageBody,
      studentName: student.name,
      category: 'Classroom Absence',
      templateName,
      templateLanguage,
      templateParams: templateName ? [
        student.name,
        student.rollNumber || 'N/A',
        subjectName,
        facultyName,
        ist.dateKey,
        classPeriod
      ] : null
    });

    const status = dispatchResult.providerDispatched ? 'SENT' : (dispatchResult.success ? 'DELIVERED' : 'FAILED');
    const logRecord = await WhatsAppNotificationLog.create({
      dedupKey,
      category: 'CLASSROOM_ABSENCE',
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber || '',
      guardianName: guardian.name,
      guardianPhone: guardian.phone,
      senderNumber: OFFICIAL_SENDER_NUMBER,
      campusId: session.campusId,
      sessionId: session._id,
      subjectName,
      subjectCode,
      facultyName,
      dateKey: ist.dateKey,
      status,
      messageId: dispatchResult.providerDetails?.messageId || null,
      errorCode: dispatchResult.error || '',
      errorMessage: dispatchResult.message || '',
      messageBody,
      providerResponse: dispatchResult.providerDetails || null
    });

    return { success: dispatchResult.success, status, logId: logRecord._id };
  } catch (err) {
    console.error('[AttendanceNotification] Error sending classroom absence alert:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// C. DURABLE BACKGROUND RECTIFICATION FINALIZER
// ============================================================

/**
 * Finalizes a single submitted session after its 10-minute rectification period expires.
 * Determines the final list of absent students and automatically dispatches WhatsApp absence alerts.
 */
async function finalizeSubmittedSession(sessionId, io = null) {
  try {
    // Acquire atomic lock on this session to prevent race conditions across workers/restarts
    const now = new Date();
    const session = await AttendanceSession.findOneAndUpdate(
      {
        _id: sessionId,
        status: 'SUBMITTED',
        rectificationFinalized: false,
        rectificationExpiresAt: { $lte: now }
      },
      {
        $set: {
          rectificationFinalized: true,
          status: 'FINALIZED',
          lectureStatus: 'COMPLETED',
          actualEndTime: now
        }
      },
      { new: true }
    );

    if (!session) {
      return { finalized: false, reason: 'NOT_ELIGIBLE_OR_ALREADY_FINALIZED' };
    }

    // Resolve Subject and Faculty
    const subject = await Subject.findById(session.subjectId).select('name code');
    const faculty = await User.findById(session.facultyId).select('name email designation');

    // Query enrolled cohort students
    const enrolledStudents = await User.find({
      role: 'student',
      campusId: session.campusId,
      branch: new RegExp(`^${session.branch}$`, 'i'),
      section: new RegExp(`^${session.section}$`, 'i'),
      isActive: { $ne: false }
    }).select('name rollNumber branch section campusId guardianContacts');

    // Query all existing AttendanceRecords for this session
    const existingRecords = await AttendanceRecord.find({ sessionId: session._id });
    const recordsByStudentId = new Map(existingRecords.map(r => [r.studentId.toString(), r]));

    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    const absentStudentsToAlert = [];

    for (const student of enrolledStudents) {
      const sId = student._id.toString();
      const rec = recordsByStudentId.get(sId);

      if (rec && (rec.status === 'PRESENT' || rec.status === 'LATE' || rec.status === 'EXCUSED')) {
        if (rec.status === 'PRESENT') totalPresent++;
        if (rec.status === 'LATE') totalLate++;
      } else {
        totalAbsent++;
        // If no AttendanceRecord exists yet, create one marked ABSENT
        if (!rec) {
          try {
            await AttendanceRecord.create({
              sessionId: session._id,
              campusId: session.campusId,
              departmentId: session.departmentId,
              studentId: student._id,
              rollNumber: student.rollNumber || 'N/A',
              studentName: student.name,
              status: 'ABSENT',
              verificationMethod: 'MANUAL_FACULTY',
              markedAt: now
            });
          } catch (recErr) {
            // Safe ignore if duplicate record created concurrently
          }
        }
        absentStudentsToAlert.push(student);
      }
    }

    // Update aggregate counts on session
    session.totalPresent = totalPresent;
    session.totalLate = totalLate;
    session.totalAbsent = totalAbsent;
    session.totalEnrolled = enrolledStudents.length;

    // Dispatch WhatsApp absence notices for each absent student
    let alertedCount = 0;
    let failedCount = 0;
    for (const absentStudent of absentStudentsToAlert) {
      const result = await sendClassroomAbsenceAlert({
        student: absentStudent,
        session,
        subject,
        faculty
      });
      if (result.success) alertedCount++;
      else if (!result.skipped) failedCount++;
    }

    session.absenceAlertsDispatched = true;
    session.absenceAlertsDispatchedAt = new Date();
    await session.save();

    // Broadcast session finalized via Socket.IO
    if (io) {
      io.to(`attendance_session_${session._id}`).emit('session_rectification_finalized', {
        sessionId: session._id,
        status: 'FINALIZED',
        totalEnrolled: session.totalEnrolled,
        totalPresent: session.totalPresent,
        totalAbsent: session.totalAbsent,
        absenceAlertsCount: alertedCount
      });
    }

    await logActivity({
      action: 'ATTENDANCE_RECTIFICATION_COMPLETED',
      category: 'Smart Attendance',
      description: `Finalized 10-minute rectification for session ${session._id} (${session.branch} - Sec ${session.section}). Absent: ${totalAbsent}, Alerts Dispatched: ${alertedCount}`,
      details: {
        sessionId: session._id,
        totalPresent,
        totalAbsent,
        totalEnrolled: enrolledStudents.length,
        alertedCount,
        failedCount
      }
    });

    console.log(`[RECTIFICATION RUNNER] Finalized session ${session._id}: ${totalPresent} Present, ${totalAbsent} Absent, ${alertedCount} WhatsApp alerts sent.`);

    return {
      finalized: true,
      sessionId: session._id,
      totalPresent,
      totalAbsent,
      alertedCount,
      failedCount
    };
  } catch (err) {
    console.error(`[RECTIFICATION RUNNER] Failed to finalize session ${sessionId}:`, err);
    return { finalized: false, error: err.message };
  }
}

/**
 * Durable worker loop inspecting all sessions currently past their 10-minute rectification window.
 * Survives server restarts and runs regularly.
 */
async function processPendingSessionRectifications(io = null) {
  try {
    const now = new Date();
    const expiredSessions = await AttendanceSession.find({
      status: 'SUBMITTED',
      rectificationFinalized: false,
      rectificationExpiresAt: { $lte: now }
    }).select('_id');

    if (expiredSessions.length === 0) return { processed: 0 };

    let processed = 0;
    for (const sess of expiredSessions) {
      const res = await finalizeSubmittedSession(sess._id, io);
      if (res.finalized) processed++;
    }

    return { processed, totalEligible: expiredSessions.length };
  } catch (err) {
    console.error('[RECTIFICATION RUNNER] Error processing pending rectifications:', err.message);
    return { processed: 0, error: err.message };
  }
}

// ============================================================
// D. DAILY CAMPUS ABSENCE EVALUATOR
// ============================================================

/**
 * Runs institutional campus-absence evaluation for all active campuses at their configured evaluation time.
 * Identifies students who have no valid campus check-in and dispatches WhatsApp notices.
 * Accounts for: Timezones (IST), Weekends (Sunday), Official Holidays, and Deduplication.
 */
async function runDailyCampusAbsenceEvaluation(io = null) {
  try {
    const ist = getISTDateInfo(new Date());

    // 1. Skip on weekends
    if (ist.isWeekend) {
      return { skipped: true, reason: 'WEEKEND' };
    }

    // 2. Skip on official holidays
    const isHoliday = await isOfficialHoliday(ist.dateKey);
    if (isHoliday) {
      return { skipped: true, reason: 'OFFICIAL_HOLIDAY' };
    }

    const campuses = await Campus.find({ isActive: true });
    let totalEvaluated = 0;
    let totalAbsenceAlerts = 0;

    for (const campus of campuses) {
      const cutoffTime = campus.arrivalCutoffTime || '10:00';
      const evalTime = campus.absenceEvaluationTime || '10:30';

      // Check if current IST time has reached the evaluation time
      if (compareTimeStrings(ist.timeStr, evalTime) < 0) {
        continue; // Not yet evaluation time for this campus
      }

      // Check if evaluation already ran today for this campus
      const runDedupKey = `campus_absence_eval:${campus._id}:${ist.dateKey}`;
      const existingRun = await WhatsAppNotificationLog.findOne({ dedupKey: runDedupKey });
      if (existingRun) {
        continue; // Already evaluated for today
      }

      // Query active enrolled students for this campus
      const students = await User.find({
        role: 'student',
        campusId: campus._id,
        isActive: { $ne: false }
      }).select('name rollNumber branch section campusId guardianContacts');

      // Query all campus arrival logs for this campus and dateKey
      const checkInLogs = await CampusCheckInLog.find({
        campus: campus._id,
        arrivalDateKey: ist.dateKey
      });

      const checkedInUserMap = new Map();
      for (const log of checkInLogs) {
        checkedInUserMap.set(log.user.toString(), log);
      }

      let campusAbsences = 0;

      for (const student of students) {
        totalEvaluated++;
        const sId = student._id.toString();
        const arrivalLog = checkedInUserMap.get(sId);

        // If student has a VERIFIED or PENDING_REVIEW check-in, they are NOT absent
        if (arrivalLog && (arrivalLog.status === 'VERIFIED' || arrivalLog.status === 'PENDING_REVIEW')) {
          continue;
        }

        // Student has NO valid campus check-in. Record/Update CampusCheckInLog with status 'ABSENT'
        campusAbsences++;
        const referenceCode = `CB-ARR-ABS-${ist.dateKey.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

        if (arrivalLog) {
          if (arrivalLog.status !== 'ABSENT') {
            arrivalLog.status = 'ABSENT';
            arrivalLog.verificationMethod = 'SYSTEM_EVALUATION';
            arrivalLog.punctuality = 'UNKNOWN';
            await arrivalLog.save();
          }
        } else {
          try {
            await CampusCheckInLog.create({
              user: student._id,
              campus: campus._id,
              timestamp: new Date(),
              arrivalDateKey: ist.dateKey,
              latitude: null,
              longitude: null,
              accuracy: null,
              calculatedDistanceMeters: null,
              status: 'ABSENT',
              verificationMethod: 'SYSTEM_EVALUATION',
              punctuality: 'UNKNOWN',
              referenceCode
            });
          } catch (logErr) {
            // Unique index collision safe handling
          }
        }

        // Trigger WhatsApp campus absence alert
        const alertRes = await sendCampusAbsenceAlert({
          student,
          campus,
          dateKey: ist.dateKey
        });

        if (alertRes.success) {
          totalAbsenceAlerts++;
        }
      }

      // Record that evaluation completed for this campus today
      await WhatsAppNotificationLog.create({
        dedupKey: runDedupKey,
        category: 'CAMPUS_ABSENCE',
        studentId: campus._id, // placeholder campus sentinel
        studentName: `Campus ${campus.name} Daily Absence Evaluation`,
        senderNumber: OFFICIAL_SENDER_NUMBER,
        campusId: campus._id,
        dateKey: ist.dateKey,
        status: 'DELIVERED',
        messageBody: `Campus absence evaluation completed for ${campus.name}. Total students evaluated: ${students.length}, Absences: ${campusAbsences}`
      });

      console.log(`[CAMPUS ABSENCE EVALUATOR] Evaluated campus ${campus.name}: ${campusAbsences} absent students identified.`);
    }

    return {
      evaluated: true,
      totalEvaluated,
      totalAbsenceAlerts
    };
  } catch (err) {
    console.error('[CAMPUS ABSENCE EVALUATOR] Error during evaluation:', err);
    return { evaluated: false, error: err.message };
  }
}

// ============================================================
// E. SCHEDULER & RUNNER INITIALIZATION
// ============================================================

let intervalRectificationRef = null;
let intervalAbsenceRef = null;

function initAttendanceNotificationJobs(io = null) {
  console.log('[ATTENDANCE NOTIFICATION ENGINE] Initializing durable attendance notification background jobs...');

  // 1. Immediate startup recovery: process any rectifications that expired while the server was down/restarted
  setTimeout(() => {
    processPendingSessionRectifications(io).catch(err => {
      console.warn('[ATTENDANCE NOTIFICATION ENGINE] Startup rectification check warning:', err.message);
    });
    runDailyCampusAbsenceEvaluation(io).catch(err => {
      console.warn('[ATTENDANCE NOTIFICATION ENGINE] Startup absence evaluation warning:', err.message);
    });
  }, 5000);

  // 2. Rectification interval check: every 30 seconds
  if (!intervalRectificationRef) {
    intervalRectificationRef = setInterval(() => {
      processPendingSessionRectifications(io).catch(err => {
        console.warn('[RECTIFICATION RUNNER] Periodic check warning:', err.message);
      });
    }, 30 * 1000);
  }

  // 3. Daily Campus Absence interval check: every 60 seconds
  if (!intervalAbsenceRef) {
    intervalAbsenceRef = setInterval(() => {
      runDailyCampusAbsenceEvaluation(io).catch(err => {
        console.warn('[CAMPUS ABSENCE EVALUATOR] Periodic check warning:', err.message);
      });
    }, 60 * 1000);
  }

  console.log('[ATTENDANCE NOTIFICATION ENGINE] Background runners active: 30s session rectification, 60s campus absence evaluation.');
}

module.exports = {
  getISTDateInfo,
  compareTimeStrings,
  isOfficialHoliday,
  resolveGuardianContact,
  sendCampusLateArrivalAlert,
  sendCampusAbsenceAlert,
  sendCampusArrivalUpdateAlert,
  sendClassroomAbsenceAlert,
  finalizeSubmittedSession,
  processPendingSessionRectifications,
  runDailyCampusAbsenceEvaluation,
  initAttendanceNotificationJobs,
  RECTIFICATION_WINDOW_MS
};
