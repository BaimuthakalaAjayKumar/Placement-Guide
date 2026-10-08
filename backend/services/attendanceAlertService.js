const Notification = require('../models/Notification');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const sendEmail = require('../utils/sendEmail');
const { logActivity } = require('../utils/auditLogger');

// Safe optional WhatsApp integration
let sendWhatsAppMessage = null;
try {
  const waModule = require('../utils/sendWhatsApp');
  sendWhatsAppMessage = waModule.sendWhatsAppMessage;
} catch (e) {
  // Graceful fallback if WhatsApp helper not found
}

/**
 * CAMPUSBRIDGE SMART ATTENDANCE — CENTRALIZED ALERT & NOTIFICATION SERVICE
 *
 * Responsibilities:
 * 1. Single central threshold constant (DEFAULT_ATTENDANCE_THRESHOLD = 75%)
 * 2. Calculate attendance percentage & shortage status
 * 3. Deduplication & Cooldown Policy:
 *    - 7-day reminder cooldown or >= 2% attendance drop
 * 4. Multi-channel dispatch:
 *    - In-app notification with Socket.IO live emission
 *    - Brevo HTTPS transactional email
 *    - Optional parent/guardian notification bridge (disabled by default)
 *    - Optional WhatsApp adapter (separate production configuration required)
 * 5. Comprehensive Audit Logging (Category: 'Smart Attendance')
 * 6. Non-blocking error handling (Notification failure never crashes attendance)
 */

// ============================================================
// CENTRAL CONFIGURATION CONSTANTS
// ============================================================
const DEFAULT_ATTENDANCE_THRESHOLD = 75;
const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days cooldown
const SIGNIFICANT_DROP_PERCENTAGE = 2; // >= 2% drop triggers re-notification

/**
 * Returns the effective attendance threshold for a given context/campus.
 * Central helper preventing hardcoding of 75% in multiple places.
 */
function getShortageThreshold(campusId = null) {
  return DEFAULT_ATTENDANCE_THRESHOLD;
}

/**
 * Computes integer attendance percentage safely.
 */
function calculatePercentage(presentCount, totalCount) {
  if (!totalCount || totalCount <= 0) return 0;
  return Math.round((presentCount / totalCount) * 100);
}

/**
 * Determines whether a percentage falls below the threshold.
 */
function isShortage(percentage, threshold = DEFAULT_ATTENDANCE_THRESHOLD) {
  return percentage < threshold;
}

/**
 * Generates an immutable composite deduplication key.
 */
function generateDedupKey(studentId, subjectId) {
  const sId = studentId?.toString() || 'unknown';
  const subId = subjectId?.toString() || 'overall';
  return `attendance_shortage:${sId}:${subId}`;
}

/**
 * Evaluates whether a shortage notification is currently suppressed by the
 * deduplication or cooldown policy.
 */
async function checkSuppression({ studentId, subjectId, currentPercentage }) {
  try {
    const sId = studentId?._id || studentId;
    const subId = subjectId?._id || subjectId;

    const query = {
      user: sId,
      type: 'attendance_alert'
    };

    if (subId) {
      query['metadata.subjectId'] = subId;
    }

    const lastAlert = await Notification.findOne(query).sort({ createdAt: -1 });
    if (!lastAlert) {
      return { suppressed: false };
    }

    const timeSinceLast = Date.now() - new Date(lastAlert.createdAt).getTime();
    const lastPercentage = lastAlert.metadata?.attendancePercentage ?? 100;
    const percentageDrop = lastPercentage - currentPercentage;

    // If within cooldown AND percentage hasn't significantly worsened:
    if (timeSinceLast < REMINDER_COOLDOWN_MS && percentageDrop < SIGNIFICANT_DROP_PERCENTAGE) {
      return {
        suppressed: true,
        reason: 'COOLDOWN_ACTIVE',
        lastAlertAt: lastAlert.createdAt,
        lastPercentage
      };
    }

    return { suppressed: false };
  } catch (err) {
    console.error('[AttendanceAlertService] Error checking suppression:', err.message);
    return { suppressed: false };
  }
}

/**
 * Dispatches an automated attendance shortage alert across in-app, email,
 * and optional parent/guardian channels.
 */
