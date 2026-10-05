const User = require('../models/User');
const AcademicRecord = require('../models/AcademicRecord');
const Notification = require('../models/Notification');
const {
  calculateSubjectGrade,
  calculateSemesterSgpa,
  calculateOverallCgpa,
  DEFAULT_CURRICULUM
} = require('../utils/gradeCalculator');

/**
 * Helper to ensure student has an AcademicRecord initialized
 */
async function getOrCreateAcademicRecord(studentId) {
  let record = await AcademicRecord.findOne({ student: studentId });
  const student = await User.findById(studentId);

  if (!student) {
    throw new Error('Student not found');
  }

  if (!record) {
    // Initialize 8 empty semesters
    const semesters = [];
    for (let sem = 1; sem <= 8; sem++) {
      const existingSgpa = Number(student[`sgpaSem${sem}`]) || 0;
      semesters.push({
        semester: sem,
        subjects: [],
        totalCredits: existingSgpa > 0 ? 20 : 0,
        sgpa: existingSgpa,
        isPublished: existingSgpa > 0,
        evaluatorName: existingSgpa > 0 ? 'Verified Academic Records' : '',
        updatedAt: new Date()
      });
    }

    const { cgpa, totalCreditsEarned } = calculateOverallCgpa(semesters);

    record = await AcademicRecord.create({
      student: student._id,
      studentRollNumber: student.rollNumber || '',
      studentName: student.name,
      branch: student.branch || '',
      section: student.section || '',
      academicYear: student.academicYear || student.year || '',
      semesters,
      overallCgpa: cgpa,
      totalCreditsEarned,
      totalArrears: 0
    });
  } else {
    // If student info updated, sync basic fields
    if (!record.studentRollNumber && student.rollNumber) {
      record.studentRollNumber = student.rollNumber;
    }
    if (!record.studentName && student.name) {
      record.studentName = student.name;
    }
    if (!record.branch && student.branch) {
      record.branch = student.branch;
    }
    if (!record.section && student.section) {
      record.section = student.section;
    }
  }

  return record;
}

