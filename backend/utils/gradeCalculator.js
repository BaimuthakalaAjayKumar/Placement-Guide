/**
 * Grade & CGPA Calculation Utilities
 * Standard 10-Point UGC / JNTUH Autonomous Academic Grading Scale
 */

/**
 * Determine grade, grade point and passed status from raw marks (0 - 100)
 */
function calculateSubjectGrade(rawMarks) {
  const marks = Math.min(100, Math.max(0, Math.round(Number(rawMarks) || 0)));

  if (marks >= 90) {
    return { grade: 'O', gradePoint: 10, passed: true, description: 'Outstanding' };
  } else if (marks >= 80) {
    return { grade: 'A+', gradePoint: 9, passed: true, description: 'Excellent' };
  } else if (marks >= 70) {
    return { grade: 'A', gradePoint: 8, passed: true, description: 'Very Good' };
  } else if (marks >= 60) {
    return { grade: 'B+', gradePoint: 7, passed: true, description: 'Good' };
  } else if (marks >= 50) {
    return { grade: 'B', gradePoint: 6, passed: true, description: 'Above Average' };
  } else if (marks >= 40) {
    return { grade: 'C', gradePoint: 5, passed: true, description: 'Pass' };
  } else {
    return { grade: 'F', gradePoint: 0, passed: false, description: 'Fail / Arrear' };
  }
}

/**
 * Calculate Semester SGPA and total credits from an array of subjects
 * SGPA = Sum(Credits * GradePoint) / Sum(Credits)
 */
function calculateSemesterSgpa(subjects = []) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return { sgpa: 0, totalCredits: 0, passedCredits: 0, totalPoints: 0, arrears: 0 };
  }

  let totalCredits = 0;
  let passedCredits = 0;
  let totalPoints = 0;
  let arrears = 0;

  subjects.forEach(sub => {
    const credits = Number(sub.credits) || 3;
    const { grade, gradePoint, passed } = calculateSubjectGrade(sub.marks);
    
    totalCredits += credits;
    totalPoints += (credits * gradePoint);
    
    if (passed) {
      passedCredits += credits;
    } else {
      arrears += 1;
    }
  });

  const sgpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;

  return {
    sgpa,
    totalCredits,
    passedCredits,
    totalPoints,
    arrears
  };
}

/**
 * Calculate Overall CGPA across all completed semesters
 * CGPA = Sum(Semester SGPA * Semester Credits) / Sum(Semester Credits)
 * Or simple average if credits are uniform
 */
function calculateOverallCgpa(semesters = []) {
  if (!Array.isArray(semesters) || semesters.length === 0) {
    return { cgpa: 0, totalCreditsEarned: 0, totalArrears: 0 };
  }

  let totalCreditPoints = 0;
  let totalCreditsEarned = 0;
  let totalArrears = 0;

  let activeSemsCount = 0;
  let sumSgpa = 0;

  semesters.forEach(sem => {
    const semSgpa = Number(sem.sgpa) || 0;
    const semCredits = Number(sem.totalCredits) || 0;

    if (semSgpa > 0 || (sem.subjects && sem.subjects.length > 0)) {
      activeSemsCount += 1;
      sumSgpa += semSgpa;

      if (semCredits > 0) {
        totalCreditPoints += (semSgpa * semCredits);
        totalCreditsEarned += semCredits;
      }
    }

    if (Array.isArray(sem.subjects)) {
      sem.subjects.forEach(sub => {
        if (sub.grade === 'F' || sub.marks < 40) {
          totalArrears += 1;
        }
      });
    }
  });

  let cgpa = 0;
  if (totalCreditsEarned > 0) {
    cgpa = Number((totalCreditPoints / totalCreditsEarned).toFixed(2));
  } else if (activeSemsCount > 0) {
    cgpa = Number((sumSgpa / activeSemsCount).toFixed(2));
  }

  return {
    cgpa,
    totalCreditsEarned,
    totalArrears,
    completedSemesters: activeSemsCount
  };
}

/**
 * Default Curricula for Engineering Branches (Sem 1 to 8)
 */
