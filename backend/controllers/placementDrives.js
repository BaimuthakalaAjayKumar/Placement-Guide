const PlacementDrive = require('../models/PlacementDrive');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logActivity } = require('../utils/auditLogger');

// Helper to compute student match score against a drive
const calculateDriveMatch = (student, drive) => {
  let score = 0;
  const reasons = [];
  const missing = [];

  // 1. CGPA Check (25 pts)
  const studentCgpa = student.cgpa || (student.academicDetails?.cgpa || 7.5);
  const minCgpa = drive.eligibility?.minCgpa || 6.0;
  if (studentCgpa >= minCgpa) {
    score += 25;
    reasons.push(`CGPA ${studentCgpa} meets requirement (Min ${minCgpa})`);
  } else {
    missing.push(`CGPA is ${studentCgpa}, but minimum required is ${minCgpa}`);
  }

  // 2. Branch Check (25 pts)
  const sBranch = (student.branch || '').toUpperCase();
  const allowedBranches = (drive.eligibility?.allowedBranches || []).map(b => b.toUpperCase());
  if (allowedBranches.length === 0 || allowedBranches.includes('ALL') || allowedBranches.includes(sBranch)) {
    score += 25;
    reasons.push(`Branch ${sBranch || 'General'} is eligible`);
  } else {
    missing.push(`Branch ${sBranch} is not in eligible list (${allowedBranches.join(', ')})`);
  }

  // 3. Skills Match (35 pts)
  const jobSkills = (drive.skillsRequired || []).map(s => s.toLowerCase().trim());
  const studentSkills = (student.skills || []).map(s => s.toLowerCase().trim());
  
  if (jobSkills.length === 0) {
    score += 35;
    reasons.push('General technical profile fits requirements');
  } else {
    const matched = jobSkills.filter(sk => studentSkills.some(stSk => stSk.includes(sk) || sk.includes(stSk)));
    const skillRatio = matched.length / jobSkills.length;
    score += Math.round(skillRatio * 35);

    if (matched.length > 0) {
      reasons.push(`Matching skills: ${matched.slice(0, 4).join(', ')}`);
    }
    const missingSkills = jobSkills.filter(sk => !matched.includes(sk));
    if (missingSkills.length > 0) {
      missing.push(`Missing skills: ${missingSkills.slice(0, 3).join(', ')}`);
    }
  }

  // 4. Batch/Year Check (15 pts)
  const sYear = student.academicYear || student.year || '2026';
  const allowedBatches = drive.eligibility?.allowedBatches || [];
  if (allowedBatches.length === 0 || allowedBatches.includes('All') || allowedBatches.some(b => sYear.includes(b) || b.includes(sYear))) {
    score += 15;
    reasons.push(`Eligible graduation batch (${sYear})`);
  } else {
    missing.push(`Target batch mismatch (${allowedBatches.join(', ')})`);
  }

  return {
    matchPercentage: Math.min(Math.max(score, 10), 98),
    reasons,
    missing,
    isEligible: studentCgpa >= minCgpa && (allowedBranches.length === 0 || allowedBranches.includes('ALL') || allowedBranches.includes(sBranch))
  };
};

