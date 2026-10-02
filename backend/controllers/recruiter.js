const crypto = require('crypto');
const User = require('../models/User');
const PlacementDrive = require('../models/PlacementDrive');
const PlacementEvent = require('../models/PlacementEvent');
const Notification = require('../models/Notification');
const Resume = require('../models/Resume');
const { logActivity } = require('../utils/auditLogger');

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
// SUITABLE STUDENTS POOL (RECRUITER & ADMIN VIEW)
// =========================================================================

// @desc    Get suitable/eligible students matching drive criteria or custom cutoffs
// @route   GET /api/recruiter/suitable-students
// @access  Private (Recruiter, Admin)
exports.getSuitableStudents = async (req, res, next) => {
  try {
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
      .select('name email phone rollNumber branch section academicYear year bio skills targetRole readinessScore leetcodeStats codeforcesStats codechefStats hackerrankStats githubProfileUrl createdAt')
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
          resumeScore: r.score || 0
        };
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

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone || '',
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

    // Sort: applied/shortlisted first, then highest match score, then highest CGPA
    filtered.sort((a, b) => {
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

    const drives = await PlacementDrive.find(query).sort({ createdAt: -1 });

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

    // Broadcast notifications to eligible students
    const targetQuery = { role: 'student' };
    if (allowedBranches.length > 0 && !allowedBranches.includes('All')) {
      targetQuery.branch = { $in: allowedBranches.map(br => new RegExp(`^${br}$`, 'i')) };
    }

    const eligibleStudents = await User.find(targetQuery).select('_id');
    const notifs = eligibleStudents.map(st => ({
      user: st._id,
      type: 'job_update',
      message: `🟣 New Campus Recruitment Drive: ${drive.companyName} is hiring for ${drive.role} (${drive.packageDetails})! Register before deadline.`,
      metadata: { jobId: drive._id }
    }));

    if (notifs.length > 0) {
      Notification.insertMany(notifs).catch(() => {});
    }

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
