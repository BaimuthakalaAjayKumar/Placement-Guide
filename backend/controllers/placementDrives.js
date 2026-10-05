const PlacementDrive = require('../models/PlacementDrive');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logActivity } = require('../utils/auditLogger');
const { notifyStudentsOnDrivePost, notifyStudentsOnDriveDeadlineExtension } = require('../utils/placementNotifier');

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

    const drives = await PlacementDrive.find(query)
      .populate('createdBy', 'name email companyName role')
      .sort({ 'dates.registrationDeadline': 1, createdAt: -1 });

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

    // For faculty and admin, return drives with aggregate candidate counts & compatibility aliases
    const formatted = drives.map(d => {
      const dObj = d.toObject();
      const apps = dObj.applications || [];
      const candidatesList = apps.map(a => ({
        ...a,
        stage: a.currentStage || 'applied'
      }));
      return {
        ...dObj,
        driveTitle: dObj.title,
        packageLPA: dObj.packageDetails,
        description: dObj.jobDescription,
        deadline: dObj.dates?.registrationDeadline,
        driveDate: dObj.dates?.driveDate,
        candidates: candidatesList,
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

    const dObj = drive.toObject();
    const formattedDrive = {
      ...dObj,
      driveTitle: dObj.title,
      packageLPA: dObj.packageDetails,
      description: dObj.jobDescription,
      deadline: dObj.dates?.registrationDeadline,
      driveDate: dObj.dates?.driveDate,
      candidates: (dObj.applications || []).map(a => ({
        ...a,
        stage: a.currentStage || 'applied'
      }))
    };

    res.status(200).json({
      success: true,
      data: formattedDrive,
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
    const b = req.body;
    const title = (b.title || b.driveTitle || `${b.companyName || 'Campus'} Recruitment Drive`).trim();
    const packageDetails = (
      b.packageDetails ||
      (b.packageLPA
        ? (String(b.packageLPA).toUpperCase().includes('LPA') ? String(b.packageLPA) : `${b.packageLPA} LPA`)
        : 'Competitive Package')
    ).trim();
    const jobDescription = (
      b.jobDescription ||
      b.description ||
      `${b.companyName || 'Recruiter'} is hiring for ${b.role || 'Software Engineer'} with CTC package of ${packageDetails}. Eligible candidates should apply before the registration deadline.`
    ).trim();

    // Deadlines normalization
    const regDeadline = b.dates?.registrationDeadline || b.deadline || b.registrationDeadline || new Date(Date.now() + 7 * 86400000);
    const driveDt = b.dates?.driveDate || b.driveDate || new Date(Date.now() + 10 * 86400000);

    // Skills normalization
    let skillsArr = b.skillsRequired || b.requiredSkills || [];
    if (typeof skillsArr === 'string') {
      skillsArr = skillsArr.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Eligibility normalization
    const minCgpa = Number(b.eligibility?.minCgpa) || 6.5;
    const maxActiveBacklogs = Number(b.eligibility?.maxActiveBacklogs ?? b.eligibility?.maxBacklogs ?? 0);
    let allowedBranches = b.eligibility?.allowedBranches || ['CSE', 'IT', 'CSIT', 'AIML', 'AIDS', 'ECE', 'EEE'];
    if (typeof allowedBranches === 'string') {
      allowedBranches = allowedBranches.split(',').map(s => s.trim()).filter(Boolean);
    }
    let allowedBatches = b.eligibility?.allowedBatches || ['2026', '2025', '4th Year', '3rd Year'];
    if (typeof allowedBatches === 'string') {
      allowedBatches = allowedBatches.split(',').map(s => s.trim()).filter(Boolean);
    }

    const driveData = {
      companyName: (b.companyName || 'Campus Recruiter').trim(),
      companyLogo: b.companyLogo || '',
      companyWebsite: b.companyWebsite || '',
      tier: b.tier || 'Dream (6-10 LPA)',
      title,
      role: (b.role || 'Software Engineer').trim(),
      packageDetails,
      location: (b.location || 'Hyderabad / Pan India').trim(),
      jobDescription,
      skillsRequired: skillsArr,
      eligibility: {
        minCgpa,
        maxActiveBacklogs,
        allowedBranches: allowedBranches.length > 0 ? allowedBranches : ['CSE', 'IT', 'ECE'],
        allowedBatches: allowedBatches.length > 0 ? allowedBatches : ['2025', '2026'],
        min10thPercentage: Number(b.eligibility?.min10thPercentage) || 60,
        min12thPercentage: Number(b.eligibility?.min12thPercentage) || 60
      },
      dates: {
        registrationDeadline: new Date(regDeadline),
        driveDate: new Date(driveDt),
        onlineTestDate: b.dates?.onlineTestDate ? new Date(b.dates.onlineTestDate) : undefined,
        interviewStartDate: b.dates?.interviewStartDate ? new Date(b.dates.interviewStartDate) : undefined
      },
      status: b.status || 'applications_open',
      driveStages: b.driveStages || ['Online Application', 'Aptitude & Coding Test', 'Technical Interview', 'HR Interview', 'Final Selection'],
      createdBy: req.user.id
    };

    const drive = await PlacementDrive.create(driveData);

    // Auto-sync into Placement Calendar as a company drive event!
    try {
      const PlacementEvent = require('../models/PlacementEvent');
      await PlacementEvent.create({
        title: `${drive.companyName}: ${drive.role} Campus Drive`,
        description: `Package: ${drive.packageDetails} | Reg Deadline: ${new Date(drive.dates.registrationDeadline).toLocaleDateString()} | ${drive.jobDescription.slice(0, 140)}...`,
        eventType: 'company_drive',
        colorTag: 'purple',
        startDateTime: new Date(drive.dates.driveDate || drive.dates.registrationDeadline),
        endDateTime: new Date(new Date(drive.dates.driveDate || drive.dates.registrationDeadline).getTime() + 4 * 3600000),
        venueOrLink: drive.location || 'Campus Placement Cell',
        instructorOrCompany: drive.companyName,
        creatorRole: 'admin',
        creatorName: req.user.name || 'Main Admin (TPO Cell)',
        visibility: 'public',
        isVisibleToStudents: true,
        priority: 'high',
        targetAudience: {
          roles: ['student', 'faculty', 'admin'],
          branches: drive.eligibility?.allowedBranches || ['All'],
          batches: drive.eligibility?.allowedBatches || ['All']
        },
        relatedDrive: drive._id,
        createdBy: req.user.id
      });
    } catch (calSyncErr) {
      console.warn('Could not auto-sync placement drive to calendar:', calSyncErr.message);
    }

    // Broadcast email & WhatsApp notifications (including phone 8074701052)
    notifyStudentsOnDrivePost(drive, '8074701052').catch(err => {
      console.warn('Placement notification dispatch error:', err.message);
    });

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

    const targetId = req.params.studentId || req.body.candidateId || req.body.studentId;
    const candidateApp = drive.applications.find(a => 
      String(a.student) === String(targetId) || String(a._id) === String(targetId)
    );
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

// @desc    Cancel placement drive
// @route   PUT /api/placement-drives/:id/cancel
// @access  Private (Admin, or Recruiter who created it)
exports.cancelDrive = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    // Permission check: Admin can cancel any drive; Recruiter can cancel drives they created
    const creatorId = drive.createdBy?._id ? String(drive.createdBy._id) : String(drive.createdBy || '');
    const isOwner = creatorId === String(req.user.id) ||
      (req.user.role === 'recruiter' && req.user.companyName && drive.companyName && req.user.companyName.trim().toLowerCase() === drive.companyName.trim().toLowerCase());
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ success: false, error: 'Not authorized to cancel this placement drive' });
    }

    drive.status = 'cancelled';
    await drive.save();

    // Notify registered candidates
    if (drive.applications && drive.applications.length > 0) {
      for (const app of drive.applications) {
        if (app.student) {
          Notification.create({
            user: app.student,
            type: 'job_update',
            message: `⚠️ Placement Drive Cancelled: The on-campus recruitment drive for ${drive.companyName} (${drive.role}) has been cancelled.`,
            metadata: { jobId: drive._id }
          }).catch(() => {});
        }
      }
    }

    // Update calendar event if present
    try {
      const PlacementEvent = require('../models/PlacementEvent');
      await PlacementEvent.updateMany(
        { relatedDrive: drive._id },
        { title: `[CANCELLED] ${drive.companyName}: ${drive.role} Campus Drive`, colorTag: 'red' }
      );
    } catch (e) {}

    await logActivity({
      user: req.user,
      action: 'DRIVE_CANCELLED',
      category: 'Placement Operations',
      description: `${req.user.role === 'admin' ? 'Admin' : 'Recruiter'} cancelled placement drive: ${drive.companyName} (${drive.role})`,
      details: { driveId: drive._id, companyName: drive.companyName },
      req
    });

    res.status(200).json({
      success: true,
      message: `Placement drive for ${drive.companyName} cancelled successfully`,
      data: drive
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete placement drive
// @route   DELETE /api/placement-drives/:id
// @access  Private (Admin, or Recruiter who created it)
exports.deleteDrive = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Drive not found' });
    }

    // Permission check: Admin can delete any drive (including recruiter-posted); Recruiter can delete only drives they created
    const creatorId = drive.createdBy?._id ? String(drive.createdBy._id) : String(drive.createdBy || '');
    const isOwner = creatorId === String(req.user.id) ||
      (req.user.role === 'recruiter' && req.user.companyName && drive.companyName && req.user.companyName.trim().toLowerCase() === drive.companyName.trim().toLowerCase());
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this placement drive' });
    }

    await PlacementDrive.findByIdAndDelete(req.params.id);

    // Also delete any calendar sync events for this drive
    try {
      const PlacementEvent = require('../models/PlacementEvent');
      await PlacementEvent.deleteMany({ relatedDrive: drive._id });
    } catch (e) {}

    await logActivity({
      user: req.user,
      action: 'DRIVE_DELETED',
      category: 'Placement Operations',
      description: `${req.user.role === 'admin' ? 'Admin' : 'Recruiter'} deleted placement drive: ${drive.companyName} (${drive.role})`,
      details: { driveId: drive._id, companyName: drive.companyName },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Placement drive removed successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update placement drive details
// @route   PUT /api/placement-drives/:id
// @access  Private (Admin, or Recruiter who created it)
exports.updateDrive = async (req, res, next) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    const creatorId = drive.createdBy?._id ? String(drive.createdBy._id) : String(drive.createdBy || '');
    const isOwner = creatorId === String(req.user.id) ||
      (req.user.role === 'recruiter' && req.user.companyName && drive.companyName && req.user.companyName.trim().toLowerCase() === drive.companyName.trim().toLowerCase());
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this placement drive' });
    }

    const b = req.body;
    const oldDeadline = drive.dates?.registrationDeadline;

    // Updatable fields
    if (b.companyName) drive.companyName = b.companyName.trim();
    if (b.companyLogo !== undefined) drive.companyLogo = b.companyLogo;
    if (b.companyWebsite !== undefined) drive.companyWebsite = b.companyWebsite;
    if (b.tier) drive.tier = b.tier;
    if (b.title || b.driveTitle) drive.title = (b.title || b.driveTitle).trim();
    if (b.role) drive.role = b.role.trim();
    if (b.packageDetails || b.packageLPA) {
      drive.packageDetails = (b.packageDetails || (String(b.packageLPA).toUpperCase().includes('LPA') ? String(b.packageLPA) : `${b.packageLPA} LPA`)).trim();
    }
    if (b.location) drive.location = b.location.trim();
    if (b.jobDescription || b.description) drive.jobDescription = (b.jobDescription || b.description).trim();
    if (b.status) drive.status = b.status;

    if (b.skillsRequired || b.requiredSkills) {
      let skillsArr = b.skillsRequired || b.requiredSkills;
      if (typeof skillsArr === 'string') {
        skillsArr = skillsArr.split(',').map(s => s.trim()).filter(Boolean);
      }
      drive.skillsRequired = skillsArr;
    }

    if (b.eligibility) {
      if (b.eligibility.minCgpa !== undefined) drive.eligibility.minCgpa = Number(b.eligibility.minCgpa);
      if (b.eligibility.maxActiveBacklogs !== undefined || b.eligibility.maxBacklogs !== undefined) {
        drive.eligibility.maxActiveBacklogs = Number(b.eligibility.maxActiveBacklogs ?? b.eligibility.maxBacklogs);
      }
      if (b.eligibility.allowedBranches) {
        let branches = b.eligibility.allowedBranches;
        if (typeof branches === 'string') branches = branches.split(',').map(s => s.trim()).filter(Boolean);
        drive.eligibility.allowedBranches = branches;
      }
      if (b.eligibility.allowedBatches) {
        let batches = b.eligibility.allowedBatches;
        if (typeof batches === 'string') batches = batches.split(',').map(s => s.trim()).filter(Boolean);
        drive.eligibility.allowedBatches = batches;
      }
    }

    // Check deadline changes
    const newRegDeadline = b.dates?.registrationDeadline || b.registrationDeadline || b.deadline;
    let deadlineWasExtended = false;

    if (newRegDeadline) {
      const parsedNewDeadline = new Date(newRegDeadline);
      if (!isNaN(parsedNewDeadline.getTime())) {
        if (!oldDeadline || parsedNewDeadline.getTime() !== new Date(oldDeadline).getTime()) {
          drive.previousDeadline = oldDeadline;
          drive.dates.registrationDeadline = parsedNewDeadline;
          drive.deadlineExtended = true;
          drive.deadlineExtendedAt = new Date();
          drive.deadlineExtensionReason = b.deadlineExtensionReason || b.notes || 'Deadline updated by administrator';
          deadlineWasExtended = true;

          // If drive was closed and new deadline is in the future, automatically reopen applications
          if (drive.status === 'applications_closed' && parsedNewDeadline > new Date()) {
            drive.status = 'applications_open';
          }
        }
      }
    }

    if (b.dates?.driveDate || b.driveDate) {
      drive.dates.driveDate = new Date(b.dates?.driveDate || b.driveDate);
    }
    if (b.dates?.onlineTestDate) {
      drive.dates.onlineTestDate = new Date(b.dates.onlineTestDate);
    }
    if (b.dates?.interviewStartDate) {
      drive.dates.interviewStartDate = new Date(b.dates.interviewStartDate);
    }

    await drive.save();

    // Sync calendar event
    try {
      const PlacementEvent = require('../models/PlacementEvent');
      await PlacementEvent.updateMany(
        { relatedDrive: drive._id },
        {
          title: `${drive.companyName}: ${drive.role} Campus Drive`,
          description: `Package: ${drive.packageDetails} | Reg Deadline: ${new Date(drive.dates.registrationDeadline).toLocaleDateString()} | ${drive.jobDescription.slice(0, 140)}...`,
          venueOrLink: drive.location || 'Campus Placement Cell',
          instructorOrCompany: drive.companyName,
          targetAudience: {
            roles: ['student', 'faculty', 'admin'],
            branches: drive.eligibility?.allowedBranches || ['All'],
            batches: drive.eligibility?.allowedBatches || ['All']
          }
        }
      );
    } catch (calErr) {
      console.warn('Could not sync calendar on drive update:', calErr.message);
    }

    // Send WhatsApp & Email alerts if deadline was extended or notifyRequested
    if (deadlineWasExtended || b.broadcastWhatsApp) {
      notifyStudentsOnDriveDeadlineExtension(
        drive,
        oldDeadline,
        drive.dates.registrationDeadline,
        drive.deadlineExtensionReason,
        '8074701052'
      ).catch(err => console.warn('Deadline notification dispatch error:', err.message));
    }

    await logActivity({
      user: req.user,
      action: 'DRIVE_UPDATED',
      category: 'Placement Operations',
      description: `${req.user.role === 'admin' ? 'Admin' : 'Recruiter'} updated placement drive: ${drive.companyName} (${drive.role})`,
      details: { driveId: drive._id, deadlineWasExtended },
      req
    });

    res.status(200).json({
      success: true,
      message: deadlineWasExtended 
        ? `Placement drive updated and deadline extended to ${new Date(drive.dates.registrationDeadline).toLocaleDateString()}! WhatsApp & Email alerts sent.`
        : 'Placement drive updated successfully',
      data: drive
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Explicitly extend registration deadline for placement drive and broadcast WhatsApp alerts
// @route   PUT /api/placement-drives/:id/extend-deadline
// @access  Private (Admin, or Recruiter who created it)
exports.extendDriveDeadline = async (req, res, next) => {
  try {
    const { newDeadline, notes, broadcastWhatsApp = true } = req.body;
    if (!newDeadline) {
      return res.status(400).json({ success: false, error: 'Please provide a valid new registration deadline' });
    }

    const parsedDeadline = new Date(newDeadline);
    if (isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format for new deadline' });
    }

    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    // Permission check
    const creatorId = drive.createdBy?._id ? String(drive.createdBy._id) : String(drive.createdBy || '');
    const isOwner = creatorId === String(req.user.id) ||
      (req.user.role === 'recruiter' && req.user.companyName && drive.companyName && req.user.companyName.trim().toLowerCase() === drive.companyName.trim().toLowerCase());
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({ success: false, error: 'Not authorized to extend deadline for this placement drive' });
    }

    const oldDeadline = drive.dates?.registrationDeadline;
    drive.previousDeadline = oldDeadline;
    drive.dates.registrationDeadline = parsedDeadline;
    drive.deadlineExtended = true;
    drive.deadlineExtendedAt = new Date();
    drive.deadlineExtensionReason = notes || 'Registration deadline extended to accommodate more student applications';

    // If drive status was applications_closed, reopen it
    if (drive.status === 'applications_closed' && parsedDeadline > new Date()) {
      drive.status = 'applications_open';
    }

    await drive.save();

    // Sync placement calendar event
    try {
      const PlacementEvent = require('../models/PlacementEvent');
      await PlacementEvent.updateMany(
        { relatedDrive: drive._id },
        {
          description: `Package: ${drive.packageDetails} | Extended Reg Deadline: ${parsedDeadline.toLocaleDateString()} | ${drive.jobDescription.slice(0, 140)}...`
        }
      );
    } catch (e) {}

    // Dispatch WhatsApp and Email notifications to students and coordinator (8074701052)
    let notifResult = null;
    if (broadcastWhatsApp !== false) {
      notifResult = await notifyStudentsOnDriveDeadlineExtension(
        drive,
        oldDeadline,
        parsedDeadline,
        notes || '',
        '8074701052'
      );
    }

    await logActivity({
      user: req.user,
      action: 'DRIVE_DEADLINE_EXTENDED',
      category: 'Placement Operations',
      description: `${req.user.role === 'admin' ? 'Admin' : 'Recruiter'} extended registration deadline for ${drive.companyName} (${drive.role}) to ${parsedDeadline.toLocaleDateString()}`,
      details: { driveId: drive._id, oldDeadline, newDeadline: parsedDeadline, notes },
      req
    });

    res.status(200).json({
      success: true,
      message: `Registration deadline successfully extended to ${parsedDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. WhatsApp & Email alerts dispatched!`,
      data: drive,
      notificationSummary: notifResult
    });
  } catch (err) {
    next(err);
  }
};