async function dispatchAttendanceShortageAlert({
  studentId,
  subjectId,
  sessionId = null,
  currentPercentage,
  presentCount,
  totalCount,
  threshold = DEFAULT_ATTENDANCE_THRESHOLD,
  triggeredBy = null,
  io = null,
  req = null
}) {
  try {
    // 1. Verify shortage status first
    if (currentPercentage >= threshold) {
      return {
        notified: false,
        skipped: true,
        reason: 'ABOVE_THRESHOLD',
        percentage: currentPercentage,
        threshold
      };
    }

    const student = await User.findById(studentId).select('+guardianContacts +attendanceNotificationPreferences');
    if (!student || student.role !== 'student') {
      return { notified: false, error: 'Student record not found.' };
    }

    // 2. Resolve Subject details safely
    let subjectName = 'Classroom Course';
    let subjectCode = 'SUBJ';
    if (subjectId) {
      const subjectDoc = await Subject.findById(subjectId).select('name code');
      if (subjectDoc) {
        subjectName = subjectDoc.name;
        subjectCode = subjectDoc.code || 'SUBJ';
      }
    }

    // 3. Deduplication Check
    const suppression = await checkSuppression({
      studentId: student._id,
      subjectId,
      currentPercentage
    });

    if (suppression.suppressed) {
      await logActivity({
        userId: student._id,
        user: student,
        action: 'ATTENDANCE_ALERT_SUPPRESSED_DUPLICATE',
        category: 'Smart Attendance',
        description: `Suppressed duplicate attendance alert for ${student.name} in ${subjectName} (Cooldown active)`,
        details: {
          studentId: student._id,
          subjectId,
          subjectName,
          currentPercentage,
          threshold,
          reason: suppression.reason,
          lastAlertAt: suppression.lastAlertAt
        },
        req
      });

      return {
        notified: false,
        suppressed: true,
        reason: suppression.reason,
        studentId: student._id,
        studentName: student.name
      };
    }

    // 4. Construct Safe Alert Payload (Never expose GPS or QR secrets)
    const alertTitle = 'Attendance Shortage Alert';
    const alertMessage = `Your attendance in ${subjectName} is below the required ${threshold}%. (Current: ${currentPercentage}%, ${presentCount}/${totalCount} sessions attended). Please attend upcoming classes to fulfill the mandatory attendance criterion.`;
    const recommendedAction = `Please attend upcoming classes to fulfill the mandatory ${threshold}% attendance criterion.`;
    const dedupKey = generateDedupKey(student._id, subjectId);

    // 5. Create In-App Notification Record
    const notification = await Notification.create({
      user: student._id,
      type: 'attendance_alert',
      message: alertMessage,
      dedupKey,
      metadata: {
        subjectId: subjectId || null,
        sessionId: sessionId || null,
        subjectName,
        attendancePercentage: currentPercentage,
        studentName: student.name,
        presentCount,
        totalCount,
        threshold,
        recommendedAction,
        guardianNotified: false
      }
    });

    // 6. Real-time In-App Dispatch via Socket.IO
    if (io) {
      const socketPayload = {
        _id: notification._id,
        id: notification._id,
        type: 'attendance_alert',
        title: alertTitle,
        message: alertMessage,
        subjectName,
        attendancePercentage: currentPercentage,
        presentCount,
        totalCount,
        threshold,
        recommendedAction,
        createdAt: notification.createdAt
      };

      io.to(`user_${student._id}`).emit('notification', socketPayload);
      io.to(`user_${student._id}`).emit('attendance_alert', socketPayload);
    }

    // 7. Transactional Email Dispatch (Brevo HTTPS)
    let emailStatus = 'skipped';
    const prefs = student.attendanceNotificationPreferences || {};
    const emailAllowed = prefs.email !== false; // Default true

    if (student.email && emailAllowed) {
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="border-bottom: 2px solid #e11d48; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #e11d48; margin: 0;">CampusBridge Attendance Alert</h2>
              <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Official Institutional Compliance Notice</p>
            </div>
            <p>Dear <strong>${student.name}</strong>,</p>
            <p>This automated advisory informs you that your cumulative classroom attendance for <strong>${subjectName}</strong> has fallen below the mandatory institutional requirement.</p>
            
            <div style="background: #fff1f2; border-left: 4px solid #e11d48; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Course / Subject:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${subjectName} (${subjectCode})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Current Attendance:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #e11d48;">${currentPercentage}%</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Required Threshold:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${threshold}%</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Sessions Attended:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${presentCount} of ${totalCount}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #334155;">
              <strong>Recommended Action:</strong> ${recommendedAction}
            </p>
            <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              This is a system-generated alert from CampusBridge Smart Attendance. Please do not reply directly to this email.
            </p>
          </div>
        `;

        await sendEmail({
          to: student.email,
          subject: 'CampusBridge Attendance Alert',
          html: emailHtml,
          text: `Dear ${student.name},\n\nYour attendance in ${subjectName} is below the required ${threshold}%.\nCurrent Attendance: ${currentPercentage}%\nSessions Attended: ${presentCount}/${totalCount}\nRecommended Action: ${recommendedAction}\n\nCampusBridge Smart Attendance`
        });

        emailStatus = 'sent';

        await logActivity({
          userId: student._id,
          user: student,
          action: 'ATTENDANCE_EMAIL_DISPATCHED',
          category: 'Smart Attendance',
          description: `Dispatched attendance alert email to ${student.email} for ${subjectName}`,
          details: { email: student.email, subjectName, currentPercentage, threshold },
          req
        });
      } catch (emailErr) {
        // Attendance marking must NOT fail just because notification delivery fails
        emailStatus = 'failed';
        console.error('[AttendanceAlertService] Email dispatch failed (safe recovery):', emailErr.message);

        await logActivity({
          userId: student._id,
          user: student,
          action: 'ATTENDANCE_EMAIL_FAILED',
          category: 'Smart Attendance',
          description: `Failed to deliver attendance alert email to ${student.email}: ${emailErr.message}`,
          details: { email: student.email, subjectName, error: emailErr.message },
          req
        });
      }
    }

    // 8. Parent / Guardian Notification Bridge (Part G)
    let guardianStatus = 'disabled';
    const guardianOptIn = prefs.parentOptIn === true;
    const guardianContacts = Array.isArray(student.guardianContacts) ? student.guardianContacts : [];
    const activeGuardians = guardianContacts.filter(g => g.enabled && (g.email || g.phone));

    if (guardianOptIn && activeGuardians.length > 0) {
      for (const guardian of activeGuardians) {
        if (guardian.email) {
          try {
            const guardianHtml = `
              <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h3 style="color: #e11d48; margin-top: 0;">CampusBridge Student Attendance Alert</h3>
                <p>Dear Parent/Guardian of <strong>${student.name}</strong> (${student.rollNumber || 'Student'}),</p>
                <p>This institutional notification informs you that your ward's classroom attendance in <strong>${subjectName}</strong> is currently <strong>${currentPercentage}%</strong>, which is below the mandatory <strong>${threshold}%</strong> requirement.</p>
                <p>Total Sessions: ${presentCount} attended out of ${totalCount} conducted.</p>
                <p>We advise discussing this with your ward to ensure regular attendance.</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 20px;">CampusBridge Academic Administration</p>
              </div>
            `;

            await sendEmail({
              to: guardian.email,
              subject: `CampusBridge Student Attendance Alert: ${student.name}`,
              html: guardianHtml,
              text: `Parent Attendance Alert: ${student.name}'s attendance in ${subjectName} is currently ${currentPercentage}% (below required ${threshold}%).`
            });

            guardianStatus = 'dispatched';
            notification.metadata.guardianNotified = true;
            await notification.save();

            await logActivity({
              userId: student._id,
              user: student,
              action: 'ATTENDANCE_PARENT_ALERT_DISPATCHED',
              category: 'Smart Attendance',
              description: `Dispatched parent attendance notice to ${guardian.email} for student ${student.name}`,
              details: { guardianEmail: guardian.email, studentName: student.name, subjectName, currentPercentage },
              req
            });
          } catch (gErr) {
            console.error('[AttendanceAlertService] Parent email notice failed:', gErr.message);
          }
        }
      }
    }

    // 9. Primary Audit Log
    await logActivity({
      userId: student._id,
      user: student,
      action: 'ATTENDANCE_SHORTAGE_ALERT_DISPATCHED',
      category: 'Smart Attendance',
      description: `Automated shortage alert created for ${student.name} (${student.rollNumber}) in ${subjectName} (${currentPercentage}%)`,
      details: {
        studentId: student._id,
        subjectId,
        subjectName,
        currentPercentage,
        threshold,
        presentCount,
        totalCount,
        emailStatus,
        guardianStatus,
        triggeredBy: triggeredBy ? triggeredBy.email : 'system'
      },
      req
    });

    return {
      notified: true,
      notificationId: notification._id,
      studentId: student._id,
      studentName: student.name,
      percentage: currentPercentage,
      emailStatus,
      guardianStatus
    };
  } catch (err) {
    console.error('[AttendanceAlertService] Fatal error in dispatchAttendanceShortageAlert:', err.message);
    return { notified: false, error: err.message };
  }
}