// @desc    Get all placement drives
// @route   GET /api/placement-drives
// @access  Private (All roles)
exports.getDrives = async (req, res, next) => {
  try {
    const { status, tier, search } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (tier && tier !== 'all') query.tier = tier;
    if (search && search.trim()) {
      query.$or = [
        { companyName: { $regex: search.trim(), $options: 'i' } },
        { title: { $regex: search.trim(), $options: 'i' } },
        { role: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const drives = await PlacementDrive.find(query).sort({ 'dates.registrationDeadline': 1, createdAt: -1 });

    // If user is a student, attach their specific match percentage & application status
    if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      const studentDrives = drives.map(drive => {
        const driveObj = drive.toObject();
        const existingApp = driveObj.applications?.find(a => String(a.student) === String(req.user.id));
        const matchData = calculateDriveMatch(student, driveObj);
        
        return {
          ...driveObj,
          hasApplied: !!existingApp,
          applicationStatus: existingApp ? existingApp.currentStage : null,
          userApplication: existingApp || null,
          matchScore: matchData.matchPercentage,
          matchReasons: matchData.reasons,
          missingRequirements: matchData.missing,
          isEligible: matchData.isEligible
        };
      });

      return res.status(200).json({
        success: true,
        count: studentDrives.length,
        data: studentDrives
      });
    }

    // For faculty and admin, return drives with aggregate candidate counts
    const formatted = drives.map(d => {
      const dObj = d.toObject();
      const apps = dObj.applications || [];
      return {
        ...dObj,
        totalApplicants: apps.length,
        shortlistedCount: apps.filter(a => ['shortlisted', 'online_test_cleared', 'interview_round_1', 'interview_round_2', 'hr_round', 'selected'].includes(a.currentStage)).length,
        selectedCount: apps.filter(a => a.currentStage === 'selected').length
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single drive with full applicant pipeline
// @route   GET /api/placement-drives/:id
// @access  Private
exports.getDriveById = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    let matchAnalysis = null;
    if (req.user.role === 'student') {
      const student = await User.findById(req.user.id);
      matchAnalysis = calculateDriveMatch(student, drive);
    }

    res.status(200).json({
      success: true,
      data: drive,
      matchAnalysis
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new placement drive
// @route   POST /api/placement-drives
// @access  Private (Admin only)
exports.createDrive = async (req, res, next) => {
  try {
    const driveData = {
      ...req.body,
      createdBy: req.user.id
    };

    const drive = await PlacementDrive.create(driveData);

    // Broadcast notification to eligible students
    const targetBranches = drive.eligibility?.allowedBranches || [];
    const query = { role: 'student' };
    if (targetBranches.length > 0 && !targetBranches.includes('All')) {
      query.branch = { $in: targetBranches.map(b => new RegExp(`^${b}$`, 'i')) };
    }

    const eligibleStudents = await User.find(query).select('_id');
    const notifs = eligibleStudents.map(st => ({
      user: st._id,
      type: 'job_update',
      message: `🟣 New Placement Drive: ${drive.companyName} is hiring for ${drive.role} (${drive.packageDetails})! Register before deadline.`,
      metadata: { jobId: drive._id }
    }));

    if (notifs.length > 0) {
      Notification.insertMany(notifs).catch(() => {});
    }

    await logActivity({
      user: req.user,
      action: 'DRIVE_CREATED',
      category: 'Placement Operations',
      description: `Admin created placement drive for ${drive.companyName} (${drive.role})`,
      details: { driveId: drive._id, ctc: drive.packageDetails },
      req
    });

    res.status(201).json({
      success: true,
      data: drive
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Student applies to placement drive
// @route   POST /api/placement-drives/:id/apply
// @access  Private (Student)
exports.applyToDrive = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    // Check deadline
    if (new Date() > new Date(drive.dates.registrationDeadline)) {
      return res.status(400).json({ success: false, error: 'Registration deadline has passed for this drive' });
    }

    // Check existing application
    const existing = drive.applications.find(a => String(a.student) === String(req.user.id));
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already applied for this company drive' });
    }

    const student = await User.findById(req.user.id);
    const match = calculateDriveMatch(student, drive);

    const application = {
      student: student._id,
      studentName: student.name,
      studentEmail: student.email,
      studentRollNumber: student.rollNumber || 'N/A',
      studentBranch: student.branch || 'N/A',
      studentCgpa: student.cgpa || 7.5,
      studentPhone: student.phone || '',
      resumeUrl: req.body.resumeUrl || student.resumeUrl || '',
      appliedAt: new Date(),
      currentStage: 'applied',
      matchScore: match.matchPercentage
    };

    drive.applications.push(application);
    await drive.save();

    // Confirmation notification
    await Notification.create({
      user: student._id,
      type: 'job_update',
      message: `✓ Application Confirmed: You have registered for ${drive.companyName} (${drive.role}). Best of luck!`,
      metadata: { jobId: drive._id }
    });

    await logActivity({
      user: student,
      action: 'DRIVE_APPLIED',
      category: 'Placement Operations',
      description: `Student applied for placement drive: ${drive.companyName} (${drive.role})`,
      details: { driveId: drive._id, matchScore: match.matchPercentage },
      req
    });

    res.status(200).json({
      success: true,
      message: `Successfully applied to ${drive.companyName}`,
      data: application
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update candidate stage in recruitment lifecycle
// @route   PUT /api/placement-drives/:id/candidates/:studentId/stage
// @access  Private (Admin only)
exports.updateCandidateStage = async (req, res, next) => {
  try {
    const { stage, notes, scheduledAt, venue, meetingLink, roundName, offeredPackage } = req.body;
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    const candidateApp = drive.applications.find(a => String(a.student) === String(req.params.studentId));
    if (!candidateApp) {
      return res.status(404).json({ success: false, error: 'Candidate application not found' });
    }

    candidateApp.currentStage = stage;

    if (scheduledAt || venue || meetingLink || roundName) {
      candidateApp.interviewSchedule = {
        roundName: roundName || `${stage.replace(/_/g, ' ').toUpperCase()}`,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : candidateApp.interviewSchedule?.scheduledAt,
        venue: venue || candidateApp.interviewSchedule?.venue || '',
        meetingLink: meetingLink || candidateApp.interviewSchedule?.meetingLink || '',
        interviewerNotes: notes || candidateApp.interviewSchedule?.interviewerNotes || ''
      };
    }

    if (stage === 'selected' && offeredPackage) {
      candidateApp.offerDetails = {
        offeredPackage: offeredPackage || drive.packageDetails,
        offeredRole: drive.role,
        offerDate: new Date(),
        accepted: false
      };
    }

    await drive.save();

    // Notify candidate of status update
    const stageTitles = {
      shortlisted: '🎉 You have been Shortlisted!',
      online_test_cleared: '🏆 You cleared the Online Assessment!',
      interview_round_1: '🎙️ Technical Interview Round 1 Scheduled',
      interview_round_2: '🎙️ Technical Interview Round 2 Scheduled',
      hr_round: '💼 HR Interview Round Scheduled',
      selected: `🎉 Congratulations! You have been SELECTED by ${drive.companyName}!`,
      rejected: 'Update regarding your application status'
    };

    const notifMsg = stageTitles[stage] 
      ? `${stageTitles[stage]} (${drive.companyName} - ${drive.role})`
      : `Your application status for ${drive.companyName} was updated to ${stage.replace(/_/g, ' ')}`;

    await Notification.create({
      user: candidateApp.student,
      type: 'job_update',
      message: notifMsg,
      metadata: { jobId: drive._id }
    });

    await logActivity({
      user: req.user,
      action: 'DRIVE_STAGE_UPDATED',
      category: 'Placement Operations',
      description: `Updated ${candidateApp.studentName} stage to ${stage} for ${drive.companyName}`,
      details: { driveId: drive._id, studentId: candidateApp.student, stage },
      req
    });

    res.status(200).json({
      success: true,
      message: `Candidate stage updated to ${stage}`,
      data: candidateApp
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete placement drive
// @route   DELETE /api/placement-drives/:id
// @access  Private (Admin only)
exports.deleteDrive = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findByIdAndDelete(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Drive not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Placement drive removed successfully'
    });
  } catch (err) {
    next(err);
  }
};
