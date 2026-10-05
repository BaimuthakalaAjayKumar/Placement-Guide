const crypto = require('crypto');
const User = require('../models/User');
const PlacementDrive = require('../models/PlacementDrive');
const PlacementEvent = require('../models/PlacementEvent');
const Notification = require('../models/Notification');
const Resume = require('../models/Resume');
const Project = require('../models/Project');
const { logActivity } = require('../utils/auditLogger');
const sendEmail = require('../utils/sendEmail');
const { sendWhatsAppMessage } = require('../utils/sendWhatsApp');
const { notifyStudentsOnDrivePost } = require('../utils/placementNotifier');

// Helper to generate secure random temporary password
const generateTempPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = 'Rec@';
  for (let i = 0; i < length - 4; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// =========================================================================
// ADMIN RECRUITER CREDENTIAL MANAGEMENT
// =========================================================================

// @desc    Admin generates temporary login credentials for recruiter
// @route   POST /api/recruiter/create-temporary-credentials
// @access  Private (Admin only)
exports.createTemporaryCredentials = async (req, res, next) => {
  try {
    const {
      name,
      email,
      companyName,
      companyWebsite,
      companyLogo,
      password: customPassword,
      expiryDays = 30,
      customExpiryDate,
      recruiterNotes,
      assignedDriveId
    } = req.body;

    if (!name || !email || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Please provide recruiter name, work email, and company name.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: `User with email '${cleanEmail}' already exists (Role: ${existingUser.role}). Please use a distinct email address.`
      });
    }

    // Determine temporary password
    const tempPassword = (customPassword && customPassword.trim())
      ? customPassword.trim()
      : generateTempPassword(10);

    // Determine expiry date
    let expiresAt;
    if (customExpiryDate) {
      expiresAt = new Date(customExpiryDate);
    } else {
      expiresAt = new Date(Date.now() + Number(expiryDays) * 86400000);
    }

    const recruiterUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: tempPassword,
      role: 'recruiter',
      targetRole: 'Recruiter',
      companyName: companyName.trim(),
      companyWebsite: (companyWebsite || '').trim(),
      companyLogo: (companyLogo || '').trim(),
      recruiterExpiresAt: expiresAt,
      isTemporaryAccount: true,
      tempPasswordPlain: tempPassword,
      recruiterNotes: (recruiterNotes || '').trim(),
      mustChangePassword: false
    });

    // If an existing drive was assigned, link it if relevant
    if (assignedDriveId) {
      await PlacementDrive.findByIdAndUpdate(assignedDriveId, {
        $addToSet: { assignedRecruiters: recruiterUser._id }
      }).catch(() => {});
    }

    await logActivity({
      user: req.user,
      action: 'RECRUITER_CREDENTIALS_CREATED',
      category: 'Placement Operations',
      description: `Admin created temporary recruiter credentials for ${name} (${companyName}) expiring on ${expiresAt.toLocaleDateString()}`,
      details: {
        recruiterId: recruiterUser._id,
        email: cleanEmail,
        companyName,
        expiresAt
      },
      req
    });

    const userObj = recruiterUser.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: `Temporary credentials created successfully for ${companyName} recruiter.`,
      credentials: {
        name: recruiterUser.name,
        email: recruiterUser.email,
        temporaryPassword: tempPassword,
        companyName: recruiterUser.companyName,
        expiresAt,
        daysValid: Math.ceil((expiresAt.getTime() - Date.now()) / 86400000),
        role: 'recruiter'
      },
      data: userObj
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin lists all recruiter accounts
// @route   GET /api/recruiter/accounts
// @access  Private (Admin only)
exports.getRecruiterAccounts = async (req, res, next) => {
  try {
    const recruiters = await User.find({ role: 'recruiter' })
      .select('+tempPasswordPlain')
      .sort({ createdAt: -1 });

    const now = new Date();

    const formatted = await Promise.all(
      recruiters.map(async (r) => {
        const rObj = r.toObject();
        const expiresAt = r.recruiterExpiresAt ? new Date(r.recruiterExpiresAt) : null;
        const isExpired = expiresAt ? now > expiresAt : false;
        const daysRemaining = expiresAt
          ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000))
          : null;

        // Count placement drives associated with this recruiter/company
        const drivesCount = await PlacementDrive.countDocuments({
          $or: [
            { createdBy: r._id },
            { companyName: new RegExp(`^${r.companyName}$`, 'i') }
          ]
        });

        return {
          _id: rObj._id,
          name: rObj.name,
          email: rObj.email,
          companyName: rObj.companyName,
          companyWebsite: rObj.companyWebsite,
          companyLogo: rObj.companyLogo,
          isTemporaryAccount: rObj.isTemporaryAccount,
          recruiterExpiresAt: rObj.recruiterExpiresAt,
          tempPasswordPlain: rObj.tempPasswordPlain || '',
          recruiterNotes: rObj.recruiterNotes,
          isExpired,
          daysRemaining,
          loginCount: rObj.loginCount || 0,
          lastLoginAt: rObj.lastLoginAt,
          lastIpAddress: rObj.lastIpAddress,
          createdAt: rObj.createdAt,
          drivesCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin revokes / deletes recruiter account
// @route   DELETE /api/recruiter/accounts/:id
// @access  Private (Admin only)
exports.revokeRecruiterAccount = async (req, res, next) => {
  try {
    const recruiter = await User.findOne({ _id: req.params.id, role: 'recruiter' });
    if (!recruiter) {
      return res.status(404).json({ success: false, error: 'Recruiter account not found' });
    }

    const companyName = recruiter.companyName;
    const name = recruiter.name;

    await User.findByIdAndDelete(req.params.id);

    await logActivity({
      user: req.user,
      action: 'RECRUITER_CREDENTIALS_REVOKED',
      category: 'Placement Operations',
      description: `Admin revoked temporary recruiter credentials for ${name} (${companyName})`,
      details: { recruiterId: req.params.id, name, companyName },
      req
    });

    res.status(200).json({
      success: true,
      message: `Recruiter access for ${name} (${companyName}) has been revoked.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin extends recruiter expiry or resets temporary password
// @route   PUT /api/recruiter/accounts/:id/extend
// @access  Private (Admin only)
exports.extendRecruiterAccount = async (req, res, next) => {
  try {
    const { addDays, newExpiryDate, newPassword } = req.body;
    const recruiter = await User.findOne({ _id: req.params.id, role: 'recruiter' });
    if (!recruiter) {
      return res.status(404).json({ success: false, error: 'Recruiter account not found' });
    }

    if (newExpiryDate) {
      recruiter.recruiterExpiresAt = new Date(newExpiryDate);
    } else if (addDays) {
      const currentExpiry = recruiter.recruiterExpiresAt && new Date(recruiter.recruiterExpiresAt) > new Date()
        ? new Date(recruiter.recruiterExpiresAt)
        : new Date();
      recruiter.recruiterExpiresAt = new Date(currentExpiry.getTime() + Number(addDays) * 86400000);
    }

    if (newPassword && newPassword.trim()) {
      recruiter.password = newPassword.trim();
      recruiter.tempPasswordPlain = newPassword.trim();
    }

    await recruiter.save();

    await logActivity({
      user: req.user,
      action: 'RECRUITER_CREDENTIALS_EXTENDED',
      category: 'Placement Operations',
      description: `Admin extended recruiter access for ${recruiter.name} (${recruiter.companyName}) until ${new Date(recruiter.recruiterExpiresAt).toLocaleDateString()}`,
      details: { recruiterId: recruiter._id, newExpiry: recruiter.recruiterExpiresAt },
      req
    });

    res.status(200).json({
      success: true,
      message: `Access extended successfully until ${new Date(recruiter.recruiterExpiresAt).toLocaleDateString()}`,
      data: {
        _id: recruiter._id,
        name: recruiter.name,
        email: recruiter.email,
        companyName: recruiter.companyName,
        recruiterExpiresAt: recruiter.recruiterExpiresAt,
        tempPasswordPlain: recruiter.tempPasswordPlain
      }
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// DRIVE SCHEDULING CONFLICT & DATE CLASH DETECTOR
// =========================================================================

/**
 * Checks whether another recruiter or campus drive already booked the given calendar day
 * for tests, interviews, or on-campus drives.
 */
const checkSchedulingConflict = async ({
  targetDate,
  taskType = 'Drive Event',
  excludeDriveId = null,
  currentCompany = '',
  currentRecruiterId = null
}) => {
  if (!targetDate) return { hasConflict: false };

  const parsed = new Date(targetDate);
  if (isNaN(parsed.getTime())) return { hasConflict: false };

  const startOfDay = new Date(parsed);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(parsed);
  endOfDay.setHours(23, 59, 59, 999);

  const driveQuery = {
    $or: [
      { 'dates.driveDate': { $gte: startOfDay, $lte: endOfDay } },
      { 'dates.onlineTestDate': { $gte: startOfDay, $lte: endOfDay } },
      { 'dates.interviewStartDate': { $gte: startOfDay, $lte: endOfDay } },
      { 'applications.interviewSchedule.scheduledAt': { $gte: startOfDay, $lte: endOfDay } }
    ]
  };

  if (excludeDriveId) {
    driveQuery._id = { $ne: excludeDriveId };
  }

  const existingDrives = await PlacementDrive.find(driveQuery).select('companyName title role eligibility dates applications');

  for (const d of existingDrives) {
    const isSameCompany = currentCompany && d.companyName && d.companyName.trim().toLowerCase() === currentCompany.trim().toLowerCase();
    if (!isSameCompany) {
      let conflictingTask = 'Campus Placement Drive / Evaluation';
      if (d.dates?.onlineTestDate && d.dates.onlineTestDate >= startOfDay && d.dates.onlineTestDate <= endOfDay) {
        conflictingTask = 'Online Assessment / Technical Test';
      } else if (d.dates?.interviewStartDate && d.dates.interviewStartDate >= startOfDay && d.dates.interviewStartDate <= endOfDay) {
        conflictingTask = 'Technical Interview Rounds';
      } else if (d.dates?.driveDate && d.dates.driveDate >= startOfDay && d.dates.driveDate <= endOfDay) {
        conflictingTask = 'On-Campus Placement Drive';
      } else {
        const interviewApp = d.applications?.find(a => a.interviewSchedule?.scheduledAt >= startOfDay && a.interviewSchedule?.scheduledAt <= endOfDay);
        if (interviewApp) {
          conflictingTask = interviewApp.interviewSchedule?.roundName || 'Interview Assessment';
        }
      }

      const branchesOccupied = d.eligibility?.allowedBranches?.length > 0 ? d.eligibility.allowedBranches.join(', ') : 'CSE, IT, ECE';
      const batchesOccupied = d.eligibility?.allowedBatches?.length > 0 ? d.eligibility.allowedBatches.join(', ') : '2026/2025 Batches';
      const formattedDay = parsed.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

      return {
        hasConflict: true,
        conflict: {
          conflictingCompany: d.companyName,
          conflictingRole: d.role,
          conflictingDriveTitle: d.title,
          conflictingTask,
          targetDate: parsed.toISOString().slice(0, 10),
          formattedDate: formattedDay,
          branchesOccupied,
          batchesOccupied,
          message: `Date Clash: ${formattedDay} is already booked by ${d.companyName} for ${conflictingTask} (${d.role}). Students of ${branchesOccupied} have a scheduled task on this date. Please select another date.`
        }
      };
    }
  }

  // Also check PlacementEvent model
  const eventQuery = {
    startDateTime: { $lte: endOfDay },
    endDateTime: { $gte: startOfDay },
    eventType: { $in: ['aptitude_test', 'company_drive', 'mock_interview', 'workshop'] }
  };

  const existingEvents = await PlacementEvent.find(eventQuery);
  for (const ev of existingEvents) {
    const isSameCompany = currentCompany && ev.instructorOrCompany && ev.instructorOrCompany.trim().toLowerCase() === currentCompany.trim().toLowerCase();
    if (!isSameCompany) {
      const formattedDay = parsed.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
      return {
        hasConflict: true,
        conflict: {
          conflictingCompany: ev.instructorOrCompany || 'Campus Placement Partner',
          conflictingRole: ev.title,
          conflictingDriveTitle: ev.title,
          conflictingTask: ev.eventType.replace(/_/g, ' ').toUpperCase(),
          targetDate: parsed.toISOString().slice(0, 10),
          formattedDate: formattedDay,
          branchesOccupied: ev.targetAudience?.branches?.join(', ') || 'Campus Students',
          batchesOccupied: ev.targetAudience?.batches?.join(', ') || 'All Batches',
          message: `Date Clash: ${formattedDay} is already booked for '${ev.title}'. Students are already occupied with this placement schedule. Please select another date.`
        }
      };
    }
  }

  return { hasConflict: false };
};

// @desc    Check if a specific test/drive/interview date clashes with another recruiter's event
// @route   GET /api/recruiter/check-date-conflict
// @access  Private (Recruiter, Admin)
exports.checkDateConflict = async (req, res, next) => {
  try {
    const { date, type = 'Drive Event', excludeDriveId } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Please provide a date to check.' });
    }

    const currentCompany = req.user.companyName || '';
    const conflictResult = await checkSchedulingConflict({
      targetDate: date,
      taskType: type,
      excludeDriveId,
      currentCompany,
      currentRecruiterId: req.user._id
    });

    res.status(200).json({
      success: true,
      hasConflict: conflictResult.hasConflict,
      conflict: conflictResult.conflict || null
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// SUITABLE STUDENTS POOL (RECRUITER & ADMIN VIEW)
// =========================================================================

// @desc    Get suitable/eligible students matching drive criteria or custom cutoffs
// @route   GET /api/recruiter/suitable-students
// @access  Private (Recruiter, Admin)
exports.getSuitableStudents = async (req, res, next) => {
  try {
    // REQUIREMENT: In the Recruiter Dashboard, show the details of the students IF AND ONLY WHEN
    // the recruiter adds the Placement Drive Details. Otherwise, lock/hide the talent pool.
    if (req.user && req.user.role === 'recruiter') {
      const recruiterDrivesCount = await PlacementDrive.countDocuments({
        $or: [
          { createdBy: req.user._id },
          ...(req.user.companyName ? [{ companyName: new RegExp(`^${req.user.companyName.trim()}$`, 'i') }] : [])
        ]
      });

      if (recruiterDrivesCount === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          totalStudents: 0,
          hasPlacementDrive: false,
          requiresDriveDetails: true,
          message: 'Student talent pool is locked. Please add your Placement Drive Details first to unlock and view the students talent pool.',
          data: []
        });
      }
    }

    const {
      driveId,
      minCgpa: queryMinCgpa,
      branches: queryBranches,
      batches: queryBatches,
      maxBacklogs: queryMaxBacklogs,
      skills: querySkills,
      minPri: queryMinPri,
      search: querySearch,
      eligibleOnly = 'false'
    } = req.query;

    let targetMinCgpa = queryMinCgpa ? Number(queryMinCgpa) : null;
    let targetBranches = queryBranches ? queryBranches.split(',').map(b => b.trim().toUpperCase()).filter(Boolean) : [];
    let targetBatches = queryBatches ? queryBatches.split(',').map(b => b.trim()).filter(Boolean) : [];
    let targetMaxBacklogs = queryMaxBacklogs !== undefined ? Number(queryMaxBacklogs) : 0;
    let targetSkills = querySkills ? querySkills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
    let driveObj = null;

    // If driveId is provided, load default cutoffs from the drive
    if (driveId) {
      driveObj = await PlacementDrive.findById(driveId);
      if (driveObj) {
        if (targetMinCgpa === null) targetMinCgpa = driveObj.eligibility?.minCgpa ?? 6.5;
        if (targetBranches.length === 0 && driveObj.eligibility?.allowedBranches?.length > 0) {
          targetBranches = driveObj.eligibility.allowedBranches.map(b => b.toUpperCase());
        }
        if (targetBatches.length === 0 && driveObj.eligibility?.allowedBatches?.length > 0) {
          targetBatches = driveObj.eligibility.allowedBatches;
        }
        if (queryMaxBacklogs === undefined && driveObj.eligibility?.maxActiveBacklogs !== undefined) {
          targetMaxBacklogs = driveObj.eligibility.maxActiveBacklogs;
        }
        if (targetSkills.length === 0 && driveObj.skillsRequired?.length > 0) {
          targetSkills = driveObj.skillsRequired.map(s => s.toLowerCase());
        }
      }
    }

    // Fallbacks if not specified
    if (targetMinCgpa === null) targetMinCgpa = 6.5;
    if (targetBranches.length === 0) targetBranches = ['ALL'];
    if (targetBatches.length === 0) targetBatches = ['ALL'];

    // Fetch all active students
    const students = await User.find({ role: 'student' })
      .select('name email phone mobileNumber rollNumber branch section academicYear year bio skills targetRole readinessScore leetcodeStats codeforcesStats codechefStats hackerrankStats githubProfileUrl createdAt')
      .lean();

    // Fetch latest resumes mapped by student ID
    const studentIds = students.map(s => s._id);
    const resumes = await Resume.find({ user: { $in: studentIds } })
      .sort({ createdAt: -1 })
      .lean();

    const resumeMap = {};
    resumes.forEach(r => {
      if (!resumeMap[String(r.user)]) {
        resumeMap[String(r.user)] = {
          resumeUrl: r.filePath,
          fileName: r.fileName,
          resumeScore: r.score || 0,
          skills: r.skills || [],
          uploadedAt: r.createdAt
        };
      }
    });

    // Fetch deployed projects mapped by student ID
    const studentEmails = students.map(s => s.email).filter(Boolean);
    const studentRolls = students.map(s => s.rollNumber).filter(Boolean);

    const allProjects = await Project.find({
      $or: [
        { student: { $in: studentIds } },
        { 'teamMembers.email': { $in: studentEmails } },
        { 'teamMembers.rollNumber': { $in: studentRolls } }
      ]
    }).sort({ updatedAt: -1 }).lean();

    const projectMap = {};
    allProjects.forEach(p => {
      const ownerId = String(p.student);
      if (!projectMap[ownerId]) projectMap[ownerId] = [];
      projectMap[ownerId].push({
        _id: p._id,
        title: p.title,
        description: p.description || '',
        deploymentUrl: p.deploymentUrl || p.previewUrl || '',
        repositoryUrl: p.repositoryUrl || '',
        technologies: p.technologies || [],
        status: p.status,
        isDeployed: !!(p.deploymentUrl || p.previewUrl)
      });

      if (p.teamMembers && p.teamMembers.length > 0) {
        p.teamMembers.forEach(tm => {
          const matchStudent = students.find(s =>
            (tm.email && s.email && s.email.toLowerCase() === tm.email.toLowerCase()) ||
            (tm.rollNumber && s.rollNumber && s.rollNumber.toLowerCase() === tm.rollNumber.toLowerCase())
          );
          if (matchStudent) {
            const mId = String(matchStudent._id);
            if (!projectMap[mId]) projectMap[mId] = [];
            if (!projectMap[mId].some(proj => String(proj._id) === String(p._id))) {
              projectMap[mId].push({
                _id: p._id,
                title: p.title,
                description: p.description || '',
                deploymentUrl: p.deploymentUrl || p.previewUrl || '',
                repositoryUrl: p.repositoryUrl || '',
                technologies: p.technologies || [],
                status: p.status,
                isDeployed: !!(p.deploymentUrl || p.previewUrl)
              });
            }
          }
        });
      }
    });

    const evaluated = students.map(student => {
      const studentCgpa = student.cgpa || (student.academicDetails?.cgpa || 7.5);
      const studentBranch = (student.branch || '').toUpperCase();
      const studentBatch = student.academicYear || student.year || '2026';
      const studentSkills = (student.skills || []).map(s => s.toLowerCase().trim());

      // 1. CGPA Check
      const isCgpaEligible = studentCgpa >= targetMinCgpa;

      // 2. Branch Check
      const isBranchEligible =
        targetBranches.includes('ALL') ||
        targetBranches.length === 0 ||
        targetBranches.some(b => b === studentBranch || studentBranch.includes(b) || b.includes(studentBranch));

      // 3. Batch Check
      const isBatchEligible =
        targetBatches.includes('ALL') ||
        targetBatches.length === 0 ||
        targetBatches.some(b => studentBatch.includes(b) || b.includes(studentBatch));

      // 4. Skills Matching
      let matchedSkills = [];
      let missingSkills = [];
      if (targetSkills.length > 0) {
        matchedSkills = targetSkills.filter(sk =>
          studentSkills.some(stSk => stSk.includes(sk) || sk.includes(stSk))
        );
        missingSkills = targetSkills.filter(sk => !matchedSkills.includes(sk));
      } else {
        matchedSkills = studentSkills.slice(0, 5);
      }

      // 5. Composite Match Score Calculation (0-100)
      let score = 0;
      if (isCgpaEligible) score += 30;
      else score += Math.max(0, Math.round((studentCgpa / targetMinCgpa) * 20));

      if (isBranchEligible) score += 25;
      if (isBatchEligible) score += 15;

      if (targetSkills.length > 0) {
        const skillRatio = matchedSkills.length / targetSkills.length;
        score += Math.round(skillRatio * 20);
      } else {
        score += 20;
      }

      // Factor in Placement Readiness Index (PRI)
      const pri = student.readinessScore || 0;
      score += Math.round((pri / 100) * 10);

      const finalMatchScore = Math.min(Math.max(score, 15), 98);
      const isOverallEligible = isCgpaEligible && isBranchEligible && isBatchEligible;

      // Check application status if driveObj was loaded
      let hasApplied = false;
      let applicationStatus = null;
      let appliedAt = null;

      if (driveObj && driveObj.applications) {
        const existingApp = driveObj.applications.find(a => String(a.student) === String(student._id));
        if (existingApp) {
          hasApplied = true;
          applicationStatus = existingApp.currentStage || 'applied';
          appliedAt = existingApp.appliedAt;
        }
      }

      const resMeta = resumeMap[String(student._id)] || {};
      const studentProjects = projectMap[String(student._id)] || [];
      const deployedProjects = studentProjects.filter(p => p.deploymentUrl);

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.mobileNumber || student.phone || '',
        mobileNumber: student.mobileNumber || student.phone || '',
        rollNumber: student.rollNumber || 'N/A',
        branch: student.branch || 'CSE',
        section: student.section || 'A',
        batch: studentBatch,
        cgpa: studentCgpa,
        skills: student.skills || [],
        targetRole: student.targetRole || 'Software Engineer',
        bio: student.bio || '',
        readinessScore: student.readinessScore || 0,
        leetcodeStats: student.leetcodeStats || { totalSolved: 0 },
        githubProfileUrl: student.githubProfileUrl || '',
        resumeUrl: resMeta.resumeUrl || '',
        resumeFileName: resMeta.fileName || '',
        resumeScore: resMeta.resumeScore || 0,
        resumeSkills: resMeta.skills || [],
        latestResume: resMeta.resumeUrl ? {
          filePath: resMeta.resumeUrl,
          fileName: resMeta.fileName,
          score: resMeta.resumeScore,
          skills: resMeta.skills,
          uploadedAt: resMeta.uploadedAt
        } : null,
        projects: studentProjects,
        deployedProjects: deployedProjects.length > 0 ? deployedProjects : studentProjects,
        isCgpaEligible,
        isBranchEligible,
        isBatchEligible,
        isEligible: isOverallEligible,
        matchScore: finalMatchScore,
        matchedSkills,
        missingSkills,
        hasApplied,
        applicationStatus,
        appliedAt
      };
    });

    // Apply search filter if present
    let filtered = evaluated;
    if (querySearch && querySearch.trim()) {
      const q = querySearch.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.skills.some(sk => sk.toLowerCase().includes(q))
      );
    }

    // Apply minimum PRI filter
    if (queryMinPri) {
      const minPriNum = Number(queryMinPri);
      filtered = filtered.filter(s => s.readinessScore >= minPriNum);
    }

    // Apply eligibleOnly filter
    if (eligibleOnly === 'true') {
      filtered = filtered.filter(s => s.isEligible);
    }

    // Sort: Eligible students first, then applied/in pipeline, then highest match score, then highest CGPA
    filtered.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      if (a.hasApplied && !b.hasApplied) return -1;
      if (!a.hasApplied && b.hasApplied) return 1;
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return b.cgpa - a.cgpa;
    });

    res.status(200).json({
      success: true,
      count: filtered.length,
      totalStudents: students.length,
      criteria: {
        driveId: driveId || null,
        driveTitle: driveObj ? driveObj.title : null,
        companyName: driveObj ? driveObj.companyName : null,
        minCgpa: targetMinCgpa,
        allowedBranches: targetBranches,
        allowedBatches: targetBatches,
        maxActiveBacklogs: targetMaxBacklogs,
        requiredSkills: targetSkills
      },
      data: filtered
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Recruiter invites student to apply for an on-campus placement drive
// @route   POST /api/recruiter/invite-student
// @access  Private (Recruiter, Admin)
exports.inviteStudentToDrive = async (req, res, next) => {
  try {
    const { studentId, driveId, customMessage } = req.body;

    if (!studentId || !driveId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both studentId and driveId.'
      });
    }

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const company = req.user.companyName || drive.companyName;
    const role = drive.role || drive.title;

    // Send direct Notification to student
    await Notification.create({
      user: student._id,
      type: 'job_update',
      message: customMessage || `🌟 Recruiter Fast-Track Invitation: ${company} recruitment team has invited you to apply for their campus drive for '${role}' (${drive.packageDetails})!`,
      metadata: {
        jobId: drive._id,
        driveId: drive._id,
        invitedBy: req.user.name,
        company
      }
    });

    await logActivity({
      user: req.user,
      action: 'RECRUITER_STUDENT_INVITED',
      category: 'Placement Operations',
      description: `${req.user.name} (${company}) sent direct invitation to student ${student.name} (${student.rollNumber || student.email}) for drive '${role}'`,
      details: { studentId: student._id, driveId: drive._id },
      req
    });

    res.status(200).json({
      success: true,
      message: `Invitation successfully dispatched to ${student.name}!`
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// RECRUITER DRIVE MANAGEMENT & CANDIDATE PIPELINE
// =========================================================================

// @desc    Get drives assigned to or posted by this recruiter
// @route   GET /api/recruiter/my-drives
// @access  Private (Recruiter, Admin)
exports.getMyDrives = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'recruiter') {
      const company = req.user.companyName;
      query = {
        $or: [
          { createdBy: req.user._id },
          ...(company ? [{ companyName: new RegExp(`^${company}$`, 'i') }] : [])
        ]
      };
    }

    const drives = await PlacementDrive.find(query)
      .populate('createdBy', 'name email companyName role')
      .sort({ createdAt: -1 });

    const formatted = drives.map(d => {
      const dObj = d.toObject();
      const apps = dObj.applications || [];

      return {
        ...dObj,
        driveTitle: dObj.title,
        packageLPA: dObj.packageDetails,
        totalApplicants: apps.length,
        shortlistedCount: apps.filter(a => ['shortlisted', 'online_test_cleared', 'interview_round_1', 'interview_round_2', 'hr_round', 'selected'].includes(a.currentStage)).length,
        selectedCount: apps.filter(a => a.currentStage === 'selected').length,
        offeredCount: apps.filter(a => a.currentStage === 'offered' || a.offerDetails?.offeredPackage).length
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

// @desc    Recruiter posts a new on-campus placement drive
// @route   POST /api/recruiter/drives
// @access  Private (Recruiter, Admin)
exports.createDriveByRecruiter = async (req, res, next) => {
  try {
    const b = req.body;
    const company = (req.user.companyName || b.companyName || 'Visiting Recruiter').trim();
    const role = (b.role || 'Software Development Engineer').trim();
    const title = (b.title || b.driveTitle || `${company} On-Campus Recruitment Drive`).trim();
    const packageDetails = (
      b.packageDetails ||
      (b.packageLPA ? (String(b.packageLPA).toUpperCase().includes('LPA') ? String(b.packageLPA) : `${b.packageLPA} LPA`) : '12.0 LPA')
    ).trim();

    const regDeadline = b.dates?.registrationDeadline || b.deadline || new Date(Date.now() + 7 * 86400000);
    const driveDt = b.dates?.driveDate || b.driveDate || new Date(Date.now() + 10 * 86400000);

    let skillsArr = b.skillsRequired || b.requiredSkills || [];
    if (typeof skillsArr === 'string') {
      skillsArr = skillsArr.split(',').map(s => s.trim()).filter(Boolean);
    }

    let allowedBranches = b.eligibility?.allowedBranches || ['CSE', 'IT', 'CSIT', 'AIML', 'AIDS', 'ECE', 'EEE'];
    if (typeof allowedBranches === 'string') {
      allowedBranches = allowedBranches.split(',').map(s => s.trim()).filter(Boolean);
    }

    let allowedBatches = b.eligibility?.allowedBatches || ['2026', '2025'];
    if (typeof allowedBatches === 'string') {
      allowedBatches = allowedBatches.split(',').map(s => s.trim()).filter(Boolean);
    }

    const driveData = {
      companyName: company,
      companyLogo: b.companyLogo || req.user.companyLogo || '',
      companyWebsite: b.companyWebsite || req.user.companyWebsite || '',
      tier: b.tier || 'Dream (6-10 LPA)',
      title,
      role,
      packageDetails,
      location: (b.location || 'Campus / Hybrid').trim(),
      jobDescription: (
        b.jobDescription ||
        b.description ||
        `${company} is conducting an on-campus placement drive for the ${role} position with CTC package of ${packageDetails}.`
      ).trim(),
      skillsRequired: skillsArr,
      eligibility: {
        minCgpa: Number(b.eligibility?.minCgpa) || 6.5,
        maxActiveBacklogs: Number(b.eligibility?.maxActiveBacklogs ?? b.eligibility?.maxBacklogs ?? 0),
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
      createdBy: req.user._id
    };

    // Date conflict check on drive date
    const driveConflict = await checkSchedulingConflict({
      targetDate: driveDt,
      taskType: 'On-Campus Placement Drive',
      currentCompany: company,
      currentRecruiterId: req.user._id
    });
    if (driveConflict.hasConflict) {
      return res.status(409).json({
        success: false,
        conflict: true,
        error: driveConflict.conflict.message,
        conflictDetails: driveConflict.conflict
      });
    }

    // Date conflict check on online test date (if provided)
    if (b.dates?.onlineTestDate) {
      const testConflict = await checkSchedulingConflict({
        targetDate: b.dates.onlineTestDate,
        taskType: 'Online Assessment / Test',
        currentCompany: company,
        currentRecruiterId: req.user._id
      });
      if (testConflict.hasConflict) {
        return res.status(409).json({
          success: false,
          conflict: true,
          error: testConflict.conflict.message,
          conflictDetails: testConflict.conflict
        });
      }
    }

    // Date conflict check on interview start date (if provided)
    if (b.dates?.interviewStartDate) {
      const intConflict = await checkSchedulingConflict({
        targetDate: b.dates.interviewStartDate,
        taskType: 'Technical Interviews',
        currentCompany: company,
        currentRecruiterId: req.user._id
      });
      if (intConflict.hasConflict) {
        return res.status(409).json({
          success: false,
          conflict: true,
          error: intConflict.conflict.message,
          conflictDetails: intConflict.conflict
        });
      }
    }

    const drive = await PlacementDrive.create(driveData);

    // Sync to Placement Calendar
    try {
      await PlacementEvent.create({
        title: `🏢 ${drive.companyName} Campus Drive: ${drive.role}`,
        description: `${drive.jobDescription}\n\nPackage: ${drive.packageDetails}\nMin CGPA: ${drive.eligibility?.minCgpa}`,
        category: 'drive',
        colorTag: 'purple',
        startDateTime: new Date(drive.dates.driveDate),
        endDateTime: new Date(new Date(drive.dates.driveDate).getTime() + 4 * 3600000),
        venueOrLink: drive.location || 'College Placement Cell',
        instructorOrCompany: drive.companyName,
        creatorRole: req.user.role,
        creatorName: req.user.name,
        visibility: 'public',
        isVisibleToStudents: true,
        priority: 'high',
        targetAudience: {
          roles: ['student', 'faculty', 'admin', 'recruiter'],
          branches: drive.eligibility?.allowedBranches || ['All'],
          batches: drive.eligibility?.allowedBatches || ['All']
        },
        relatedDrive: drive._id,
        createdBy: req.user._id
      });
    } catch (e) {
      console.warn('Calendar sync error on recruiter drive create:', e.message);
    }

    // Broadcast email & WhatsApp notifications (including phone 8074701052)
    notifyStudentsOnDrivePost(drive, '8074701052').catch(err => {
      console.warn('Placement notification dispatch error:', err.message);
    });

    await logActivity({
      user: req.user,
      action: 'RECRUITER_DRIVE_POSTED',
      category: 'Placement Operations',
      description: `Recruiter ${req.user.name} (${drive.companyName}) posted on-campus drive for ${drive.role} (${drive.packageDetails})`,
      details: { driveId: drive._id },
      req
    });

    res.status(201).json({
      success: true,
      message: 'On-campus placement drive published successfully!',
      data: drive
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update candidate recruitment stage and schedule interview slot
// @route   PUT /api/recruiter/candidates/:driveId/:studentId/stage
// @access  Private (Recruiter, Admin)
exports.updateCandidateRecruiterStage = async (req, res, next) => {
  try {
    const { driveId, studentId } = req.params;
    const {
      stage,
      currentStage,
      interviewSchedule,
      interviewDate,
      interviewTime,
      venue,
      meetingLink,
      interviewerNotes,
      offeredPackage
    } = req.body;

    const targetStage = stage || currentStage;
    if (!targetStage) {
      return res.status(400).json({ success: false, error: 'Please specify target stage' });
    }

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    const appIndex = drive.applications.findIndex(a => String(a.student) === String(studentId));
    if (appIndex === -1) {
      return res.status(404).json({ success: false, error: 'Candidate application not found for this drive' });
    }

    const app = drive.applications[appIndex];
    app.currentStage = targetStage;

    // Handle interview schedule update
    if (interviewSchedule || interviewDate || meetingLink || venue) {
      let scheduledAt = app.interviewSchedule?.scheduledAt;
      if (interviewDate) {
        scheduledAt = interviewTime ? new Date(`${interviewDate}T${interviewTime}`) : new Date(interviewDate);
      }

      app.interviewSchedule = {
        roundName: interviewSchedule?.roundName || targetStage.replace(/_/g, ' ').toUpperCase(),
        scheduledAt: scheduledAt || app.interviewSchedule?.scheduledAt,
        venue: venue || interviewSchedule?.venue || app.interviewSchedule?.venue || 'Campus Placement Hall',
        meetingLink: meetingLink || interviewSchedule?.meetingLink || app.interviewSchedule?.meetingLink || '',
        interviewerNotes: interviewerNotes || interviewSchedule?.interviewerNotes || app.interviewSchedule?.interviewerNotes || ''
      };
    }

    // Handle offer details update
    if (offeredPackage || targetStage === 'offered' || targetStage === 'selected') {
      app.offerDetails = {
        offeredPackage: offeredPackage || drive.packageDetails,
        offeredRole: drive.role,
        offerDate: new Date(),
        accepted: app.offerDetails?.accepted || false
      };
    }

    await drive.save();

    // Send instant notification to student
    const stageDisplay = targetStage.replace(/_/g, ' ').toUpperCase();
    await Notification.create({
      user: studentId,
      type: 'job_update',
      message: `🎉 Progress Update: Your ${drive.companyName} campus recruitment application has advanced to: ${stageDisplay}!`,
      metadata: {
        driveId: drive._id,
        stage: targetStage,
        company: drive.companyName
      }
    }).catch(() => {});

    await logActivity({
      user: req.user,
      action: 'CANDIDATE_STAGE_UPDATED',
      category: 'Placement Operations',
      description: `${req.user.name} advanced candidate ${app.studentName} to '${stageDisplay}' in ${drive.companyName} drive`,
      details: { driveId: drive._id, studentId, targetStage },
      req
    });

    res.status(200).json({
      success: true,
      message: `Candidate stage updated to '${stageDisplay}' successfully!`,
      data: app
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export suitable students or drive applicants as CSV
// @route   GET /api/recruiter/export-csv
// @access  Private (Recruiter, Admin)
exports.exportRecruiterCSV = async (req, res, next) => {
  try {
    const { driveId, minCgpa = 6.5 } = req.query;

    let studentsToExport = [];

    if (driveId) {
      const drive = await PlacementDrive.findById(driveId);
      if (drive && drive.applications) {
        studentsToExport = drive.applications.map(a => ({
          Name: a.studentName,
          Email: a.studentEmail,
          RollNumber: a.studentRollNumber,
          Branch: a.studentBranch,
          CGPA: a.studentCgpa,
          Phone: a.studentPhone || 'N/A',
          Stage: (a.currentStage || 'applied').toUpperCase(),
          InterviewVenue: a.interviewSchedule?.venue || 'N/A',
          InterviewTime: a.interviewSchedule?.scheduledAt ? new Date(a.interviewSchedule.scheduledAt).toLocaleString() : 'N/A',
          AppliedDate: new Date(a.appliedAt).toLocaleDateString()
        }));
      }
    } else {
      const allStudents = await User.find({ role: 'student' }).lean();
      studentsToExport = allStudents
        .filter(s => (s.cgpa || 7.5) >= Number(minCgpa))
        .map(s => ({
          Name: s.name,
          Email: s.email,
          RollNumber: s.rollNumber || 'N/A',
          Branch: s.branch || 'N/A',
          Batch: s.academicYear || s.year || '2026',
          CGPA: s.cgpa || 7.5,
          Phone: s.phone || 'N/A',
          ReadinessScore: `${s.readinessScore || 0}%`,
          Skills: (s.skills || []).join('; ')
        }));
    }

    if (studentsToExport.length === 0) {
      return res.status(200).send('No student records found matching export criteria');
    }

    const headers = Object.keys(studentsToExport[0]).join(',');
    const rows = studentsToExport.map(row =>
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );

    const csvContent = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="recruiter_students_export_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// CANDIDATE ASSESSMENT & PIPELINE STAGE CONTROLS
// =========================================================================

// @desc    Bulk add selected students into drive pipeline
// @route   POST /api/recruiter/drives/:driveId/bulk-add-candidates
// @access  Private (Recruiter, Admin)
exports.bulkAddCandidates = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const { studentIds = [] } = req.body;

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    const students = await User.find({ _id: { $in: studentIds } });
    let addedCount = 0;

    for (const student of students) {
      const exists = (drive.applications || []).some(a => String(a.student) === String(student._id));
      if (!exists) {
        drive.applications.push({
          student: student._id,
          studentName: student.name,
          studentEmail: student.email,
          studentRollNumber: student.rollNumber || '',
          studentBranch: student.branch || '',
          studentCgpa: student.cgpa || 7.5,
          studentPhone: student.phone || '',
          currentStage: 'applied',
          appliedAt: new Date()
        });
        addedCount++;
      }
    }

    await drive.save();

    res.status(200).json({
      success: true,
      message: `Enrolled ${addedCount} student(s) into candidate pipeline!`,
      addedCount,
      applications: drive.applications
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Recruiter conducts/schedules exam for candidate pool
// @route   POST /api/recruiter/drives/:driveId/conduct-exam
// @access  Private (Recruiter, Admin)
exports.conductDriveExam = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const {
      examTitle = 'Campus Online Assessment',
      examLink = '',
      examDate,
      examTime = '10:00 AM',
      instructions = 'Please ensure a stable internet connection and quiet environment for the proctored test.',
      studentIds = [],
      specificPhone = '8074701052'
    } = req.body;

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    if (examDate) {
      // Validate scheduling conflict across recruiters for this exam date
      const conflictCheck = await checkSchedulingConflict({
        targetDate: examDate,
        taskType: 'Online Assessment Round',
        excludeDriveId: drive._id,
        currentCompany: drive.companyName,
        currentRecruiterId: req.user._id
      });
      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          success: false,
          conflict: true,
          error: conflictCheck.conflict.message,
          conflictDetails: conflictCheck.conflict
        });
      }
      drive.dates.onlineTestDate = new Date(examDate);
    }

    // Determine target candidates: either specified studentIds, or all candidate applications in drive
    let targetApplications = [];
    if (studentIds.length > 0) {
      const missingIds = studentIds.filter(id => !drive.applications.some(a => String(a.student) === String(id)));
      if (missingIds.length > 0) {
        const missingStudents = await User.find({ _id: { $in: missingIds } });
        missingStudents.forEach(st => {
          drive.applications.push({
            student: st._id,
            studentName: st.name,
            studentEmail: st.email,
            studentRollNumber: st.rollNumber || '',
            studentBranch: st.branch || '',
            studentCgpa: st.cgpa || 7.5,
            studentPhone: st.phone || '',
            currentStage: 'shortlisted',
            appliedAt: new Date()
          });
        });
      }

      targetApplications = drive.applications.filter(a => studentIds.includes(String(a.student)));
    } else {
      targetApplications = drive.applications;
    }

    if (targetApplications.length === 0) {
      return res.status(400).json({ success: false, error: 'No candidates selected or present in drive pipeline to conduct exam.' });
    }

    // Update their stage & schedule notes
    targetApplications.forEach(app => {
      app.currentStage = 'shortlisted';
      app.interviewSchedule = {
        roundName: examTitle,
        scheduledAt: examDate ? (examTime ? new Date(`${examDate}T${examTime}`) : new Date(examDate)) : new Date(),
        venue: 'Online Proctored Platform',
        meetingLink: examLink,
        interviewerNotes: `Exam instructions: ${instructions}`
      };
    });

    await drive.save();

    const formattedDate = examDate ? new Date(examDate).toLocaleDateString() : 'Scheduled Date';
    const waExamMsg =
`📝 *CAMPUS BRIDGE PLACEMENT - ONLINE EXAM SCHEDULED*
------------------------------------------------
Dear Candidate,
The recruitment team from *${drive.companyName}* has scheduled your Online Exam:

📋 *Assessment Round:* ${examTitle}
📅 *Exam Date:* ${formattedDate}
⏰ *Time:* ${examTime}
🔗 *Exam Platform Link:* ${examLink || 'Accessible on student placement dashboard'}
ℹ️ *Instructions:* ${instructions}

Please login to your portal 15 minutes before the exam window:
👉 https://placement-guide-nu.vercel.app/login

- Placement Cell & ${drive.companyName}`;

    // Send WhatsApp notification to phone 8074701052
    await sendWhatsAppMessage({
      to: specificPhone,
      message: waExamMsg,
      studentName: 'Candidate / Coordinator',
      driveTitle: `${drive.companyName} - Online Exam (${targetApplications.length} Candidates)`
    });

    // Notify candidates via email & WhatsApp
    for (const app of targetApplications) {
      if (app.studentEmail) {
        sendEmail({
          to: app.studentEmail,
          subject: `📝 Online Exam Scheduled: ${drive.companyName} - ${examTitle}`,
          text: `Dear ${app.studentName},\n\nYour online test for ${drive.companyName} (${drive.role}) has been scheduled on ${formattedDate} at ${examTime}.\nExam Link: ${examLink}\nInstructions: ${instructions}\n\nLogin at https://placement-guide-nu.vercel.app/login`,
          html: `<div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 10px;">
            <h2 style="color: #fbbf24;">📝 Online Assessment Round Scheduled</h2>
            <p>Dear <strong>${app.studentName}</strong>,</p>
            <p>You have been shortlisted to take the online assessment for <strong>${drive.companyName}</strong> (${drive.role}).</p>
            <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Round Name:</strong> ${examTitle}</p>
              <p><strong>Scheduled Date &amp; Time:</strong> ${formattedDate} at ${examTime}</p>
              <p><strong>Exam Link:</strong> <a href="${examLink}" style="color: #38bdf8;">${examLink || 'Check placement portal'}</a></p>
              <p><strong>Instructions:</strong> ${instructions}</p>
            </div>
            <a href="https://placement-guide-nu.vercel.app/login" style="background: #a855f7; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Open Placement Portal</a>
          </div>`
        }).catch(() => {});
      }

      if (app.studentPhone && app.studentPhone !== specificPhone) {
        sendWhatsAppMessage({
          to: app.studentPhone,
          message: waExamMsg,
          studentName: app.studentName,
          driveTitle: `${drive.companyName} - Online Exam`
        }).catch(() => {});
      }

      Notification.create({
        user: app.student,
        type: 'job_update',
        message: `📝 Online Exam Scheduled: ${drive.companyName} test on ${formattedDate} at ${examTime}. Check details!`,
        metadata: { driveId: drive._id, examLink, examTitle }
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: `Online exam successfully scheduled for ${targetApplications.length} candidate(s)! Notifications dispatched.`,
      candidatesCount: targetApplications.length
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Recruiter imports bulk list of students who cleared the online test
// @route   POST /api/recruiter/drives/:driveId/bulk-import-test-cleared
// @access  Private (Recruiter, Admin)
exports.bulkImportTestCleared = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const {
      rollNumbers = [],
      rawText = '',
      testMarks = {},
      specificPhone = '8074701052'
    } = req.body;

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    // Extract identifiers (roll numbers, emails, student IDs)
    let identifiers = [...rollNumbers];
    if (rawText && rawText.trim()) {
      const extracted = rawText
        .split(/[\r\n,;]+/)
        .map(t => t.trim())
        .filter(Boolean);
      identifiers = [...identifiers, ...extracted];
    }

    identifiers = Array.from(new Set(identifiers.map(i => i.trim())));
    if (identifiers.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide at least one student roll number or email.' });
    }

    const mongoose = require('mongoose');
    const queryConditions = [
      { rollNumber: { $in: identifiers.map(i => new RegExp(`^${i}$`, 'i')) } },
      { email: { $in: identifiers.map(i => new RegExp(`^${i}$`, 'i')) } }
    ];

    const validIds = identifiers.filter(i => mongoose.Types.ObjectId.isValid(i));
    if (validIds.length > 0) {
      queryConditions.push({ _id: { $in: validIds } });
    }

    const matchedStudents = await User.find({
      role: 'student',
      $or: queryConditions
    });

    if (matchedStudents.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'None of the provided roll numbers or emails matched registered student accounts in the portal.'
      });
    }

    let updatedCount = 0;
    const clearedList = [];

    matchedStudents.forEach(student => {
      let app = drive.applications.find(a => String(a.student) === String(student._id));
      const score = testMarks[student.rollNumber] || testMarks[student.email] || testMarks[String(student._id)] || 'Cleared';

      if (app) {
        app.currentStage = 'online_test_cleared';
        app.interviewerNotes = `Online Test Result: Cleared (Score: ${score}). Ready for Interview Round 1.`;
      } else {
        drive.applications.push({
          student: student._id,
          studentName: student.name,
          studentEmail: student.email,
          studentRollNumber: student.rollNumber || '',
          studentBranch: student.branch || '',
          studentCgpa: student.cgpa || 7.5,
          studentPhone: student.phone || '',
          currentStage: 'online_test_cleared',
          appliedAt: new Date(),
          interviewerNotes: `Online Test Result: Cleared (Score: ${score}). Bulk imported by recruiter.`
        });
      }

      clearedList.push({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email,
        phone: student.phone
      });
      updatedCount++;
    });

    await drive.save();

    const waClearedMsg =
`🎉 *CONGRATULATIONS! ONLINE TEST CLEARED*
----------------------------------------
Dear Candidate,
You have successfully *CLEARED THE ONLINE ASSESSMENT* for *${drive.companyName}* (${drive.role})!

Next Steps:
🎙️ You are now officially advanced to *Interview Round 1 (Technical)*.
📅 The interview slot, venue, and video call link will be published on your placement dashboard shortly.

Check your Candidate Status:
👉 https://placement-guide-nu.vercel.app/login

- Placement Cell & ${drive.companyName} Recruitment Team`;

    // Send WhatsApp notification to phone 8074701052
    await sendWhatsAppMessage({
      to: specificPhone,
      message: waClearedMsg,
      studentName: 'Cleared Candidate / Coordinator',
      driveTitle: `${drive.companyName} - Online Test Cleared (${updatedCount} Candidates)`
    });

    // Notify individual students
    matchedStudents.forEach(st => {
      if (st.email) {
        sendEmail({
          to: st.email,
          subject: `🎉 Online Test Cleared: ${drive.companyName} Recruitment Drive`,
          text: `Congratulations ${st.name}!\n\nYou have successfully CLEARED the Online Assessment for ${drive.companyName} (${drive.role}).\nYou are now advanced to Interview Round 1 (Technical).\n\nCheck portal: https://placement-guide-nu.vercel.app/login`,
          html: `<div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 10px;">
            <h2 style="color: #34d399;">🎉 Online Test Cleared!</h2>
            <p>Dear <strong>${st.name}</strong> (${st.rollNumber}),</p>
            <p>Congratulations! You have passed the Online Assessment round for <strong>${drive.companyName}</strong> (${drive.role}).</p>
            <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Current Stage:</strong> 3. Online Test Cleared</p>
              <p><strong>Next Step:</strong> 4. Interview Round 1 (Technical)</p>
              <p>Your interview time slot, venue, and meeting links will appear on your dashboard shortly.</p>
            </div>
            <a href="https://placement-guide-nu.vercel.app/login" style="background: #10b981; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Recruitment Status</a>
          </div>`
        }).catch(() => {});
      }

      if (st.phone && st.phone !== specificPhone) {
        sendWhatsAppMessage({
          to: st.phone,
          message: waClearedMsg,
          studentName: st.name,
          driveTitle: `${drive.companyName} - Test Cleared`
        }).catch(() => {});
      }

      Notification.create({
        user: st._id,
        type: 'job_update',
        message: `🎉 Congratulations! You cleared the ${drive.companyName} online test and advanced to Interview Round 1.`,
        metadata: { driveId: drive._id, stage: 'online_test_cleared' }
      }).catch(() => {});
    });

    res.status(200).json({
      success: true,
      message: `Successfully imported & marked ${updatedCount} student(s) as 'Test Cleared'!`,
      clearedCount: updatedCount,
      clearedStudents: clearedList
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk advance candidates to Interview 1, Interview 2, Selected, or Offered
// @route   POST /api/recruiter/drives/:driveId/bulk-advance-stage
// @access  Private (Recruiter, Admin)
exports.bulkAdvanceCandidatesStage = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const {
      studentIds = [],
      targetStage = 'interview_round_1',
      interviewDate,
      interviewTime = '11:00 AM',
      venue = 'Campus Placement Cell',
      meetingLink = '',
      interviewerNotes = '',
      offeredPackage = '',
      specificPhone = '8074701052'
    } = req.body;

    const drive = await PlacementDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({ success: false, error: 'Placement drive not found' });
    }

    const stageNames = {
      interview_round_1: 'Interview Round 1 (Technical)',
      interview_round_2: 'Interview Round 2 (Managerial / Final)',
      hr_round: 'HR & Cultural Round',
      selected: 'Final Selection',
      offered: 'Offer Released'
    };
    const stageDisplay = stageNames[targetStage] || targetStage.replace(/_/g, ' ').toUpperCase();

    if (interviewDate) {
      // Validate scheduling conflict across recruiters for this interview date
      const conflictCheck = await checkSchedulingConflict({
        targetDate: interviewDate,
        taskType: 'Technical / HR Interview Round',
        excludeDriveId: drive._id,
        currentCompany: drive.companyName,
        currentRecruiterId: req.user._id
      });
      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          success: false,
          conflict: true,
          error: conflictCheck.conflict.message,
          conflictDetails: conflictCheck.conflict
        });
      }
    }

    let scheduledAt = interviewDate
      ? (interviewTime ? new Date(`${interviewDate}T${interviewTime}`) : new Date(interviewDate))
      : undefined;

    let updatedCount = 0;
    const advancedList = [];

    drive.applications.forEach(app => {
      if (studentIds.includes(String(app.student))) {
        app.currentStage = targetStage;
        if (scheduledAt || venue || meetingLink || interviewerNotes) {
          app.interviewSchedule = {
            roundName: stageDisplay,
            scheduledAt: scheduledAt || app.interviewSchedule?.scheduledAt,
            venue: venue || app.interviewSchedule?.venue || 'Campus Placement Hall',
            meetingLink: meetingLink || app.interviewSchedule?.meetingLink || '',
            interviewerNotes: interviewerNotes || app.interviewSchedule?.interviewerNotes || ''
          };
        }

        if (targetStage === 'selected' || targetStage === 'offered') {
          app.offerDetails = {
            offeredPackage: offeredPackage || drive.packageDetails,
            offeredRole: drive.role,
            offerDate: new Date(),
            accepted: app.offerDetails?.accepted || false
          };
        }

        advancedList.push(app);
        updatedCount++;
      }
    });

    await drive.save();

    const formattedDate = interviewDate ? new Date(interviewDate).toLocaleDateString() : 'Scheduled Date';
    const waAdvanceMsg =
`📢 *CAMPUS BRIDGE PLACEMENT UPDATE: ${stageDisplay.toUpperCase()}*
-------------------------------------------------
Dear Candidate,
Your application for *${drive.companyName}* (${drive.role}) has advanced to:
🎯 *Stage:* ${stageDisplay}

${targetStage.includes('interview') ? `📅 *Interview Date:* ${formattedDate}\n⏰ *Time Slot:* ${interviewTime}\n📍 *Venue / Mode:* ${venue}\n🔗 *Meeting Link:* ${meetingLink || 'In-Person on Campus'}\n` : ''}${targetStage === 'selected' || targetStage === 'offered' ? `🏆 *Congratulations on your selection!*\n💰 *Compensation (CTC):* ${offeredPackage || drive.packageDetails}\n` : ''}
Please log in to your student portal for instructions:
👉 https://placement-guide-nu.vercel.app/login

- Placement Cell & ${drive.companyName}`;

    // Notify WhatsApp to 8074701052
    await sendWhatsAppMessage({
      to: specificPhone,
      message: waAdvanceMsg,
      studentName: 'Candidate / Coordinator',
      driveTitle: `${drive.companyName} - Advanced to ${stageDisplay}`
    });

    // Notify individual candidates
    for (const app of advancedList) {
      if (app.studentEmail) {
        sendEmail({
          to: app.studentEmail,
          subject: `📢 ${drive.companyName} Placement Update: ${stageDisplay}`,
          text: `Dear ${app.studentName},\n\nYou have advanced to ${stageDisplay} for ${drive.companyName} (${drive.role}).\nLogin to https://placement-guide-nu.vercel.app/login`,
          html: `<div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 10px;">
            <h2 style="color: #c084fc;">📢 Candidate Advancement: ${stageDisplay}</h2>
            <p>Dear <strong>${app.studentName}</strong>,</p>
            <p>Your candidacy for <strong>${drive.companyName}</strong> (${drive.role}) has been moved to <strong>${stageDisplay}</strong>.</p>
            ${scheduledAt ? `<div style="background: #1e293b; padding: 14px; border-radius: 8px; margin: 16px 0;">
              <p><strong>Scheduled Date:</strong> ${formattedDate} at ${interviewTime}</p>
              <p><strong>Venue / Mode:</strong> ${venue}</p>
              ${meetingLink ? `<p><strong>Link:</strong> <a href="${meetingLink}" style="color: #38bdf8;">${meetingLink}</a></p>` : ''}
            </div>` : ''}
            <a href="https://placement-guide-nu.vercel.app/login" style="background: #a855f7; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">View Placement Dashboard</a>
          </div>`
        }).catch(() => {});
      }

      if (app.studentPhone && app.studentPhone !== specificPhone) {
        sendWhatsAppMessage({
          to: app.studentPhone,
          message: waAdvanceMsg,
          studentName: app.studentName,
          driveTitle: `${drive.companyName} - ${stageDisplay}`
        }).catch(() => {});
      }

      Notification.create({
        user: app.student,
        type: 'job_update',
        message: `📢 Status Update: You advanced to ${stageDisplay} for ${drive.companyName}. Check your interview schedule!`,
        metadata: { driveId: drive._id, stage: targetStage }
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: `Successfully advanced ${updatedCount} candidate(s) to '${stageDisplay}'!`,
      updatedCount,
      stage: targetStage
    });
  } catch (err) {
    next(err);
  }
};
