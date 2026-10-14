/**
 * AUTOMATED VERIFICATION SUITE: Unified Automatic WhatsApp Attendance Notification Workflow
 * CAMPUSBRIDGE — Tests for:
 * 1. Mobile number validation & verified sender identity (9182967014)
 * 2. Campus arrival cutoff boundary & late check-in parent alerts
 * 3. Daily campus absence evaluation (weekends, holidays, absence alerts)
 * 4. Late arrival check-in after absence notification (superseding absence without duplicate)
 * 5. Classroom 10-minute rectification window, timer persistence, and finalization
 * 6. Automated classroom absence parent WhatsApp notification (student, subject, faculty, date, time)
 * 7. Independence of campus-arrival vs classroom attendance
 * 8. Missing guardian phone failure handling (no silent success)
 * 9. Duplicate prevention / idempotency across all notification categories
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Campus = require('../models/Campus');
const Subject = require('../models/Subject');
const Holiday = require('../models/Holiday');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const CampusCheckInLog = require('../models/CampusCheckInLog');
const WhatsAppNotificationLog = require('../models/WhatsAppNotificationLog');

const {
  sendWhatsAppMessage,
  normalizeIndianMobileNumber,
  verifySenderConfiguration,
  OFFICIAL_SENDER_NUMBER,
  OFFICIAL_SENDER_INTL
} = require('../utils/sendWhatsApp');

const {
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
  runDailyCampusAbsenceEvaluation
} = require('../services/attendanceNotificationService');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('CAMPUSBRIDGE — WHATSAPP ATTENDANCE WORKFLOW AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  // Connect to DB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: SENDER & RECIPIENT PHONE VALIDATION (sendWhatsApp.js)
    // -------------------------------------------------------------
    console.log('TEST 1: Sender & Recipient Phone Validation & Verification');
    const senderCheck = verifySenderConfiguration();
    assert(senderCheck.valid === true, 'Verified sender identity is valid 10-digit Indian mobile number');
    assert(senderCheck.senderRaw === '9182967014', 'Sender raw number is strictly 9182967014');
    assert(senderCheck.senderIntl === '+919182967014', 'Sender international format is +919182967014');
    assert(OFFICIAL_SENDER_NUMBER === '9182967014', 'OFFICIAL_SENDER_NUMBER constant matches 9182967014');

    // Test valid Indian phone normalization
    assert(normalizeIndianMobileNumber('9876543210') === '919876543210', 'Normalizes 10-digit mobile number with 91 prefix');
    assert(normalizeIndianMobileNumber('+91 98765 43210') === '919876543210', 'Normalizes +91 formatted mobile with spaces');
    assert(normalizeIndianMobileNumber('09876543210') === '919876543210', 'Normalizes 11-digit mobile starting with 0');

    // Test invalid / missing numbers (Requirement C.6: No silent success)
    assert(normalizeIndianMobileNumber('') === null, 'Rejects empty recipient phone number');
    assert(normalizeIndianMobileNumber(null) === null, 'Rejects null recipient phone number');
    assert(normalizeIndianMobileNumber('12345') === null, 'Rejects incomplete (<10 digits) phone number');
    assert(normalizeIndianMobileNumber('1234567890') === null, 'Rejects invalid mobile number starting with 1');

    const invalidDispatchResult = await sendWhatsAppMessage({
      to: '',
      message: 'Test message'
    });
    assert(invalidDispatchResult.success === false, 'sendWhatsAppMessage fails on empty recipient without fallback');
    assert(invalidDispatchResult.error === 'INVALID_RECIPIENT_NUMBER', 'sendWhatsAppMessage reports clear error INVALID_RECIPIENT_NUMBER');

    // -------------------------------------------------------------
    // TEST 2: CAMPUS ARRIVAL CUTOFF & LATE ARRIVAL ALERT
    // -------------------------------------------------------------
    console.log('\nTEST 2: Campus Arrival Cutoff Boundary & Late Check-in Alert');

    // Find or create a test campus
    let testCampus = await Campus.findOne({ code: 'CB-TEST-CAMPUS' });
    if (!testCampus) {
      testCampus = await Campus.create({
        name: 'CampusBridge Test Campus',
        code: 'CB-TEST-CAMPUS',
        domain: 'cb-test.edu',
        arrivalCutoffTime: '10:00',
        absenceEvaluationTime: '10:30',
        latitude: 17.5200,
        longitude: 78.3600,
        arrivalPerimeterRadiusMeters: 500
      });
    }

    // Create a mock student with verified guardian
    const testDateKey = '2026-10-12';
    const testRollNum = `CB-ROLL-${Date.now().toString().slice(-4)}`;

    // Clean prior test logs for test isolation
    await CampusCheckInLog.deleteMany({ referenceCode: { $regex: /^TEST-/ } });
    await WhatsAppNotificationLog.deleteMany({ dedupKey: { $regex: /^test_/ } });

    const mockStudent = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Ajay Test Student',
      rollNumber: testRollNum,
      guardianContacts: [
        {
          name: 'Ramesh Parent',
          relationship: 'Father',
          phone: '9876543210',
          enabled: true
        }
      ]
    };

    // Test cutoff comparison logic
    assert(compareTimeStrings('09:45', '10:00') < 0, '09:45 is strictly before 10:00 cutoff (ON_TIME)');
    assert(compareTimeStrings('10:00', '10:00') === 0, '10:00 is exactly at cutoff boundary (ON_TIME)');
    assert(compareTimeStrings('10:01', '10:00') > 0, '10:01 is strictly after cutoff (LATE)');
    assert(compareTimeStrings('10:35', '10:00') > 0, '10:35 is after cutoff (LATE)');

    // Mock late arrival log
    const mockLateLog = {
      _id: new mongoose.Types.ObjectId(),
      user: mockStudent._id,
      campus: testCampus._id,
      timestamp: new Date('2026-10-12T10:15:00Z'),
      punctuality: 'LATE',
      lateAlertSent: false,
      save: async () => {}
    };

    // Send late arrival alert
    const lateAlertRes = await sendCampusLateArrivalAlert({
      student: mockStudent,
      campus: testCampus,
      checkInLog: mockLateLog
    });
    assert(lateAlertRes.success === true, 'Dispatched campus late arrival WhatsApp notification');
    assert(lateAlertRes.status === 'DELIVERED', 'Recorded status DELIVERED for valid guardian phone');

    // Test duplicate prevention for late arrival
    const duplicateLateAlert = await sendCampusLateArrivalAlert({
      student: mockStudent,
      campus: testCampus,
      checkInLog: mockLateLog
    });
    assert(duplicateLateAlert.skipped === true, 'Duplicate late arrival notification suppressed (idempotent)');
    assert(duplicateLateAlert.reason === 'ALREADY_DISPATCHED', 'Skipped reason recorded as ALREADY_DISPATCHED');

    // -------------------------------------------------------------
    // TEST 3: CAMPUS ABSENCE EVALUATION & CALENDAR RULES
    // -------------------------------------------------------------
    console.log('\nTEST 3: Daily Campus Absence Evaluation & Calendar Rules');

    // Weekend evaluation check (Sunday)
    const sundayDate = new Date('2026-10-18T10:30:00Z'); // A Sunday
    const sundayInfo = getISTDateInfo(sundayDate);
    assert(sundayInfo.isWeekend === true, 'Identifies Sunday as non-instructional weekend day');

    // Holiday evaluation check
    await Holiday.deleteMany({ date: '2026-10-12' });
    await Holiday.create({ date: '2026-10-12', description: 'Institutional Holiday Test' });
    const isHolidayCheck = await isOfficialHoliday('2026-10-12');
    assert(isHolidayCheck === true, 'Holiday table recognizes registered institutional holidays');
    await Holiday.deleteMany({ date: '2026-10-12' }); // Clean up

    // Mock student without campus check-in receiving absence notification
    const absentStudent = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Priya Absent Student',
      rollNumber: `CB-ROLL-${Date.now().toString().slice(-4)}`,
      guardianContacts: [
        {
          name: 'Lakshmi Parent',
          relationship: 'Mother',
          phone: '9123456780',
          enabled: true
        }
      ]
    };

    const absenceAlertRes = await sendCampusAbsenceAlert({
      student: absentStudent,
      campus: testCampus,
      dateKey: testDateKey
    });
    assert(absenceAlertRes.success === true, 'Dispatched campus day absence WhatsApp notification');
    assert(absenceAlertRes.status === 'DELIVERED', 'Absence notice recorded as DELIVERED');

    // Duplicate prevention for campus absence
    const dupAbsence = await sendCampusAbsenceAlert({
      student: absentStudent,
      campus: testCampus,
      dateKey: testDateKey
    });
    assert(dupAbsence.skipped === true, 'Duplicate campus absence notification suppressed');

    // -------------------------------------------------------------
    // TEST 4: CHECK-IN AFTER ABSENCE NOTICE (SUPERSEDING UPDATE)
    // -------------------------------------------------------------
    console.log('\nTEST 4: Check-in After Absence Notice (Superseding Update)');

    // When the student later checks into campus:
    const mockPostAbsenceLog = {
      _id: new mongoose.Types.ObjectId(),
      user: absentStudent._id,
      campus: testCampus._id,
      timestamp: new Date('2026-10-12T11:00:00Z'),
      punctuality: 'LATE',
      absenceAlertSuperseded: false,
      save: async () => {}
    };

    const arrivalUpdateRes = await sendCampusArrivalUpdateAlert({
      student: absentStudent,
      campus: testCampus,
      checkInLog: mockPostAbsenceLog
    });
    assert(arrivalUpdateRes.success === true, 'Dispatched campus arrival update superseding earlier absence');
    assert(arrivalUpdateRes.status === 'DELIVERED', 'Arrival update alert delivered successfully');

    // Duplicate check on superseding update
    const dupArrivalUpdate = await sendCampusArrivalUpdateAlert({
      student: absentStudent,
      campus: testCampus,
      checkInLog: mockPostAbsenceLog
    });
    assert(dupArrivalUpdate.skipped === true, 'Duplicate arrival update alert suppressed');

    // -------------------------------------------------------------
    // TEST 5: CLASSROOM 10-MINUTE RECTIFICATION & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\nTEST 5: Classroom 10-Minute Rectification Period & Timer Persistence');

    const testSubject = await Subject.findOne() || { _id: new mongoose.Types.ObjectId(), name: 'Data Structures', code: 'CS201' };
    const mockFaculty = { _id: new mongoose.Types.ObjectId(), name: 'Dr. Srinivas Faculty', email: 'srinivas@campusbridge.edu' };

    // Create a submitted session with a 10-minute rectification window
    const now = new Date();
    const futureRectification = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes in future

    const submittedSession = await AttendanceSession.create({
      campusId: testCampus._id,
      departmentId: testCampus._id,
      branch: 'TEST_CSE',
      section: 'A',
      subjectId: testSubject._id,
      facultyId: mockFaculty._id,
      academicYear: '2026-2027',
      status: 'SUBMITTED',
      attendanceClosed: true,
      rectificationExpiresAt: futureRectification,
      rectificationFinalized: false,
      absenceAlertsDispatched: false
    });

    assert(submittedSession.status === 'SUBMITTED', 'Session enters SUBMITTED status on faculty submission');
    assert(submittedSession.rectificationExpiresAt.getTime() > now.getTime(), '10-minute rectification timer is set in the future');
    assert(submittedSession.rectificationFinalized === false, 'Session is not prematurely finalized');

    // Check that pending runner does NOT finalize sessions before the 10-minute period expires (Requirement B.8)
    const earlyCheck = await processPendingSessionRectifications();
    const unchangedSession = await AttendanceSession.findById(submittedSession._id);
    assert(unchangedSession.status === 'SUBMITTED', 'Session remains SUBMITTED while rectification window is active');
    assert(unchangedSession.rectificationFinalized === false, 'Zero absence alerts dispatched before 10-minute window expires');

    // Simulate timer expiry / server restart recovery:
    // Update rectificationExpiresAt to the past
    submittedSession.rectificationExpiresAt = new Date(Date.now() - 5000); // Expired 5 seconds ago
    await submittedSession.save();

    // Run durable recovery processor
    const recoveryRes = await processPendingSessionRectifications();
    assert(recoveryRes.processed >= 1, 'Durable runner processes expired rectification session upon execution');

    const finalizedSession = await AttendanceSession.findById(submittedSession._id);
    assert(finalizedSession.status === 'FINALIZED', 'Session automatically transitions to FINALIZED after 10-minute window');
    assert(finalizedSession.rectificationFinalized === true, 'Session is durably marked as rectificationFinalized: true');
    assert(finalizedSession.absenceAlertsDispatched === true, 'Classroom absence alerts marked as dispatched');

    // Duplicate runner execution check
    const repeatRunRes = await processPendingSessionRectifications();
    assert(repeatRunRes.processed === 0, 'Durable runner performs zero redundant processing on repeat executions');

    // -------------------------------------------------------------
    // TEST 6: CLASSROOM ABSENCE NOTIFICATION CONTENT
    // -------------------------------------------------------------
    console.log('\nTEST 6: Classroom Absence Notification Content & Independence');

    const classAbsentStudent = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Kavita Classroom Absent',
      rollNumber: `CB-ROLL-${Date.now().toString().slice(-4)}`,
      guardianContacts: [
        {
          name: 'Venkatesh Parent',
          relationship: 'Father',
          phone: '9848022338',
          enabled: true
        }
      ]
    };

    const classroomAbsenceRes = await sendClassroomAbsenceAlert({
      student: classAbsentStudent,
      session: finalizedSession,
      subject: testSubject,
      faculty: mockFaculty
    });
    assert(classroomAbsenceRes.success === true, 'Dispatched classroom absence WhatsApp notification');
    assert(classroomAbsenceRes.status === 'DELIVERED', 'Classroom absence notification status is DELIVERED');

    // Check WhatsApp notification log content
    const loggedNotice = await WhatsAppNotificationLog.findById(classroomAbsenceRes.logId);
    assert(loggedNotice !== null, 'Logged notification record found in database');
    assert(loggedNotice.category === 'CLASSROOM_ABSENCE', 'Category is strictly CLASSROOM_ABSENCE');
    assert(loggedNotice.messageBody.includes(classAbsentStudent.name), 'Notice includes student name');
    assert(loggedNotice.messageBody.includes(testSubject.name), 'Notice includes course / subject name');
    assert(loggedNotice.messageBody.includes(mockFaculty.name), 'Notice includes faculty name');
    assert(loggedNotice.messageBody.includes('Campus arrival attendance is recorded separately'), 'Notice explicitly states campus and classroom attendance are separate');

    // Duplicate prevention for classroom absence
    const dupClassroomAlert = await sendClassroomAbsenceAlert({
      student: classAbsentStudent,
      session: finalizedSession,
      subject: testSubject,
      faculty: mockFaculty
    });
    assert(dupClassroomAlert.skipped === true, 'Duplicate classroom absence alert suppressed');

    // -------------------------------------------------------------
    // TEST 7: MISSING / INVALID GUARDIAN PHONE FAILURE HANDLING
    // -------------------------------------------------------------
    console.log('\nTEST 7: Missing / Invalid Guardian Phone Failure Handling');

    const studentWithoutGuardianPhone = {
      _id: new mongoose.Types.ObjectId(),
      name: 'No Phone Student',
      rollNumber: 'CB-NOPHONE-01',
      guardianContacts: [
        {
          name: 'No Phone Parent',
          relationship: 'Guardian',
          phone: '', // Empty
          enabled: true
        }
      ]
    };

    const failedClassroomAlert = await sendClassroomAbsenceAlert({
      student: studentWithoutGuardianPhone,
      session: finalizedSession,
      subject: testSubject,
      faculty: mockFaculty
    });
    assert(failedClassroomAlert.success === false, 'Notification fails gracefully when guardian phone is missing');
    assert(failedClassroomAlert.status === 'FAILED', 'Records clear status FAILED rather than silently reporting success');
    assert(failedClassroomAlert.error === 'MISSING_GUARDIAN_PHONE', 'Records error code MISSING_GUARDIAN_PHONE');

    const failedLog = await WhatsAppNotificationLog.findById(failedClassroomAlert.logId);
    assert(failedLog !== null, 'Failure is durably recorded in WhatsAppNotificationLog');
    assert(failedLog.status === 'FAILED', 'Log entry has status FAILED');
    assert(failedLog.errorCode === 'MISSING_GUARDIAN_PHONE', 'Log entry has errorCode MISSING_GUARDIAN_PHONE');

    // Clean up temporary test sessions
    await AttendanceSession.findByIdAndDelete(submittedSession._id);
    await AttendanceRecord.deleteMany({ sessionId: submittedSession._id });
    await Campus.findByIdAndDelete(testCampus._id);

    console.log('\n===============================================================');
    console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('===============================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite encountered fatal error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