/**
 * Re-evaluates attendance and dispatches alerts for all students in a session
 * upon session closure.
 */
async function evaluateSessionShortages({ session, io = null, req = null, triggeredBy = null }) {
  try {
    if (!session || !session._id) return { evaluated: 0, alerted: 0 };

    const records = await AttendanceRecord.find({ sessionId: session._id });
    if (!records || records.length === 0) return { evaluated: 0, alerted: 0 };

    let alertedCount = 0;
    const threshold = getShortageThreshold(session.campusId);

    // Group all student records for this subject to compute cumulative ratios
    for (const record of records) {
      const studentId = record.studentId;
      if (!studentId) continue;

      // Find all session records for this student and this subject
      const subjectSessions = await AttendanceSession.find({
        subjectId: session.subjectId,
        branch: session.branch,
        section: session.section,
        status: 'FINALIZED'
      }).select('_id');

      const subjectSessionIds = subjectSessions.map(s => s._id);
      if (subjectSessionIds.length === 0) continue;

      const studentRecords = await AttendanceRecord.find({
        sessionId: { $in: subjectSessionIds },
        studentId
      });

      const totalCount = studentRecords.length;
      const presentCount = studentRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
      const percentage = calculatePercentage(presentCount, totalCount);

      if (isShortage(percentage, threshold)) {
        const result = await dispatchAttendanceShortageAlert({
          studentId,
          subjectId: session.subjectId,
          sessionId: session._id,
          currentPercentage: percentage,
          presentCount,
          totalCount,
          threshold,
          triggeredBy,
          io,
          req
        });

        if (result.notified) alertedCount++;
      }
    }

    return { evaluated: records.length, alerted: alertedCount };
  } catch (err) {
    console.error('[AttendanceAlertService] Error evaluating session shortages:', err.message);
    return { evaluated: 0, alerted: 0, error: err.message };
  }
}

