const mongoose = require('mongoose');
const User = require('../models/User');
const PlacementDrive = require('../models/PlacementDrive');
const AptitudeTest = require('../models/AptitudeTest');
const LabTask = require('../models/LabTask');
const LabPracticeAttempt = require('../models/LabPracticeAttempt');
const Subject = require('../models/Subject');
const Project = require('../models/Project');
const Doubt = require('../models/Doubt');
const Notification = require('../models/Notification');
const Resume = require('../models/Resume');
const sendEmail = require('../utils/sendEmail');
const { sendWhatsAppMessage } = require('../utils/sendWhatsApp');
const { logActivity } = require('../utils/auditLogger');

// Helper to build branch matching regex
const getBranchPatterns = (branch = 'IT') => {
  const clean = (branch || 'IT').trim();
  const patterns = [new RegExp(`^${clean}$`, 'i')];
  if (/^it$/i.test(clean) || /information\s*technology/i.test(clean)) {
    patterns.push(new RegExp('Information\\s*Technology', 'i'));
    patterns.push(new RegExp('\\bIT\\b', 'i'));
  } else if (/^cse$/i.test(clean) || /computer\s*science/i.test(clean)) {
    patterns.push(new RegExp('Computer\\s*Science', 'i'));
    patterns.push(new RegExp('\\bCSE\\b', 'i'));
  } else if (/^ece$/i.test(clean)) {
    patterns.push(new RegExp('\\bECE\\b', 'i'));
  }
  return patterns;
};

// Calculate CGPA from SGPA sem 1 to 8
const computeCgpa = (student) => {
  const sems = [
    student.sgpaSem1 || 0,
    student.sgpaSem2 || 0,
    student.sgpaSem3 || 0,
    student.sgpaSem4 || 0,
    student.sgpaSem5 || 0,
    student.sgpaSem6 || 0,
    student.sgpaSem7 || 0,
    student.sgpaSem8 || 0
  ];
  const activeSems = sems.filter(v => v > 0);
  if (activeSems.length === 0) return 0;
  return Number((activeSems.reduce((a, b) => a + b, 0) / activeSems.length).toFixed(2));
};