const DEFAULT_CURRICULUM = {
  CSE: {
    1: [
      { subjectName: 'Linear Algebra & Calculus', subjectCode: 'MA101', credits: 4, marks: 0 },
      { subjectName: 'Engineering Physics', subjectCode: 'PH102', credits: 4, marks: 0 },
      { subjectName: 'Programming for Problem Solving (C)', subjectCode: 'CS103', credits: 3, marks: 0 },
      { subjectName: 'Basic Electrical Engineering', subjectCode: 'EE104', credits: 3, marks: 0 },
      { subjectName: 'Engineering Workshop Lab', subjectCode: 'ME105', credits: 2, marks: 0 },
      { subjectName: 'Programming in C Lab', subjectCode: 'CS106', credits: 1.5, marks: 0 }
    ],
    2: [
      { subjectName: 'Differential Equations & Vector Calculus', subjectCode: 'MA201', credits: 4, marks: 0 },
      { subjectName: 'Engineering Chemistry', subjectCode: 'CH202', credits: 4, marks: 0 },
      { subjectName: 'Data Structures in C++', subjectCode: 'CS203', credits: 3, marks: 0 },
      { subjectName: 'English Communication Skills', subjectCode: 'EN204', credits: 2, marks: 0 },
      { subjectName: 'Data Structures Lab', subjectCode: 'CS205', credits: 1.5, marks: 0 },
      { subjectName: 'Engineering Chemistry Lab', subjectCode: 'CH206', credits: 1.5, marks: 0 }
    ],
    3: [
      { subjectName: 'Discrete Mathematics', subjectCode: 'CS301', credits: 3, marks: 0 },
      { subjectName: 'Data Structures & Algorithms', subjectCode: 'CS302', credits: 4, marks: 0 },
      { subjectName: 'Digital Logic & Computer Organization', subjectCode: 'CS303', credits: 3, marks: 0 },
      { subjectName: 'Object Oriented Programming through Java', subjectCode: 'CS304', credits: 3, marks: 0 },
      { subjectName: 'Java Programming Lab', subjectCode: 'CS305', credits: 1.5, marks: 0 },
      { subjectName: 'Advanced DSA Lab', subjectCode: 'CS306', credits: 1.5, marks: 0 }
    ],
    4: [
      { subjectName: 'Design & Analysis of Algorithms', subjectCode: 'CS401', credits: 3, marks: 0 },
      { subjectName: 'Database Management Systems', subjectCode: 'CS402', credits: 4, marks: 0 },
      { subjectName: 'Operating Systems', subjectCode: 'CS403', credits: 3, marks: 0 },
      { subjectName: 'Formal Languages & Automata Theory', subjectCode: 'CS404', credits: 3, marks: 0 },
      { subjectName: 'DBMS Lab with SQL', subjectCode: 'CS405', credits: 1.5, marks: 0 },
      { subjectName: 'Operating Systems Lab', subjectCode: 'CS406', credits: 1.5, marks: 0 }
    ],
    5: [
      { subjectName: 'Computer Networks', subjectCode: 'CS501', credits: 3, marks: 0 },
      { subjectName: 'Software Engineering & Agile', subjectCode: 'CS502', credits: 3, marks: 0 },
      { subjectName: 'Web Technologies & Full-Stack', subjectCode: 'CS503', credits: 4, marks: 0 },
      { subjectName: 'Artificial Intelligence & Machine Learning', subjectCode: 'CS504', credits: 3, marks: 0 },
      { subjectName: 'Web Technologies Lab', subjectCode: 'CS505', credits: 1.5, marks: 0 },
      { subjectName: 'Computer Networks Lab', subjectCode: 'CS506', credits: 1.5, marks: 0 }
    ],
    6: [
      { subjectName: 'Compiler Design', subjectCode: 'CS601', credits: 3, marks: 0 },
      { subjectName: 'Cloud Computing & DevOps', subjectCode: 'CS602', credits: 3, marks: 0 },
      { subjectName: 'Information & Cyber Security', subjectCode: 'CS603', credits: 3, marks: 0 },
      { subjectName: 'Professional Elective - I', subjectCode: 'PE601', credits: 3, marks: 0 },
      { subjectName: 'Cloud & DevOps Lab', subjectCode: 'CS604', credits: 1.5, marks: 0 },
      { subjectName: 'Industry Mini-Project with Seminar', subjectCode: 'CS605', credits: 2, marks: 0 }
    ],
    7: [
      { subjectName: 'Big Data Analytics', subjectCode: 'CS701', credits: 3, marks: 0 },
      { subjectName: 'Mobile Application Development', subjectCode: 'CS702', credits: 3, marks: 0 },
      { subjectName: 'Professional Elective - II', subjectCode: 'PE702', credits: 3, marks: 0 },
      { subjectName: 'Open Elective - I', subjectCode: 'OE701', credits: 3, marks: 0 },
      { subjectName: 'Major Project Phase - I', subjectCode: 'CS703', credits: 3, marks: 0 }
    ],
    8: [
      { subjectName: 'Professional Elective - III', subjectCode: 'PE803', credits: 3, marks: 0 },
      { subjectName: 'Open Elective - II', subjectCode: 'OE802', credits: 3, marks: 0 },
      { subjectName: 'Technical Seminar & Professional Ethics', subjectCode: 'CS801', credits: 2, marks: 0 },
      { subjectName: 'Major Project Phase - II & Defense', subjectCode: 'CS802', credits: 6, marks: 0 }
    ]
  }
};

// Aliases for IT, AIML, DS, etc.
DEFAULT_CURRICULUM.IT = DEFAULT_CURRICULUM.CSE;
DEFAULT_CURRICULUM.AIML = DEFAULT_CURRICULUM.CSE;
DEFAULT_CURRICULUM.DS = DEFAULT_CURRICULUM.CSE;

module.exports = {
  calculateSubjectGrade,
  calculateSemesterSgpa,
  calculateOverallCgpa,
  DEFAULT_CURRICULUM
};