/**
 * Evaluates a single student's attendance in a subject and dispatches an alert
 * if below threshold.
 */
async function evaluateStudentForSubject({ studentId, subjectId, io = null, req = null, triggeredBy = null }) {
  try {
    if (!studentId || !subjectId) return { evaluated: false };

    const sessions = await AttendanceSession.find({
      subjectId,
      status: 'FINALIZED'
    }).select('_id campusId');

    const sessionIds = sessions.map(s => s._id);
    if (sessionIds.length === 0) return { evaluated: false };

    const records = await AttendanceRecord.find({
      sessionId: { $in: sessionIds },
      studentId
    });

    const totalCount = records.length;
    if (totalCount === 0) return { evaluated: false };

    const presentCount = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
    const percentage = calculatePercentage(presentCount, totalCount);
    const threshold = getShortageThreshold();

    if (isShortage(percentage, threshold)) {
      return await dispatchAttendanceShortageAlert({
        studentId,
        subjectId,
        currentPercentage: percentage,
        presentCount,
        totalCount,
        threshold,
        triggeredBy,
        io,
        req
      });
    }

    return { evaluated: true, isShortage: false, percentage };
  } catch (err) {
    console.error('[AttendanceAlertService] Error evaluating student for subject:', err.message);
    return { evaluated: false, error: err.message };
  }
}

module.exports = {
  DEFAULT_ATTENDANCE_THRESHOLD,
  REMINDER_COOLDOWN_MS,
  SIGNIFICANT_DROP_PERCENTAGE,
  getShortageThreshold,
  calculatePercentage,
  isShortage,
  generateDedupKey,
  checkSuppression,
  dispatchAttendanceShortageAlert,
  evaluateSessionShortages,
  evaluateStudentForSubject
};