// =========================================================================
// 1. DEPARTMENT OVERVIEW & ANALYTICS
// =========================================================================
exports.getDepartmentOverview = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    // 1. Students in this branch
    const students = await User.find({
      role: 'student',
      branch: { $in: branchPatterns }
    }).select('name email phone mobileNumber rollNumber branch section academicYear year sgpaSem1 sgpaSem2 sgpaSem3 sgpaSem4 sgpaSem5 sgpaSem6 sgpaSem7 sgpaSem8 readinessScore createdAt').lean();

    const totalStudents = students.length;

    // Batches breakdown
    const yearCounts = {
      '4th Year (Batch 2026)': 0,
      '3rd Year (Batch 2027)': 0,
      '2nd Year (Batch 2028)': 0,
      '1st Year (Batch 2029)': 0,
      'Other': 0
    };

    let totalCgpaSum = 0;
    let studentsWithCgpa = 0;
    let totalPriSum = 0;
    let atRiskCount = 0;

    students.forEach(st => {
      const cgpa = computeCgpa(st);
      if (cgpa > 0) {
        totalCgpaSum += cgpa;
        studentsWithCgpa++;
      }
      totalPriSum += (st.readinessScore || 0);

      // At-risk if low CGPA or low readiness index
      if ((cgpa > 0 && cgpa < 6.0) || (st.readinessScore && st.readinessScore < 40)) {
        atRiskCount++;
      }

      const yr = (st.academicYear || st.year || '').toLowerCase();
      if (/4th|final|iv|2026/i.test(yr)) yearCounts['4th Year (Batch 2026)']++;
      else if (/3rd|iii|2027/i.test(yr)) yearCounts['3rd Year (Batch 2027)']++;
      else if (/2nd|ii|2028/i.test(yr)) yearCounts['2nd Year (Batch 2028)']++;
      else if (/1st|i|2029/i.test(yr)) yearCounts['1st Year (Batch 2029)']++;
      else yearCounts['Other']++;
    });

    const averageCgpa = studentsWithCgpa > 0 ? Number((totalCgpaSum / studentsWithCgpa).toFixed(2)) : 7.2;
    const averagePri = totalStudents > 0 ? Math.round(totalPriSum / totalStudents) : 65;

    // 2. Faculties in this branch
    const faculties = await User.find({
      role: 'faculty',
      $or: [
        { branch: { $in: branchPatterns } },
        { 'managedScopes.branch': { $in: branchPatterns } },
        { managedScopes: { $size: 0 } }
      ]
    }).select('name email phone mobileNumber branch managedScopes managedAcademicYears lastLoginAt').lean();

    const totalFaculties = faculties.length;

    // 3. Placement Stats for this branch
    const allDrives = await PlacementDrive.find({}).lean();
    let totalApplications = 0;
    let selectedStudentsCount = 0;
    let offeredStudentsCount = 0;
    let highestPackageNum = 0;
    let highestPackageStr = '0 LPA';
    const packageNums = [];

    const studentIdSet = new Set(students.map(s => String(s._id)));

    allDrives.forEach(drive => {
      const apps = drive.applications || [];
      apps.forEach(app => {
        const isBranchStudent = studentIdSet.has(String(app.student)) ||
          branchPatterns.some(p => p.test(app.studentBranch || ''));

        if (isBranchStudent) {
          totalApplications++;
          if (app.currentStage === 'selected') {
            selectedStudentsCount++;
          }
          if (app.currentStage === 'offered' || app.offerDetails?.offeredPackage) {
            offeredStudentsCount++;
            const pkgStr = app.offerDetails?.offeredPackage || drive.packageDetails || '';
            const match = pkgStr.match(/(\d+(?:\.\d+)?)/);
            if (match) {
              const val = parseFloat(match[1]);
              packageNums.push(val);
              if (val > highestPackageNum) {
                highestPackageNum = val;
                highestPackageStr = `${val} LPA`;
              }
            }
          }
        }
      });
    });

    const avgPackageNum = packageNums.length > 0
      ? Number((packageNums.reduce((a, b) => a + b, 0) / packageNums.length).toFixed(2))
      : 0;

    // 4. Faculty Activity Counts
    const facultyIds = faculties.map(f => f._id);
    const totalTestsCreated = await AptitudeTest.countDocuments({ createdBy: { $in: facultyIds } });
    const totalLabsAssigned = await LabTask.countDocuments({ createdBy: { $in: facultyIds } });
    const totalDoubtsAnswered = await Doubt.countDocuments({ status: 'answered' });

    res.status(200).json({
      success: true,
      data: {
        department: branch,
        hodName: req.user.name,
        totalStudents,
        totalFaculties,
        averageCgpa,
        averagePri,
        atRiskCount,
        yearCounts,
        placements: {
          totalApplications,
          selectedStudentsCount,
          offeredStudentsCount,
          placementPercentage: totalStudents > 0 ? Math.round((offeredStudentsCount / totalStudents) * 100) : 0,
          highestPackage: highestPackageStr,
          averagePackage: avgPackageNum > 0 ? `${avgPackageNum} LPA` : '6.5 LPA'
        },
        facultyActivities: {
          totalTestsCreated,
          totalLabsAssigned,
          totalDoubtsAnswered
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 2. FACULTY MANAGEMENT (DEPARTMENT SPECIFIC)
// =========================================================================
exports.getDepartmentFaculties = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    const faculties = await User.find({
      role: 'faculty',
      $or: [
        { branch: { $in: branchPatterns } },
        { 'managedScopes.branch': { $in: branchPatterns } },
        { managedScopes: { $size: 0 } }
      ]
    }).select('name email phone mobileNumber branch targetRole managedScopes managedAcademicYears mustChangePassword lastLoginAt createdAt').lean();

    // Populate activity counts for each faculty
    const facultyData = await Promise.all(
      faculties.map(async (fac) => {
        const testsCount = await AptitudeTest.countDocuments({ createdBy: fac._id });
        const labsCount = await LabTask.countDocuments({ createdBy: fac._id });
        const doubtsCount = await Doubt.countDocuments({ answeredBy: new RegExp(fac.name, 'i') });

        return {
          ...fac,
          phone: fac.mobileNumber || fac.phone || '',
          mobileNumber: fac.mobileNumber || fac.phone || '',
          testsCount,
          labsCount,
          doubtsCount,
          assignedBranch: fac.branch || branch,
          scopesCount: fac.managedScopes?.length || 0
        };
      })
    );

    res.status(200).json({
      success: true,
      count: facultyData.length,
      data: facultyData
    });
  } catch (err) {
    next(err);
  }
};

// Add / Assign Faculty to Department
exports.addFacultyToDepartment = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const { name, email, password, mobileNumber, phone, assignedYear = '2026', assignedSection = 'A', designation = 'Assistant Professor' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Please provide faculty name and email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let faculty = await User.findOne({ email: cleanEmail });

    const newScope = {
      academicYear: assignedYear,
      branch,
      section: assignedSection
    };

    if (faculty) {
      faculty.role = 'faculty';
      faculty.branch = branch;
      if (mobileNumber || phone) {
        faculty.mobileNumber = (mobileNumber || phone).trim();
        faculty.phone = (mobileNumber || phone).trim();
      }
      faculty.managedScopes = faculty.managedScopes || [];
      const exists = faculty.managedScopes.some(s => s.academicYear === assignedYear && s.section === assignedSection && s.branch === branch);
      if (!exists) {
        faculty.managedScopes.push(newScope);
      }
      if (!faculty.managedAcademicYears.includes(assignedYear)) {
        faculty.managedAcademicYears.push(assignedYear);
      }
      await faculty.save();
    } else {
      faculty = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: password || 'Faculty@1234',
        role: 'faculty',
        branch,
        targetRole: designation,
        mobileNumber: (mobileNumber || phone || '').trim(),
        phone: (mobileNumber || phone || '').trim(),
        mustChangePassword: false,
        managedScopes: [newScope],
        managedAcademicYears: [assignedYear]
      });
    }

    res.status(201).json({
      success: true,
      message: `Faculty ${faculty.name} successfully assigned to Department of ${branch}.`,
      data: faculty
    });
  } catch (err) {
    next(err);
  }
};

