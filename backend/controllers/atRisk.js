const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const Resume = require('../models/Resume');
const MockInterview = require('../models/MockInterview');
const Notification = require('../models/Notification');
const { logActivity } = require('../utils/auditLogger');
const sendEmail = require('../utils/sendEmail');

// Helper to get portal base URL for email links
const getPortalUrl = () => {
  return process.env.FRONTEND_URL || 'https://placement-guide-nu.vercel.app';
};

// Helper: Dispatch 5-Day Inactivity Warning Email & In-App Notification
const sendInactivityWarningEmail = async (student, daysInactive) => {
  try {
    const portalUrl = getPortalUrl();
    const emailSubject = '⚠️ Urgent Placement Portal Alert: 5-Day Inactivity Warning';
    const emailText = `Dear ${student.name},\n\nOur system detected that you have not logged in or practiced on the GRIET Placement Portal for ${daysInactive} consecutive days.\n\nConsistent daily preparation is critical for campus placement selection. Please note that accounts with 7 days of inactivity will be locked by the Administrator.\n\nPlease log in today to maintain your active account status: ${portalUrl}/login\n\nBest regards,\nTraining & Placement Cell / Main Admin`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">⚠️ 5-DAY INACTIVITY WARNING</h1>
          <p style="margin: 6px 0 0 0; color: #fef3c7; font-size: 14px;">GRIET Placement Preparation &amp; Training Cell</p>
        </div>

        <div style="padding: 26px 28px;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${student.name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            Our automated student monitoring engine detected that you have been <strong>inactive on the placement portal for ${daysInactive} consecutive days</strong>. No platform sessions, coding challenges, or test submissions have been registered during this time.
          </p>

          <div style="background: #1e293b; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 6px;">
            <h4 style="margin: 0 0 8px 0; color: #fbbf24; font-size: 15px;">⚠️ Urgent Policy Notice: 7-Day Lock Threshold</h4>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
              As per college placement preparation guidelines, if a student is inactive for <strong>7 days</strong>, the <strong>Student Dashboard will be locked by the Administrator and Main Admin</strong>. Once locked, access to aptitude practice, job drives, and coding workspaces is blocked until administrative reinstatement.
            </p>
          </div>

          <div style="background: #111827; padding: 14px 18px; border-radius: 8px; margin: 18px 0; border: 1px solid #1f2937;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Student Roll No:</td>
                <td style="color: #e2e8f0; font-weight: 600; padding: 4px 0;">${student.rollNumber || 'N/A'}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Department &amp; Section:</td>
                <td style="color: #e2e8f0; font-weight: 600; padding: 4px 0;">${student.branch || 'CSE'} ${student.section ? `(${student.section})` : ''}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Current Inactivity Streak:</td>
                <td style="color: #f59e0b; font-weight: 700; padding: 4px 0;">${daysInactive} Days</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Remaining Time Before Lock:</td>
                <td style="color: #ef4444; font-weight: 700; padding: 4px 0;">${Math.max(0, 7 - daysInactive)} Days</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${portalUrl}/login" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
              🚀 Log In &amp; Resume Preparation Now
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 14px; margin-top: 24px; text-align: center;">
            This is an automated system alert sent to your registered college email. If you have any technical or medical constraints, please contact your faculty coordinator immediately.
          </p>
        </div>
      </div>
    `;

    // 1. Send Email
    if (student.email) {
      await sendEmail({
        to: student.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      console.log(`[AT-RISK] 5-Day Inactivity Warning Email dispatched to ${student.email}`);
    }

    // 2. In-App Notification
    await Notification.create({
      user: student._id,
      type: 'general',
      message: `⚠️ Urgent 5-Day Inactivity Alert: You have been inactive for ${daysInactive} days. Dashboards inactive for 7 days will be locked by the Administrator.`,
      metadata: {
        inactivityDays: daysInactive,
        type: '5_DAY_INACTIVITY_WARNING'
      }
    });

    // 3. Update User Record
    await User.findByIdAndUpdate(student._id, {
      inactivityWarningSentAt: new Date()
    });

  } catch (err) {
    console.warn(`[AT-RISK] Failed to send 5-day warning to ${student.email}:`, err.message);
  }
};

// Helper: Dispatch Dashboard Locked Notification Email
const sendDashboardLockedEmail = async (student, reason, adminName) => {
  try {
    const portalUrl = getPortalUrl();
    const emailSubject = '🔒 Urgent: Your Student Dashboard Has Been Locked';
    const emailText = `Dear ${student.name},\n\nYour Student Dashboard has been locked by the Administrator / Main Admin (${adminName}).\nReason: ${reason}\n\nTo restore your access, please contact your College Administrator or Training & Placement Officer.\n\nPortal: ${portalUrl}`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #dc2626, #7f1d1d); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">🔒 DASHBOARD LOCKED</h1>
          <p style="margin: 6px 0 0 0; color: #fee2e2; font-size: 14px;">Policy Compliance Enforcement Action</p>
        </div>

        <div style="padding: 26px 28px;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${student.name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            Your Student Dashboard on the <strong>GRIET Placement Preparation Portal has been locked</strong> by the <strong>Administrator / Main Admin</strong>.
          </p>

          <div style="background: #1e293b; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 20px 0; border-radius: 6px;">
            <h4 style="margin: 0 0 6px 0; color: #f87171; font-size: 15px;">Lock Justification</h4>
            <p style="margin: 0; font-size: 14px; color: #e2e8f0; font-weight: 600;">
              ${reason || 'Prolonged platform inactivity (7+ days threshold reached)'}
            </p>
            <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8;">
              Action Authorized By: ${adminName || 'Main Admin / TPO Coordinator'}
            </p>
          </div>

          <div style="background: #111827; padding: 14px 18px; border-radius: 8px; margin: 18px 0; border: 1px solid #1f2937; font-size: 13px; line-height: 1.6; color: #94a3b8;">
            <strong style="color: #f1f5f9;">Next Steps to Restore Access:</strong>
            <ol style="margin: 8px 0 0 0; padding-left: 20px;">
              <li>Contact your assigned Faculty Coordinator or Training &amp; Placement Cell.</li>
              <li>Provide justification for the period of inactivity.</li>
              <li>Once approved, the Main Admin will unlock your dashboard.</li>
            </ol>
          </div>

          <p style="font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 14px; margin-top: 24px; text-align: center;">
            Training &amp; Placement Cell, Gokaraju Rangaraju Institute of Engineering &amp; Technology (GRIET).
          </p>
        </div>
      </div>
    `;

    if (student.email) {
      await sendEmail({
        to: student.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
    }

    await Notification.create({
      user: student._id,
      type: 'general',
      message: `🔒 Account Alert: Your Student Dashboard has been locked by ${adminName}. Reason: ${reason}`,
      metadata: {
        type: 'DASHBOARD_LOCKED',
        reason,
        adminName
      }
    });
  } catch (err) {
    console.warn(`[AT-RISK] Failed to send lock email to ${student.email}:`, err.message);
  }
};

// Helper: Dispatch Dashboard Unlocked Notification Email
const sendDashboardUnlockedEmail = async (student, adminName) => {
  try {
    const portalUrl = getPortalUrl();
    const emailSubject = '🔓 Access Restored: Your Student Dashboard Has Been Unlocked';
    const emailText = `Dear ${student.name},\n\nYour Student Dashboard access has been restored by ${adminName}.\nPlease log in immediately and resume your placement preparation:\n${portalUrl}/login`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">🔓 DASHBOARD UNLOCKED</h1>
          <p style="margin: 6px 0 0 0; color: #d1fae5; font-size: 14px;">Access Successfully Restored</p>
        </div>

        <div style="padding: 26px 28px;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${student.name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            We are pleased to inform you that your <strong>Student Dashboard has been unlocked by ${adminName}</strong>. You now have full access to placement drives, aptitude assessments, and mock interviews.
          </p>

          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${portalUrl}/login" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              🚀 Open Dashboard &amp; Start Practicing
            </a>
          </div>
        </div>
      </div>
    `;

    if (student.email) {
      await sendEmail({
        to: student.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
    }

    await Notification.create({
      user: student._id,
      type: 'general',
      message: `🔓 Access Restored: Your Student Dashboard has been unlocked by ${adminName}.`,
      metadata: {
        type: 'DASHBOARD_UNLOCKED',
        adminName
      }
    });
  } catch (err) {
    console.warn(`[AT-RISK] Failed to send unlock email to ${student.email}:`, err.message);
  }
};

// Helper to evaluate at-risk status of a list of students & trigger 5-day email notifications
const evaluateStudentRisk = async (students) => {
  const studentIds = students.map(s => s._id);

  // Parallel fetch auxiliary records for performance
  const [testAttempts, resumes, mockInterviews] = await Promise.all([
    TestAttempt.find({ user: { $in: studentIds } }).sort({ createdAt: -1 }),
    Resume.find({ user: { $in: studentIds } }),
    MockInterview.find({ user: { $in: studentIds } })
  ]);

  // Index by user ID
  const testMap = {};
  testAttempts.forEach(t => {
    const uid = String(t.user);
    if (!testMap[uid]) testMap[uid] = [];
    testMap[uid].push(t);
  });

  const resumeMap = {};
  resumes.forEach(r => {
    resumeMap[String(r.user)] = r;
  });

  const interviewMap = {};
  mockInterviews.forEach(m => {
    interviewMap[String(m.user)] = true;
  });

  const now = Date.now();
  const results = [];

  for (const student of students) {
    const uid = String(student._id);
    const flags = [];
    let riskScore = 0;

    // 1. Inactivity Check
    const lastActiveTime = Math.max(
      student.lastActiveAt ? new Date(student.lastActiveAt).getTime() : 0,
      student.lastLoginAt ? new Date(student.lastLoginAt).getTime() : 0
    ) || (student.createdAt ? new Date(student.createdAt).getTime() : 0);

    const daysSinceActive = lastActiveTime ? Math.floor((now - lastActiveTime) / (24 * 60 * 60 * 1000)) : 999;

    // Check if 5-day inactivity warning email should be sent automatically
    if (daysSinceActive >= 5) {
      const warningSentTime = student.inactivityWarningSentAt ? new Date(student.inactivityWarningSentAt).getTime() : 0;
      // Send warning if never sent, or sent before the last active time (meaning a new inactive streak began)
      const needsWarning = !warningSentTime || warningSentTime < lastActiveTime;
      if (needsWarning) {
        // Asynchronously send email warning to student
        sendInactivityWarningEmail(student, daysSinceActive).catch(e => {
          console.error(`Error in sendInactivityWarningEmail:`, e);
        });
        // Mark locally so UI reflects that email was dispatched
        student.inactivityWarningSentAt = new Date();
      }
    }

    // Inactivity Risk Scoring & Flags
    if (daysSinceActive >= 7) {
      riskScore += 35;
      flags.push({
        code: 'INACTIVE_7_DAYS',
        severity: 'critical',
        title: 'Severe Inactivity (7+ Days)',
        detail: `No platform activity for ${daysSinceActive} days. Dashboard is eligible to be locked by Administrator.`
      });
    } else if (daysSinceActive >= 5) {
      riskScore += 25;
      flags.push({
        code: 'INACTIVE_5_DAYS',
        severity: 'high',
        title: '5-Day Inactivity Warning',
        detail: `Inactive for ${daysSinceActive} days. Automated email notification dispatched.`
      });
    } else if (daysSinceActive >= 3) {
      riskScore += 10;
      flags.push({
        code: 'INACTIVE_3_DAYS',
        severity: 'low',
        title: 'Moderate Inactivity',
        detail: `No platform activity for ${daysSinceActive} days.`
      });
    }

    // Lock Status Flag
    if (student.isLocked) {
      flags.push({
        code: 'DASHBOARD_LOCKED',
        severity: 'critical',
        title: 'Dashboard Locked',
        detail: `Locked: ${student.lockReason || 'Inactive for 7+ days'}`
      });
    }

    // 2. Test Scores Trend Check
    const userTests = testMap[uid] || [];
    if (userTests.length === 0) {
      riskScore += 20;
      flags.push({
        code: 'NO_TESTS',
        severity: 'medium',
        title: 'Zero Assessments Attempted',
        detail: 'Has not attempted any aptitude or academic tests'
      });
    } else {
      const recentScores = userTests.slice(0, 3).map(t => {
        const total = t.totalQuestions || (t.answers?.length || 1);
        const correct = t.score || 0;
        return (correct / total) * 100;
      });
      const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      if (avgRecent < 40) {
        riskScore += 25;
        flags.push({
          code: 'LOW_TEST_SCORE',
          severity: 'high',
          title: 'Poor Assessment Performance',
          detail: `Recent test average is critically low (${Math.round(avgRecent)}%)`
        });
      } else if (recentScores.length >= 2 && recentScores[0] < recentScores[1] - 15) {
        riskScore += 15;
        flags.push({
          code: 'DECLINING_SCORE',
          severity: 'medium',
          title: 'Declining Test Scores',
          detail: `Latest test score dropped (${Math.round(recentScores[0])}% vs previous ${Math.round(recentScores[1])}%)`
        });
      }
    }

    // 3. Coding Activity Check (LeetCode / CodeChef / HackerRank)
    const lcSolved = student.leetcodeStats?.totalSolved || 0;
    const ccSolved = student.codechefStats?.solvedCount || 0;
    const hrSolved = student.hackerrankStats?.solvedCount || 0;
    const totalCodingSolved = lcSolved + ccSolved + hrSolved;

    if (totalCodingSolved < 5) {
      riskScore += 20;
      flags.push({
        code: 'LOW_CODING',
        severity: 'high',
        title: 'Very Low Coding Activity',
        detail: `Only ${totalCodingSolved} total coding problems solved across platforms`
      });
    }

    // 4. Resume Completion Check
    const userResume = resumeMap[uid];
    const resumePercentage = userResume?.completionPercentage || 0;
    if (!userResume || resumePercentage < 50) {
      riskScore += 15;
      flags.push({
        code: 'INCOMPLETE_RESUME',
        severity: 'medium',
        title: 'Resume Incomplete / Missing',
        detail: userResume ? `Resume is only ${resumePercentage}% complete` : 'No placement resume created yet'
      });
    }

    // 5. Mock Interview Check
    if (!interviewMap[uid]) {
      riskScore += 15;
      flags.push({
        code: 'NO_MOCK_INTERVIEW',
        severity: 'medium',
        title: 'No Mock Interviews',
        detail: 'Has not participated in any AI or faculty mock interviews'
      });
    }

    // 6. Platform Time Stagnation Check (< 30 minutes total)
    const totalMins = Math.floor((student.totalActiveSeconds || 0) / 60);
    if (totalMins < 30) {
      riskScore += 10;
      flags.push({
        code: 'LOW_ENGAGEMENT',
        severity: 'low',
        title: 'Stagnant Engagement Time',
        detail: `Logged only ${totalMins} minutes of active study on the portal`
      });
    }

    // Calculate CGPA if sem grades exist
    const sems = [student.sgpaSem1, student.sgpaSem2, student.sgpaSem3, student.sgpaSem4, student.sgpaSem5, student.sgpaSem6, student.sgpaSem7, student.sgpaSem8].filter(Boolean);
    const calculatedCgpa = sems.length > 0 ? (sems.reduce((a, b) => a + b, 0) / sems.length).toFixed(2) : (student.cgpa || 'N/A');

    // Categorize
    let riskLevel = 'Low';
    if (riskScore >= 50) riskLevel = 'High';
    else if (riskScore >= 30) riskLevel = 'Medium';

    const stringFlags = flags.map(f => `${f.title}: ${f.detail}`);

    results.push({
      studentId: String(student._id),
      _id: String(student._id),
      name: student.name,
      email: student.email,
      rollNo: student.rollNumber || 'N/A',
      branch: student.branch || 'N/A',
      batch: student.academicYear || student.year || 'N/A',
      riskLevel,
      riskScore: Math.min(riskScore, 100),
      flags: stringFlags,
      detailedFlags: flags,
      metrics: {
        daysInactive: daysSinceActive,
        codingSolved: totalCodingSolved,
        resumeScore: resumePercentage,
        mockInterviewsAttempted: interviewMap[uid] ? 1 : 0,
        cgpa: calculatedCgpa
      },
      isLocked: !!student.isLocked,
      lockReason: student.lockReason || '',
      lockedAt: student.lockedAt || null,
      lockedByName: student.lockedByName || '',
      inactivityWarningSentAt: student.inactivityWarningSentAt || null,
      eligibleForLock: daysSinceActive >= 7,
      warningSent: !!student.inactivityWarningSentAt && (new Date(student.inactivityWarningSentAt).getTime() >= lastActiveTime),
      recommendedAction: student.isLocked
        ? 'Account currently locked. Main Admin can review & unlock.'
        : daysSinceActive >= 7
        ? 'Severe Inactivity (7+ days). Recommended to Lock Student Dashboard.'
        : daysSinceActive >= 5
        ? 'Inactive 5+ days. Notification dispatched to student email.'
        : riskLevel === 'High'
        ? 'Urgent faculty intervention & remedial guidance required.'
        : 'Monitor progress and encourage active portal engagement.'
    });
  }

  // Sort: Locked students and highest risk first
  return results.sort((a, b) => {
    if (a.isLocked && !b.isLocked) return -1;
    if (!a.isLocked && b.isLocked) return 1;
    return b.riskScore - a.riskScore;
  });
};

// @desc    Get all students flagged as At-Risk / Inactive with full Summary KPIs
// @route   GET /api/at-risk/summary and GET /api/at-risk/students
// @access  Private (Faculty, Admin)
exports.getAtRiskStudents = async (req, res, next) => {
  try {
    const { branch, academicYear, section, minRiskLevel, filterStatus } = req.query;

    const query = { role: 'student' };
    if (branch && branch !== 'All' && branch !== 'all') query.branch = new RegExp(`^${branch.trim()}$`, 'i');
    if (academicYear && academicYear !== 'All' && academicYear !== 'all') {
      query.$or = [
        { academicYear: new RegExp(`^${academicYear.trim()}$`, 'i') },
        { year: new RegExp(`^${academicYear.trim()}$`, 'i') }
      ];
    }
    if (section && section !== 'All' && section !== 'all') query.section = new RegExp(`^${section.trim()}$`, 'i');

    const students = await User.find(query)
      .select('name email rollNumber branch section academicYear year totalActiveSeconds lastActiveAt lastLoginAt createdAt readinessScore leetcodeStats codechefStats hackerrankStats isLocked lockReason lockedAt lockedByName inactivityWarningSentAt sgpaSem1 sgpaSem2 sgpaSem3 sgpaSem4 sgpaSem5 sgpaSem6 sgpaSem7 sgpaSem8')
      .lean();

    const evaluated = await evaluateStudentRisk(students);

    // Compute KPI Summary Stats
    const highRiskList = evaluated.filter(s => s.riskLevel === 'High');
    const mediumRiskList = evaluated.filter(s => s.riskLevel === 'Medium');
    const lowRiskList = evaluated.filter(s => s.riskLevel === 'Low');
    const lockedList = evaluated.filter(s => s.isLocked);
    const inactive5List = evaluated.filter(s => s.metrics.daysInactive >= 5 && s.metrics.daysInactive < 7);
    const inactive7List = evaluated.filter(s => s.metrics.daysInactive >= 7);

    let filtered = evaluated;
    if (minRiskLevel && minRiskLevel !== 'all') {
      filtered = evaluated.filter(s => s.riskLevel.toLowerCase() === minRiskLevel.toLowerCase());
    }

    if (filterStatus === 'locked') {
      filtered = filtered.filter(s => s.isLocked);
    } else if (filterStatus === 'inactive7') {
      filtered = filtered.filter(s => s.metrics.daysInactive >= 7);
    } else if (filterStatus === 'inactive5') {
      filtered = filtered.filter(s => s.metrics.daysInactive >= 5);
    }

    res.status(200).json({
      success: true,
      stats: {
        atRiskCount: highRiskList.length + mediumRiskList.length,
        highRisk: highRiskList.length,
        mediumRisk: mediumRiskList.length,
        lowRisk: lowRiskList.length,
        totalAssessed: evaluated.length,
        lockedCount: lockedList.length,
        inactive5Days: inactive5List.length,
        inactive7Days: inactive7List.length
      },
      students: filtered,
      totalFlagged: highRiskList.length + mediumRiskList.length,
      highRiskCount: highRiskList.length,
      mediumRiskCount: mediumRiskList.length,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle Student Dashboard Lock (Lock or Unlock by Administrator & Main Admin)
// @route   POST /api/at-risk/toggle-lock
// @access  Private (Admin, Faculty)
exports.toggleStudentDashboardLock = async (req, res, next) => {
  try {
    const { studentId, isLocked, reason } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID is required' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student account not found' });
    }

    const adminName = req.user?.name || (req.user?.role === 'admin' ? 'Main Admin' : 'Placement Coordinator');
    const lockStatus = Boolean(isLocked);

    // Update Student Lock State
    student.isLocked = lockStatus;
    if (lockStatus) {
      student.lockReason = reason || 'Locked due to prolonged platform inactivity (7+ days)';
      student.lockedAt = new Date();
      student.lockedBy = req.user._id;
      student.lockedByName = adminName;
    } else {
      student.lockReason = '';
      student.lockedAt = null;
      student.lockedBy = null;
      student.lockedByName = '';
    }

    await student.save({ validateBeforeSave: false });

    // Send Email & In-App Notification
    if (lockStatus) {
      await sendDashboardLockedEmail(student, student.lockReason, adminName);
    } else {
      await sendDashboardUnlockedEmail(student, adminName);
    }

    // Audit Logging
    await logActivity({
      user: req.user,
      action: lockStatus ? 'STUDENT_DASHBOARD_LOCKED' : 'STUDENT_DASHBOARD_UNLOCKED',
      category: 'Student Governance & Access',
      description: `${adminName} ${lockStatus ? 'LOCKED' : 'UNLOCKED'} Student Dashboard for ${student.name} (${student.rollNumber || student.email}). Reason: ${student.lockReason || 'Restored by Admin'}`,
      details: {
        studentId: student._id,
        studentEmail: student.email,
        isLocked: lockStatus,
        reason: student.lockReason
      },
      req
    });

    res.status(200).json({
      success: true,
      message: `Student Dashboard successfully ${lockStatus ? 'locked' : 'unlocked'} for ${student.name}`,
      isLocked: student.isLocked,
      lockReason: student.lockReason,
      lockedAt: student.lockedAt,
      lockedByName: student.lockedByName
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Auto-Lock all students inactive for 7+ days (Administrator & Main Admin batch action)
// @route   POST /api/at-risk/auto-lock-inactive
// @access  Private (Admin, Faculty)
exports.autoLockInactiveStudents = async (req, res, next) => {
  try {
    const adminName = req.user?.name || 'Main Admin';
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS);

    // Find all active students whose last login or activity was >= 7 days ago
    const candidates = await User.find({
      role: 'student',
      isLocked: { $ne: true },
      $or: [
        { lastActiveAt: { $lte: sevenDaysAgo } },
        { lastLoginAt: { $lte: sevenDaysAgo } },
        { lastActiveAt: null, createdAt: { $lte: sevenDaysAgo } }
      ]
    });

    const lockedList = [];

    for (const student of candidates) {
      const lastActiveTime = Math.max(
        student.lastActiveAt ? new Date(student.lastActiveAt).getTime() : 0,
        student.lastLoginAt ? new Date(student.lastLoginAt).getTime() : 0
      ) || (student.createdAt ? new Date(student.createdAt).getTime() : 0);

      const daysInactive = Math.floor((now - lastActiveTime) / (24 * 60 * 60 * 1000));

      if (daysInactive >= 7) {
        student.isLocked = true;
        student.lockReason = `Automated policy compliance: Inactive for ${daysInactive} days`;
        student.lockedAt = new Date();
        student.lockedBy = req.user._id;
        student.lockedByName = adminName;
        await student.save({ validateBeforeSave: false });

        // Send lock notification email
        sendDashboardLockedEmail(student, student.lockReason, adminName).catch(() => {});
        lockedList.push({
          id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          daysInactive
        });
      }
    }

    // Audit Logging
    await logActivity({
      user: req.user,
      action: 'BATCH_AUTO_LOCK_INACTIVE_STUDENTS',
      category: 'Student Governance & Access',
      description: `${adminName} executed auto-lock for ${lockedList.length} students inactive for 7+ days`,
      details: { lockedCount: lockedList.length, lockedStudents: lockedList },
      req
    });

    res.status(200).json({
      success: true,
      message: `Successfully locked ${lockedList.length} students who have been inactive for 7+ days.`,
      lockedCount: lockedList.length,
      lockedStudents: lockedList
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Dispatch remedial intervention alert to at-risk student
// @route   POST /api/at-risk/notify and POST /api/at-risk/intervention
// @access  Private (Faculty, Admin)
exports.sendInterventionNotice = async (req, res, next) => {
  try {
    const { studentId, message, subject, interventionType } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID required' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const noticeSubject = subject || `Urgent: Placement Preparation & Academic Attendance Review`;
    const noticeMsg = message || `Faculty notice: Your placement readiness progress requires attention. Please complete your resume and practice tests.`;
    const adminName = req.user?.name || 'Faculty Coordinator / Admin';

    // 1. Create In-App Notification
    const notif = await Notification.create({
      user: student._id,
      type: 'general',
      message: `⚠️ Academic & Placement Alert: ${noticeMsg}`,
      metadata: {
        interventionType: interventionType || 'counseling',
        senderName: adminName,
        subject: noticeSubject
      }
    });

    // 2. Send Email
    if (student.email) {
      const portalUrl = getPortalUrl();
      const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 22px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 22px;">⚠️ REMEDIAL INTERVENTION NOTICE</h1>
            <p style="margin: 5px 0 0 0; color: #fef3c7; font-size: 13px;">From ${adminName} • GRIET Placement Cell</p>
          </div>
          <div style="padding: 26px 28px;">
            <p style="font-size: 15px; margin-top: 0;">Dear <strong>${student.name}</strong>,</p>
            <div style="background: #1e293b; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 18px 0; border-radius: 6px;">
              <h4 style="margin: 0 0 6px 0; color: #fbbf24; font-size: 15px;">${noticeSubject}</h4>
              <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.6; white-space: pre-line;">${noticeMsg}</p>
            </div>
            <div style="text-align: center; margin: 24px 0 12px 0;">
              <a href="${portalUrl}/login" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                Log In &amp; View Portal
              </a>
            </div>
          </div>
        </div>
      `;

      sendEmail({
        to: student.email,
        subject: noticeSubject,
        text: `From: ${adminName}\n\n${noticeMsg}\n\nLog in: ${portalUrl}/login`,
        html: emailHtml
      }).catch(err => {
        console.warn(`[AT-RISK] Intervention email error to ${student.email}:`, err.message);
      });
    }

    await logActivity({
      user: req.user,
      action: 'AT_RISK_INTERVENTION',
      category: 'Student Mentorship',
      description: `Sent at-risk warning notice to student ${student.name} (${student.rollNumber || student.email})`,
      details: { studentId, interventionType, subject: noticeSubject },
      req
    });

    res.status(200).json({
      success: true,
      message: `Intervention notice successfully sent to ${student.name}`,
      notification: notif
    });
  } catch (err) {
    next(err);
  }
};