// @desc    Get Academic Record of logged-in student
// @route   GET /api/academics/my-record
// @access  Private (Student)
exports.getMyAcademicRecord = async (req, res, next) => {
  try {
    const record = await getOrCreateAcademicRecord(req.user._id);

    // Sync latest user CGPA if needed
    const { cgpa, totalCreditsEarned, totalArrears } = calculateOverallCgpa(record.semesters);
    record.overallCgpa = cgpa;
    record.totalCreditsEarned = totalCreditsEarned;
    record.totalArrears = totalArrears;
    await record.save();

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Academic Record by student ID (Faculty, Admin, HOD)
// @route   GET /api/academics/student/:studentId
// @access  Private (Faculty, Admin, HOD, Student self)
exports.getStudentAcademicRecord = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Students can only view their own record
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view another student academic record'
      });
    }

    const record = await getOrCreateAcademicRecord(studentId);

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Faculty / Admin enters marks for a student semester
//          Automatically calculates: Subject Grade + Grade Point, Semester SGPA, Credits, and Overall CGPA!
// @route   POST /api/academics/save-marks
// @access  Private (Faculty, Admin, HOD)
exports.saveSemesterMarks = async (req, res, next) => {
  try {
    const { studentId, semester, subjects } = req.body;

    const semNum = Number(semester);
    if (!studentId || !semNum || semNum < 1 || semNum > 8) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid studentId and semester (1-8).'
      });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one subject with marks and credits.'
      });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        error: 'Student record not found.'
      });
    }

    const record = await getOrCreateAcademicRecord(studentId);

    // 1. Automatically calculate Subject Grade and Grade Point for each entered subject
    const evaluatedSubjects = subjects.map(sub => {
      const rawMarks = Number(sub.marks) || 0;
      const credits = Number(sub.credits) || 3;
      const { grade, gradePoint, passed } = calculateSubjectGrade(rawMarks);

      return {
        subjectName: (sub.subjectName || '').trim() || 'Core Subject',
        subjectCode: (sub.subjectCode || '').trim().toUpperCase(),
        credits,
        marks: rawMarks,
        grade,
        gradePoint,
        passed
      };
    });

    // 2. Automatically calculate Semester Credits & Semester SGPA
    const semCalc = calculateSemesterSgpa(evaluatedSubjects);

    // 3. Update or create the semester entry in record
    let semIdx = record.semesters.findIndex(s => s.semester === semNum);
    const updatedSemData = {
      semester: semNum,
      subjects: evaluatedSubjects,
      totalCredits: semCalc.totalCredits,
      sgpa: semCalc.sgpa,
      isPublished: true,
      evaluatedBy: req.user._id,
      evaluatorName: req.user.name || 'Faculty Evaluator',
      updatedAt: new Date()
    };

    if (semIdx !== -1) {
      record.semesters[semIdx] = updatedSemData;
    } else {
      record.semesters.push(updatedSemData);
      record.semesters.sort((a, b) => a.semester - b.semester);
    }

    // 4. Automatically calculate Overall CGPA across all completed semesters
    const overallCalc = calculateOverallCgpa(record.semesters);
    record.overallCgpa = overallCalc.cgpa;
    record.totalCreditsEarned = overallCalc.totalCreditsEarned;
    record.totalArrears = overallCalc.totalArrears;

    await record.save();

    // 5. Automatically sync to User model (User.sgpaSem... and User.cgpa)
    // No need for faculty to calculate or enter them separately!
    student[`sgpaSem${semNum}`] = semCalc.sgpa;
    student.cgpa = overallCalc.cgpa;
    await student.save();

    // 6. Notify student of updated marks and automatic CGPA calculation
    try {
      await Notification.create({
        user: student._id,
        title: `🎓 Academic Marks Updated: Semester ${semNum}`,
        message: `Your Semester ${semNum} marks have been evaluated. SGPA: ${semCalc.sgpa} | Overall CGPA: ${overallCalc.cgpa} (${overallCalc.totalCreditsEarned} Credits Earned).`,
        type: 'academic',
        metadata: {
          semester: semNum,
          sgpa: semCalc.sgpa,
          cgpa: overallCalc.cgpa,
          evaluator: req.user.name
        }
      });
    } catch (notifErr) {
      console.warn('Could not dispatch academic notification:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Semester ${semNum} marks evaluated successfully. SGPA: ${semCalc.sgpa}, Overall CGPA: ${overallCalc.cgpa}.`,
      data: {
        semester: semNum,
        semesterSgpa: semCalc.sgpa,
        semesterCredits: semCalc.totalCredits,
        overallCgpa: overallCalc.cgpa,
        totalCreditsEarned: overallCalc.totalCreditsEarned,
        totalArrears: overallCalc.totalArrears,
        subjects: evaluatedSubjects,
        academicRecord: record
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get default curriculum for branch & semester
// @route   GET /api/academics/curriculum/:branch/:semester
// @access  Private
exports.getCurriculum = async (req, res, next) => {
  try {
    const { branch, semester } = req.params;
    const cleanBranch = (branch || 'CSE').toUpperCase();
    const semNum = Number(semester) || 1;

    const branchTree = DEFAULT_CURRICULUM[cleanBranch] || DEFAULT_CURRICULUM.CSE;
    const subjects = branchTree[semNum] || DEFAULT_CURRICULUM.CSE[semNum] || [];

    res.status(200).json({
      success: true,
      branch: cleanBranch,
      semester: semNum,
      subjects
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get list of students for marks entry (Faculty scope)
// @route   GET /api/academics/students
// @access  Private (Faculty, Admin, HOD)
exports.getFacultyStudents = async (req, res, next) => {
  try {
    const query = { role: 'student' };

    // If faculty, filter by faculty branch/section if assigned
    if (req.user.role === 'faculty') {
      if (req.user.branch) {
        query.branch = req.user.branch;
      }
      if (req.user.section) {
        query.section = req.user.section;
      }
    }

    const students = await User.find(query)
      .select('name email rollNumber branch section academicYear year sgpaSem1 sgpaSem2 sgpaSem3 sgpaSem4 sgpaSem5 sgpaSem6 sgpaSem7 sgpaSem8 cgpa')
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    // Attach academic record summary
    const studentIds = students.map(s => s._id);
    const records = await AcademicRecord.find({ student: { $in: studentIds } }).lean();
    const recordsMap = {};
    records.forEach(r => {
      recordsMap[r.student.toString()] = r;
    });

    const enriched = students.map(s => {
      const rec = recordsMap[s._id.toString()];
      const sems = [s.sgpaSem1, s.sgpaSem2, s.sgpaSem3, s.sgpaSem4, s.sgpaSem5, s.sgpaSem6, s.sgpaSem7, s.sgpaSem8].map(Number);
      const completed = sems.filter(v => v > 0);
      const computedCgpa = rec?.overallCgpa || (completed.length > 0 ? Number((completed.reduce((a, b) => a + b, 0) / completed.length).toFixed(2)) : 0);

      return {
        ...s,
        overallCgpa: computedCgpa,
        completedSemesters: rec ? rec.semesters.filter(x => x.sgpa > 0).length : completed.length,
        totalCreditsEarned: rec?.totalCreditsEarned || (completed.length * 20),
        totalArrears: rec?.totalArrears || 0
      };
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};