// Update Faculty Scopes
exports.updateFacultyScope = async (req, res, next) => {
  try {
    const faculty = await User.findOne({ _id: req.params.id, role: 'faculty' });
    if (!faculty) {
      return res.status(404).json({ success: false, error: 'Faculty member not found' });
    }

    const { managedScopes, mobileNumber, phone, designation } = req.body;

    if (managedScopes && Array.isArray(managedScopes)) {
      faculty.managedScopes = managedScopes;
      faculty.managedAcademicYears = [...new Set(managedScopes.map(s => s.academicYear).filter(Boolean))];
    }

    if (mobileNumber || phone) {
      faculty.mobileNumber = (mobileNumber || phone).trim();
      faculty.phone = (mobileNumber || phone).trim();
    }

    if (designation) {
      faculty.targetRole = designation.trim();
    }

    await faculty.save();

    res.status(200).json({
      success: true,
      message: 'Faculty assignments updated successfully.',
      data: faculty
    });
  } catch (err) {
    next(err);
  }
};

// Get All Activities of Faculty in this Branch
exports.getFacultyActivities = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    const faculties = await User.find({
      role: 'faculty',
      $or: [
        { branch: { $in: branchPatterns } },
        { 'managedScopes.branch': { $in: branchPatterns } }
      ]
    }).select('_id name email').lean();

    const facultyIds = faculties.map(f => f._id);
    const facultyMap = {};
    faculties.forEach(f => { facultyMap[String(f._id)] = f.name; });

    // Recent tests created
    const tests = await AptitudeTest.find({ createdBy: { $in: facultyIds } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Recent lab tasks
    const labs = await LabTask.find({ createdBy: { $in: facultyIds } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Recent answered doubts
    const doubts = await Doubt.find({ status: 'answered' })
      .sort({ answeredAt: -1 })
      .limit(20)
      .lean();

    const activities = [];

    tests.forEach(t => {
      activities.push({
        id: t._id,
        type: 'test_created',
        category: 'Aptitude / Coding Test',
        title: t.title,
        facultyName: facultyMap[String(t.createdBy)] || t.createdByName || 'Faculty Coordinator',
        details: `${t.questions?.length || t.questionLimit || 20} Questions • Duration: ${t.duration || 20} mins`,
        date: t.createdAt,
        status: 'Published'
      });
    });

    labs.forEach(l => {
      activities.push({
        id: l._id,
        type: 'lab_task',
        category: 'Laboratory Programming',
        title: l.title,
        facultyName: facultyMap[String(l.createdBy)] || 'Faculty Coordinator',
        details: `Max Score: ${l.maxScore || 100} • Target: ${l.branch || branch} Sec ${l.section || 'All'}`,
        date: l.createdAt,
        status: 'Active'
      });
    });

    doubts.forEach(d => {
      activities.push({
        id: d._id,
        type: 'doubt_answered',
        category: 'Student Doubt Resolution',
        title: d.subject || 'Student Query',
        facultyName: d.answeredBy || 'Faculty Coordinator',
        details: d.description?.slice(0, 80) + '...',
        date: d.answeredAt || d.createdAt,
        status: 'Resolved'
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 3. STUDENT RECORDS (BRANCH SPECIFIC)
// =========================================================================
exports.getDepartmentStudents = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    const {
      search,
      academicYear,
      section,
      minCgpa,
      maxCgpa,
      placementStatus
    } = req.query;

    const query = {
      role: 'student',
      branch: { $in: branchPatterns }
    };

    if (academicYear && academicYear !== 'ALL') {
      query.$or = [
        { academicYear: new RegExp(academicYear, 'i') },
        { year: new RegExp(academicYear, 'i') }
      ];
    }

    if (section && section !== 'ALL') {
      query.section = new RegExp(`^(?:Section\\s*)?${section}$`, 'i');
    }

    let students = await User.find(query)
      .select('name email phone mobileNumber rollNumber branch section academicYear year bio skills targetRole readinessScore leetcodeStats codeforcesStats codechefStats hackerrankStats sgpaSem1 sgpaSem2 sgpaSem3 sgpaSem4 sgpaSem5 sgpaSem6 sgpaSem7 sgpaSem8 createdAt')
      .lean();

    // Map student applications from Placement Drives
    const allDrives = await PlacementDrive.find({}).select('companyName title role packageDetails applications').lean();
    const driveAppsMap = {};

    allDrives.forEach(drive => {
      (drive.applications || []).forEach(app => {
        const sid = String(app.student);
        if (!driveAppsMap[sid]) driveAppsMap[sid] = [];
        driveAppsMap[sid].push({
          driveId: drive._id,
          companyName: drive.companyName,
          role: drive.role,
          stage: app.currentStage,
          packageDetails: drive.packageDetails,
          offerDetails: app.offerDetails
        });
      });
    });

    // Resumes
    const studentIds = students.map(s => s._id);
    const resumes = await Resume.find({ user: { $in: studentIds } }).sort({ createdAt: -1 }).lean();
    const resumeMap = {};
    resumes.forEach(r => {
      if (!resumeMap[String(r.user)]) {
        resumeMap[String(r.user)] = r.filePath;
      }
    });

    let formatted = students.map(st => {
      const cgpa = computeCgpa(st);
      const apps = driveAppsMap[String(st._id)] || [];
      const selectedApps = apps.filter(a => a.stage === 'selected');
      const offeredApps = apps.filter(a => a.stage === 'offered' || a.offerDetails?.offeredPackage);

      let placementTag = 'Eligible';
      if (offeredApps.length > 0) placementTag = 'Placed';
      else if (selectedApps.length > 0) placementTag = 'Selected';
      else if (apps.length > 0) placementTag = 'In Process';

      return {
        _id: st._id,
        name: st.name,
        email: st.email,
        phone: st.mobileNumber || st.phone || '',
        mobileNumber: st.mobileNumber || st.phone || '',
        rollNumber: st.rollNumber || 'N/A',
        branch: st.branch || branch,
        section: st.section || 'A',
        academicYear: st.academicYear || st.year || '4th Year',
        year: st.year || st.academicYear || '2026',
        cgpa,
        sgpaSem1: st.sgpaSem1 || 0,
        sgpaSem2: st.sgpaSem2 || 0,
        sgpaSem3: st.sgpaSem3 || 0,
        sgpaSem4: st.sgpaSem4 || 0,
        sgpaSem5: st.sgpaSem5 || 0,
        sgpaSem6: st.sgpaSem6 || 0,
        sgpaSem7: st.sgpaSem7 || 0,
        sgpaSem8: st.sgpaSem8 || 0,
        readinessScore: st.readinessScore || 0,
        leetcodeSolved: st.leetcodeStats?.totalSolved || 0,
        codeforcesRating: st.codeforcesStats?.rating || 0,
        hackerrankSolved: st.hackerrankStats?.solvedCount || 0,
        resumeUrl: resumeMap[String(st._id)] || '',
        placementTag,
        appliedDrivesCount: apps.length,
        selectedCount: selectedApps.length,
        offersCount: offeredApps.length,
        offers: offeredApps.map(o => `${o.companyName} (${o.offerDetails?.offeredPackage || o.packageDetails})`),
        skills: st.skills || []
      };
    });

    // Search filter
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      formatted = formatted.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(q)
      );
    }

    // Min CGPA filter
    if (minCgpa) {
      formatted = formatted.filter(s => s.cgpa >= Number(minCgpa));
    }

    // Placement status filter
    if (placementStatus && placementStatus !== 'ALL') {
      formatted = formatted.filter(s => s.placementTag.toLowerCase() === placementStatus.toLowerCase());
    }

    // Sort: highest CGPA first
    formatted.sort((a, b) => b.cgpa - a.cgpa);

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

// Update Student Record (by HOD)
exports.updateStudentRecord = async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    const {
      rollNumber,
      section,
      academicYear,
      year,
      mobileNumber,
      phone,
      sgpaSem1,
      sgpaSem2,
      sgpaSem3,
      sgpaSem4,
      sgpaSem5,
      sgpaSem6,
      sgpaSem7,
      sgpaSem8
    } = req.body;

    if (rollNumber !== undefined) student.rollNumber = rollNumber.trim();
    if (section !== undefined) student.section = section.trim();
    if (academicYear !== undefined) student.academicYear = academicYear.trim();
    if (year !== undefined) student.year = year.trim();
    if (mobileNumber !== undefined || phone !== undefined) {
      const num = (mobileNumber || phone || '').trim();
      student.mobileNumber = num;
      student.phone = num;
    }

    if (sgpaSem1 !== undefined) student.sgpaSem1 = Number(sgpaSem1);
    if (sgpaSem2 !== undefined) student.sgpaSem2 = Number(sgpaSem2);
    if (sgpaSem3 !== undefined) student.sgpaSem3 = Number(sgpaSem3);
    if (sgpaSem4 !== undefined) student.sgpaSem4 = Number(sgpaSem4);
    if (sgpaSem5 !== undefined) student.sgpaSem5 = Number(sgpaSem5);
    if (sgpaSem6 !== undefined) student.sgpaSem6 = Number(sgpaSem6);
    if (sgpaSem7 !== undefined) student.sgpaSem7 = Number(sgpaSem7);
    if (sgpaSem8 !== undefined) student.sgpaSem8 = Number(sgpaSem8);

    await student.save();

    res.status(200).json({
      success: true,
      message: `Student ${student.name} (${student.rollNumber}) record updated successfully.`,
      data: student
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 4. BROADCAST ANNOUNCEMENTS & ALERTS (WHATSAPP / IN-APP / EMAIL)
// =========================================================================
exports.broadcastDepartmentMessage = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const {
      targetGroup = 'students', // 'students' | 'faculty' | 'both'
      title = 'Department Notice',
      message,
      academicYear = 'ALL',
      sendWhatsApp = true,
      specificPhone = '8074701052'
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter message content to broadcast.' });
    }

    const branchPatterns = getBranchPatterns(branch);
    let recipients = [];

    if (targetGroup === 'students' || targetGroup === 'both') {
      const studentQuery = { role: 'student', branch: { $in: branchPatterns } };
      if (academicYear && academicYear !== 'ALL') {
        studentQuery.$or = [
          { academicYear: new RegExp(academicYear, 'i') },
          { year: new RegExp(academicYear, 'i') }
        ];
      }
      const branchStudents = await User.find(studentQuery).select('name email phone mobileNumber');
      recipients.push(...branchStudents);
    }

    if (targetGroup === 'faculty' || targetGroup === 'both') {
      const branchFaculties = await User.find({
        role: 'faculty',
        $or: [
          { branch: { $in: branchPatterns } },
          { 'managedScopes.branch': { $in: branchPatterns } }
        ]
      }).select('name email phone mobileNumber');
      recipients.push(...branchFaculties);
    }

    // 1. Send dedicated WhatsApp message to specified phone 8074701052
    if (sendWhatsApp) {
      const waAnnouncement =
`📢 *GRIET DEPARTMENT OF ${branch.toUpperCase()} - OFFICIAL NOTICE*
--------------------------------------------------
*From:* Dr. Baimuthakala Ajay Kumar (HOD - ${branch})
*Subject:* ${title}

${message.trim()}

--------------------------------------------------
👉 Log in to portal: https://placement-guide-nu.vercel.app/login`;

      await sendWhatsAppMessage({
        to: specificPhone,
        message: waAnnouncement,
        studentName: 'Coordinator / HOD Broadcast',
        driveTitle: `${branch} Department Notice`
      }).catch(() => {});

      // Also send WhatsApp to any recipient with registered mobileNumber
      for (const rec of recipients) {
        const ph = rec.mobileNumber || rec.phone;
        if (ph && ph !== specificPhone) {
          sendWhatsAppMessage({
            to: ph,
            message: waAnnouncement,
            studentName: rec.name,
            driveTitle: `${branch} Notice`
          }).catch(() => {});
        }
      }
    }

    // 2. In-app notifications
    for (const rec of recipients) {
      Notification.create({
        user: rec._id,
        type: 'general',
        message: `📢 [HOD ${branch}] ${title}: ${message.slice(0, 100)}...`,
        metadata: { title, sender: 'HOD Office' }
      }).catch(() => {});

      if (rec.email) {
        sendEmail({
          to: rec.email,
          subject: `📢 [HOD ${branch} Office] ${title}`,
          text: `Dear ${rec.name},\n\n${message}\n\n- Dr. Baimuthakala Ajay Kumar\nHead of Department (${branch})`,
          html: `<div style="font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <h2 style="color: #6366f1;">Department of ${branch} - Notice</h2>
            <p><strong>Subject:</strong> ${title}</p>
            <p style="background: #1e293b; padding: 16px; border-radius: 6px; line-height: 1.6;">${message.replace(/\n/g, '<br/>')}</p>
            <p style="color: #94a3b8; font-size: 13px;">Sent by Dr. Baimuthakala Ajay Kumar (HOD - ${branch}), Gokaraju Rangaraju Institute of Engineering & Technology.</p>
          </div>`
        }).catch(() => {});
      }
    }

    res.status(200).json({
      success: true,
      message: `Announcement dispatched to ${recipients.length} recipients across Email, In-App Notifications, and WhatsApp.`
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 5. ACCREDITATION & DEPARTMENTAL EXPORT (NBA / NAAC CRITERIA)
// =========================================================================
exports.exportDepartmentReport = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    const students = await User.find({
      role: 'student',
      branch: { $in: branchPatterns }
    }).sort({ rollNumber: 1 }).lean();

    const allDrives = await PlacementDrive.find({}).lean();
    const offersMap = {};

    allDrives.forEach(d => {
      (d.applications || []).forEach(app => {
        if (app.currentStage === 'selected' || app.currentStage === 'offered' || app.offerDetails?.offeredPackage) {
          const sid = String(app.student);
          if (!offersMap[sid]) offersMap[sid] = [];
          offersMap[sid].push({
            company: d.companyName,
            package: app.offerDetails?.offeredPackage || d.packageDetails,
            role: d.role
          });
        }
      });
    });

    const reportData = students.map((s, idx) => {
      const cgpa = computeCgpa(s);
      const studentOffers = offersMap[String(s._id)] || [];
      const placed = studentOffers.length > 0 ? 'Placed' : 'Not Placed';
      const offerCompanies = studentOffers.map(o => `${o.company} (${o.package})`).join('; ') || 'N/A';

      return {
        sNo: idx + 1,
        rollNumber: s.rollNumber || 'N/A',
        name: s.name,
        branch: s.branch || branch,
        section: s.section || 'A',
        year: s.year || s.academicYear || '2026',
        mobileNumber: s.mobileNumber || s.phone || 'N/A',
        email: s.email,
        cgpa,
        placementReadinessIndex: s.readinessScore || 0,
        placedStatus: placed,
        offers: offerCompanies
      };
    });

    res.status(200).json({
      success: true,
      count: reportData.length,
      department: branch,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 7. ACADEMIC SUBJECTS MANAGEMENT & ASSIGNMENT TO HOD / FACULTY
// =========================================================================
exports.getDepartmentSubjects = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    const subjects = await Subject.find({
      $or: [
        { branch: { $in: branchPatterns } },
        { branch: { $in: ['', null, 'All', 'all'] } }
      ],
      isActive: true
    }).sort({ academicYear: -1, name: 1 }).lean();

    // Populate assigned teachers (from User.managedScopes)
    const allStaff = await User.find({
      role: { $in: ['faculty', 'hod'] }
    }).select('name email role branch targetRole managedScopes').lean();

    const formatted = subjects.map(subj => {
      const assignedTeachers = [];
      allStaff.forEach(staff => {
        const hasScope = (staff.managedScopes || []).some(s =>
          (s.subject && String(s.subject) === String(subj._id)) ||
          ((!s.academicYear || s.academicYear.toLowerCase() === 'all' || s.academicYear === subj.academicYear) &&
           (!s.branch || s.branch.toLowerCase() === 'all' || branchPatterns.some(bp => bp.test(s.branch))) &&
           (!s.section || s.section.toLowerCase() === 'all' || s.section === subj.section))
        );
        if (hasScope) {
          assignedTeachers.push({
            id: staff._id,
            name: staff.name,
            role: staff.role,
            designation: staff.targetRole || (staff.role === 'hod' ? 'Head of Department' : 'Faculty'),
            email: staff.email
          });
        }
      });

      return {
        _id: subj._id,
        name: subj.name,
        code: subj.code,
        description: subj.description || '',
        academicYear: subj.academicYear,
        branch: subj.branch || branch,
        section: subj.section || 'All',
        notesCount: (subj.notes || []).length,
        assignedTeachers,
        createdAt: subj.createdAt
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

exports.createDepartmentSubject = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const { name, code, description, academicYear, section = 'All', assignedTo } = req.body;

    if (!name || !code || !academicYear) {
      return res.status(400).json({ success: false, error: 'Subject name, code, and academic year are required.' });
    }

    const existing = await Subject.findOne({
      code: code.trim().toUpperCase(),
      academicYear: academicYear.trim(),
      branch: new RegExp(`^${branch}$`, 'i'),
      section: section.trim()
    });

    if (existing) {
      return res.status(409).json({ success: false, error: `Subject code "${code}" already exists for ${academicYear} section ${section}.` });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description ? description.trim() : '',
      academicYear: academicYear.trim(),
      branch: branch.trim(),
      section: section.trim(),
      createdBy: req.user.id
    });

    // If assignedTo is specified (e.g. HOD themselves or Faculty ID)
    if (assignedTo) {
      const targetUser = await User.findById(assignedTo);
      if (targetUser) {
        targetUser.managedScopes = targetUser.managedScopes || [];
        targetUser.managedScopes.push({
          academicYear: academicYear.trim(),
          branch: branch.trim(),
          section: section.trim(),
          subject: subject._id
        });
        await targetUser.save({ validateBeforeSave: false });
      }
    }

    res.status(201).json({
      success: true,
      message: `Subject "${subject.name}" (${subject.code}) created successfully.`,
      data: subject
    });
  } catch (err) {
    next(err);
  }
};

exports.assignSubjectTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, action = 'assign' } = req.body; // userId can be HOD's own ID or Faculty ID

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Faculty / HOD user not found.' });
    }

    targetUser.managedScopes = targetUser.managedScopes || [];

    if (action === 'assign') {
      const alreadyHas = targetUser.managedScopes.some(s =>
        s.subject && String(s.subject) === String(subject._id)
      );
      if (!alreadyHas) {
        targetUser.managedScopes.push({
          academicYear: subject.academicYear,
          branch: subject.branch || req.user.branch || 'IT',
          section: subject.section || 'All',
          subject: subject._id
        });
        await targetUser.save({ validateBeforeSave: false });
      }
      return res.status(200).json({
        success: true,
        message: `Assigned "${subject.name}" to ${targetUser.name} (${targetUser.role.toUpperCase()}) successfully.`
      });
    } else {
      // Unassign
      targetUser.managedScopes = targetUser.managedScopes.filter(s =>
        !s.subject || String(s.subject) !== String(subject._id)
      );
      await targetUser.save({ validateBeforeSave: false });
      return res.status(200).json({
        success: true,
        message: `Unassigned "${subject.name}" from ${targetUser.name} successfully.`
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.deleteDepartmentSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found.' });
    }
    await Subject.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: `Subject "${subject.name}" (${subject.code}) deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 8. STUDENTS PROJECTS & GRADING
// =========================================================================
exports.getDepartmentProjects = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    const projects = await Project.find({
      $or: [
        { branch: { $in: branchPatterns } },
        { branch: { $in: ['', null, 'All', 'all'] } }
      ]
    })
      .populate('student', 'name email rollNumber phone mobileNumber branch section academicYear year')
      .populate('reviewedBy', 'name email role')
      .sort({ updatedAt: -1 })
      .lean();

    // Filter projects where student belongs to IT branch if project branch wasn't set
    const filtered = projects.filter(p => {
      if (p.branch && branchPatterns.some(bp => bp.test(p.branch))) return true;
      if (p.student?.branch && branchPatterns.some(bp => bp.test(p.student.branch))) return true;
      return false;
    });

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (err) {
    next(err);
  }
};

exports.gradeStudentProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      grade,
      leadStudentGrade,
      feedback,
      codeSuggestions,
      techSuggestions,
      status = 'approved',
      teamMembers
    } = req.body;

    const project = await Project.findById(id).populate('student', 'name email');
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (grade !== undefined && grade !== null && grade !== '') {
      project.grade = Number(grade);
    }
    if (leadStudentGrade !== undefined && leadStudentGrade !== null && leadStudentGrade !== '') {
      project.leadStudentGrade = Number(leadStudentGrade);
    }
    if (feedback !== undefined) project.feedback = feedback.trim();
    if (codeSuggestions !== undefined) project.codeSuggestions = codeSuggestions.trim();
    if (techSuggestions !== undefined) project.techSuggestions = techSuggestions.trim();
    if (status) project.status = status;

    // Update individual team member grades if provided
    if (Array.isArray(teamMembers) && teamMembers.length > 0) {
      teamMembers.forEach(tm => {
        const existing = (tm._id && project.teamMembers.id(tm._id)) ||
          project.teamMembers.find(m => (m.email && m.email === tm.email) || (m.name && m.name === tm.name));
        if (existing) {
          if (tm.grade !== undefined && tm.grade !== null && tm.grade !== '') {
            existing.grade = Number(tm.grade);
          }
          if (tm.feedback !== undefined) {
            existing.feedback = tm.feedback;
          }
        }
      });
    }

    // Append faculty suggestion entry for permanent audit trail
    if (codeSuggestions || feedback || techSuggestions) {
      project.facultySuggestions.push({
        faculty: req.user.id,
        facultyName: req.user.name || 'Head of Department',
        facultyRole: 'hod',
        codeSuggestion: codeSuggestions || '',
        techSuggestion: techSuggestions || '',
        generalFeedback: feedback || '',
        suggestedAt: new Date()
      });
    }

    project.reviewedBy = req.user.id;
    project.reviewedAt = new Date();

    await project.save();

    // Notify student
    if (project.student?._id) {
      await Notification.create({
        recipient: project.student._id,
        sender: req.user.id,
        type: 'PROJECT_EVALUATED',
        title: 'Project Evaluated by HOD',
        message: `Your project "${project.title}" has been reviewed by ${req.user.name || 'Head of Department'}. Status: ${status.toUpperCase()}, Grade: ${project.grade !== null && project.grade !== undefined ? project.grade : 'N/A'}/100.`,
        actionLink: '/project-studio'
      });
    }

    res.status(200).json({
      success: true,
      message: `Project "${project.title}" graded and evaluated successfully.`,
      data: project
    });
  } catch (err) {
    next(err);
  }
};

// =========================================================================
// 9. LAB TASKS & PRACTICE MANAGEMENT
// =========================================================================
exports.getDepartmentLabTasks = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const branchPatterns = getBranchPatterns(branch);

    const tasks = await LabTask.find({
      $or: [
        { branch: { $in: branchPatterns } },
        { branch: { $in: ['', null, 'All', 'all'] } }
      ],
      isActive: true
    })
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Get submission counts for each task
    const taskIds = tasks.map(t => t._id);
    const attempts = await LabPracticeAttempt.aggregate([
      { $match: { labTask: { $in: taskIds } } },
      { $group: { _id: '$labTask', count: { $sum: 1 }, passedCount: { $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] } } } }
    ]);

    const statsMap = {};
    attempts.forEach(a => { statsMap[String(a._id)] = a; });

    const formatted = tasks.map(t => ({
      ...t,
      submissionsCount: statsMap[String(t._id)]?.count || 0,
      passedSubmissions: statsMap[String(t._id)]?.passedCount || 0
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
};

exports.createDepartmentLabTask = async (req, res, next) => {
  try {
    const branch = req.user.branch || 'IT';
    const {
      title,
      description,
      language = 'python',
      academicYear = '4th Year',
      section = 'All',
      difficulty = 'medium',
      starterCode = '',
      testCases = [],
      points = 10,
      dueDate
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'Task title and description are required.' });
    }

    const task = await LabTask.create({
      title: title.trim(),
      description: description.trim(),
      language,
      academicYear,
      branch,
      section,
      difficulty,
      starterCode,
      testCases: Array.isArray(testCases) ? testCases : [],
      points: Number(points) || 10,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: `Lab task "${task.title}" created successfully for ${branch} branch.`,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

exports.getLabTaskSubmissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await LabTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Lab task not found.' });
    }

    const submissions = await LabPracticeAttempt.find({ labTask: id })
      .populate('student', 'name email rollNumber phone mobileNumber branch section')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      task: {
        _id: task._id,
        title: task.title,
        language: task.language,
        points: task.points
      },
      count: submissions.length,
      data: submissions
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteDepartmentLabTask = async (req, res, next) => {
  try {
    const task = await LabTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Lab task not found.' });
    }
    await LabTask.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: `Lab task "${task.title}" deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};
