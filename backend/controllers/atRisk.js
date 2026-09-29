const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const Resume = require('../models/Resume');
const MockInterview = require('../models/MockInterview');
const Notification = require('../models/Notification');
const { logActivity } = require('../utils/auditLogger');

// Helper to evaluate at-risk status of a list of students
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
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const results = [];

  students.forEach(student => {
    const uid = String(student._id);
    const flags = [];
    let riskScore = 0;

    // 1. Inactivity Check (> 7 days or never logged in)
    const lastActive = student.lastActiveAt ? new Date(student.lastActiveAt).getTime() : 0;
    const daysSinceActive = lastActive ? Math.floor((now - lastActive) / (24 * 60 * 60 * 1000)) : 999;
    if (daysSinceActive >= 7) {
      riskScore += 25;
      flags.push({
        code: 'INACTIVE',
        severity: 'high',
        title: 'Platform Inactivity',
        detail: daysSinceActive > 90 ? 'Has not logged in recently' : `No platform activity for ${daysSinceActive} days`
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
          detail: `Latest test score dropped significantly (${Math.round(recentScores[0])}% vs previous ${Math.round(recentScores[1])}%)`
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
    if (!userResume || (userResume.completionPercentage || 0) < 50) {
      riskScore += 15;
      flags.push({
        code: 'INCOMPLETE_RESUME',
        severity: 'medium',
        title: 'Resume Incomplete / Missing',
        detail: userResume ? `Resume is only ${userResume.completionPercentage || 0}% complete` : 'No placement resume created yet'
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

    // Categorize
    let riskLevel = 'none';
    if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else if (riskScore > 0) riskLevel = 'low';

    // Only include students who have at least one noteworthy risk flag
    if (riskScore >= 25) {
      results.push({
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber || 'N/A',
          branch: student.branch || 'N/A',
          section: student.section || '—',
          academicYear: student.academicYear || student.year || 'N/A',
          totalActiveFormatted: `${Math.floor((student.totalActiveSeconds || 0) / 60)} mins`,
          lastActiveAt: student.lastActiveAt,
          daysSinceActive,
          codingSolvedCount: totalCodingSolved,
          readinessScore: student.readinessScore || 0
        },
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        flagsCount: flags.length,
        flags,
        recommendedAction: riskLevel === 'high' 
          ? 'Urgent faculty intervention & remedial test assignment required' 
          : 'Send automated reminder to complete resume and attempt mock practice'
      });
    }
  });

  return results.sort((a, b) => b.riskScore - a.riskScore);
};

// @desc    Get all students flagged as At-Risk
// @route   GET /api/at-risk/students
// @access  Private (Faculty, Admin)
exports.getAtRiskStudents = async (req, res, next) => {
  try {
    const { branch, academicYear, section, minRiskLevel } = req.query;

    const query = { role: 'student' };
    if (branch && branch !== 'All') query.branch = new RegExp(`^${branch.trim()}$`, 'i');
    if (academicYear && academicYear !== 'All') {
      query.$or = [
        { academicYear: new RegExp(`^${academicYear.trim()}$`, 'i') },
        { year: new RegExp(`^${academicYear.trim()}$`, 'i') }
      ];
    }
    if (section && section !== 'All') query.section = new RegExp(`^${section.trim()}$`, 'i');

    const students = await User.find(query)
      .select('name email rollNumber branch section academicYear year totalActiveSeconds lastActiveAt readinessScore leetcodeStats codechefStats hackerrankStats')
      .lean();

    const evaluated = await evaluateStudentRisk(students);

    let filtered = evaluated;
    if (minRiskLevel && minRiskLevel !== 'all') {
      filtered = evaluated.filter(s => s.riskLevel === minRiskLevel);
    }

    res.status(200).json({
      success: true,
      totalFlagged: filtered.length,
      highRiskCount: filtered.filter(s => s.riskLevel === 'high').length,
      mediumRiskCount: filtered.filter(s => s.riskLevel === 'medium').length,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Dispatch remedial intervention alert to at-risk student
// @route   POST /api/at-risk/notify
// @access  Private (Faculty, Admin)
exports.sendInterventionNotice = async (req, res, next) => {
  try {
    const { studentId, message, interventionType } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'Student ID required' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const defaultMsg = message || `Faculty notice: Your placement readiness progress requires attention. Please complete your resume and practice tests.`;

    const notif = await Notification.create({
      user: student._id,
      type: 'general',
      message: `⚠️ Academic & Placement Alert: ${defaultMsg}`,
      metadata: {
        interventionType: interventionType || 'counseling'
      }
    });

    await logActivity({
      user: req.user,
      action: 'AT_RISK_INTERVENTION',
      category: 'Student Mentorship',
      description: `Sent at-risk warning notice to student ${student.name} (${student.rollNumber || student.email})`,
      details: { studentId, interventionType },
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
