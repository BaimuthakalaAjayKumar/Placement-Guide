const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AptitudeTest = require('../models/AptitudeTest');
const TestAttempt = require('../models/TestAttempt');
const PracticeQuestion = require('../models/PracticeQuestion');
const User = require('../models/User');
const UserSolution = require('../models/UserSolution');
const Notification = require('../models/Notification');

// Seed practice questions from frontend data files if database has none
const seedPracticeQuestions = async () => {
  try {
    const count = await PracticeQuestion.countDocuments();
    if (count > 0) {
      console.log('Practice questions database already seeded.');
      return;
    }

    console.log('Seeding practice questions from frontend data files...');

    const platforms = [
      { name: 'leetcode', file: 'leetcodeProblems.js' },
      { name: 'codeforces', file: 'codeforcesProblems.js' },
      { name: 'codechef', file: 'codechefProblems.js' },
      { name: 'hackerrank', file: 'hackerrankProblems.js' }
    ];

    for (const plat of platforms) {
      const filePath = path.join(__dirname, `../../frontend/src/data/${plat.file}`);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Replace ES module export with module.exports
        content = content.replace(/export\s+const\s+\w+\s*=\s*/, 'module.exports = ');

        // Write to a temporary file
        const tempFilePath = path.join(__dirname, `temp_${plat.file}`);
        fs.writeFileSync(tempFilePath, content, 'utf8');

        // Dynamically load it
        const data = require(tempFilePath);

        // Clean up temporary file
        fs.unlinkSync(tempFilePath);

        const docs = data.map(item => ({
          platform: plat.name,
          id: item.id,
          title: item.title,
          difficulty: item.difficulty || 'Medium',
          acceptance: item.acceptance || '50%',
          slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          solution: item.solution || '',
          tags: item.tags || []
        }));

        await PracticeQuestion.insertMany(docs);
        console.log(`Successfully seeded ${docs.length} practice questions for ${plat.name}`);
      } else {
        console.warn(`Source practice file not found: ${filePath}`);
      }
    }
  } catch (err) {
    console.error('Error seeding practice questions:', err.message);
  }
};

// Seed default tests if database has none
const seedDefaultTests = async () => {
  try {
    // Force duration of all existing tests to 20 minutes
    await AptitudeTest.updateMany({}, { duration: 20 });

    // Ensure all tests have string defaults for scoping fields
    await AptitudeTest.updateMany(
      { $or: [{ academicYear: { $exists: false } }, { academicYear: null }] },
      { $set: { academicYear: '' } }
    );
    await AptitudeTest.updateMany(
      { $or: [{ branch: { $exists: false } }, { branch: null }] },
      { $set: { branch: '' } }
    );
    await AptitudeTest.updateMany(
      { $or: [{ section: { $exists: false } }, { section: null }] },
      { $set: { section: '' } }
    );

    const count = await AptitudeTest.countDocuments();
    if (count < 8) {
      console.log('Clearing old tests to seed comprehensive aptitude and core subject tests...');
      await AptitudeTest.deleteMany({});
      await TestAttempt.deleteMany({});

      const defaultTests = require('../config/testSeeds');
      const coreTests = require('../config/coreSubjectSeeds');

      const allTests = [...defaultTests, ...coreTests];
      allTests.forEach(t => {
        t.duration = 20;
        t.academicYear = t.academicYear || '';
        t.branch = t.branch || '';
        t.section = t.section || '';
      });
      await AptitudeTest.create(allTests);
      console.log('All 8 comprehensive aptitude and core subject tests seeded successfully!');
    }

    // Also seed practice questions
    await seedPracticeQuestions();
  } catch (err) {
    console.error(`Aptitude Seeding Error: ${err.message}`);
  }
};

// Call seeder on startup
seedDefaultTests();

// @desc    Get all tests
// @route   GET /api/tests
// @access  Private
exports.getTests = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'student') {
      const studentAcademicYear = req.user.academicYear || req.user.year;
      const studentBranch = req.user.branch;
      const studentSection = req.user.section;
      const scopeFilters = [];

      // Academic year filter: matches student's year or general tests (empty, null, All, or non-existent)
      if (studentAcademicYear) {
        scopeFilters.push({
          $or: [
            { academicYear: studentAcademicYear },
            { academicYear: { $in: ['', null, 'All', 'all'] } },
            { academicYear: { $exists: false } },
            { year: Number(studentAcademicYear) || -1 }
          ]
        });
      } else {
        scopeFilters.push({
          $or: [
            { academicYear: { $in: ['', null, 'All', 'all'] } },
            { academicYear: { $exists: false } }
          ]
        });
      }

      // Branch filter: matches student's branch or general tests (empty, null, All, or non-existent)
      if (studentBranch) {
        scopeFilters.push({
          $or: [
            { branch: new RegExp(`^${studentBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            { branch: { $in: ['', null, 'All', 'all'] } },
            { branch: { $exists: false } }
          ]
        });
      } else {
        scopeFilters.push({
          $or: [
            { branch: { $in: ['', null, 'All', 'all'] } },
            { branch: { $exists: false } }
          ]
        });
      }

      // Section filter: matches student's section or general tests (empty, null, All, or non-existent)
      if (studentSection) {
        scopeFilters.push({
          $or: [
            { section: new RegExp(`^(?:Section\\s*)?${studentSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            { section: { $in: ['', null, 'All', 'all'] } },
            { section: { $exists: false } }
          ]
        });
      } else {
        scopeFilters.push({
          $or: [
            { section: { $in: ['', null, 'All', 'all'] } },
            { section: { $exists: false } }
          ]
        });
      }

      if (scopeFilters.length) {
        query.$and = scopeFilters;
      }
    } else if (req.user.role === 'faculty') {
      // For faculty: show only practice tests kept by this faculty or linked to their managed academic subjects
      const Subject = require('../models/Subject');
      let facultySubjectIds = [];
      if (req.user.managedScopes && req.user.managedScopes.length > 0) {
        const directSubjectIds = req.user.managedScopes.map(s => s.subject).filter(Boolean);
        const scopeConditions = req.user.managedScopes.map(scope => {
          const sYear = (scope.academicYear || '').trim();
          const sBranch = (scope.branch || '').trim();
          const cond = {};
          if (sYear && sYear.toLowerCase() !== 'all') {
            cond.academicYear = new RegExp(sYear.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          }
          if (sBranch && sBranch.toLowerCase() !== 'all') {
            cond.branch = new RegExp(sBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          }
          return cond;
        });
        const validConditions = scopeConditions.filter(c => Object.keys(c).length > 0);
        let matchedSubjects = [];
        if (validConditions.length > 0) {
          matchedSubjects = await Subject.find({ $or: validConditions }).distinct('_id');
        }
        facultySubjectIds = [...new Set([...directSubjectIds.map(String), ...matchedSubjects.map(String)])];
      }

      query.$or = [
        { createdBy: req.user.id },
        { createdBy: req.user._id },
        { subject: { $in: facultySubjectIds } }
      ];
    }

    if (req.query.company) {
      query.company = req.query.company;
    }
    const tests = await AptitudeTest.find(query)
      .select('-questions')
      .populate('subject', 'name code academicYear branch section')
      .populate('createdBy', 'name email role');

    // Enrich with question count and completion status
    const enrichedTests = await Promise.all(
      tests.map(async test => {
        const fullTest = await AptitudeTest.findById(test._id);
        const attempt = await TestAttempt.findOne({ user: req.user.id, test: test._id });
        return {
          _id: test._id,
          title: test.title,
          description: test.description,
          category: test.category,
          difficulty: test.difficulty || 'medium',
          duration: test.duration,
          questionCount: Math.min(test.questionLimit || 20, fullTest?.questions?.length || 0),
          questionLimit: test.questionLimit || 20,
          academicYear: test.academicYear,
          branch: test.branch,
          section: test.section,
          subject: test.subject,
          createdBy: test.createdBy ? {
            _id: test.createdBy._id,
            name: test.createdBy.name,
            email: test.createdBy.email,
            role: test.createdBy.role
          } : null,
          createdAt: test.createdAt,
          completed: !!attempt,
          score: attempt ? attempt.score : null
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedTests.length,
      data: enrichedTests
    });
  } catch (err) {
    next(err);
  }
};

// Helper to shuffle array in-place
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// @desc    Get a single test with questions
// @route   GET /api/tests/:id
// @access  Private
exports.getTestById = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    if (req.user.role === 'student') {
      const studentAcademicYear = (req.user.academicYear || req.user.year || '').toString().toLowerCase();
      const testAcademicYear = (test.academicYear || String(test.year || '')).toLowerCase();
      const isUnscopedYear = !test.academicYear || test.academicYear.toLowerCase() === 'all' || testAcademicYear === 'all years';
      const isYearAllowed = isUnscopedYear || (studentAcademicYear && (
        testAcademicYear === studentAcademicYear ||
        studentAcademicYear.includes(testAcademicYear) ||
        testAcademicYear.includes(studentAcademicYear)
      ));

      const userBranch = (req.user.branch || '').toLowerCase();
      const testBranch = (test.branch || '').toLowerCase();
      const branchAllowed = !test.branch || testBranch === 'all' || testBranch === 'all branches' || (
        userBranch && (
          testBranch === userBranch ||
          userBranch.includes(testBranch) ||
          testBranch.includes(userBranch)
        )
      );

      const userSection = (req.user.section || '').toLowerCase();
      const testSection = (test.section || '').toLowerCase();
      const sectionAllowed = !test.section || testSection === 'all' || testSection === 'all sections' || (
        userSection && (
          testSection === userSection ||
          userSection === `section ${testSection}` ||
          `section ${userSection}` === testSection
        )
      );

      if (!isYearAllowed || !branchAllowed || !sectionAllowed) {
        return res.status(403).json({
          success: false,
          error: 'This exam is not assigned to your academic scope (Year, Branch, Section).'
        });
      }
    }

    const questionLimit = Math.min(test.questionLimit || 20, test.questions.length);
    const selectedQuestions = shuffleArray([...test.questions]).slice(0, questionLimit);

    const secureQuestions = selectedQuestions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options
    }));

    res.status(200).json({
      success: true,
      data: {
        _id: test._id,
        title: test.title,
        description: test.description,
        category: test.category,
        difficulty: test.difficulty || 'general',
        duration: test.duration,
        questionLimit,
        academicYear: test.academicYear,
        branch: test.branch,
        section: test.section,
        subject: test.subject,
        questions: secureQuestions
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit a test attempt and calculate score
// @route   POST /api/tests/:id/submit
// @access  Private
exports.submitTestAttempt = async (req, res, next) => {
  try {
    const { answers } = req.body; // Array of { questionId, answerIndex }
    const testId = req.params.id;

    const test = await AptitudeTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = answers.length;
    const questionsBreakdown = [];

    answers.forEach((ans) => {
      const q = test.questions.id(ans.questionId);
      if (!q) return;

      const isCorrect = ans.answerIndex === q.correctOptionIndex;
      if (isCorrect) correctAnswers++;

      questionsBreakdown.push({
        questionText: q.questionText,
        options: q.options,
        userAnswer: ans.answerIndex !== undefined ? ans.answerIndex : -1,
        correctAnswer: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation
      });
    });

    // Create or update attempt
    let attempt = await TestAttempt.findOne({ user: req.user.id, test: testId });

    if (attempt) {
      attempt.score = correctAnswers;
      attempt.totalQuestions = totalQuestions;
      attempt.correctAnswers = correctAnswers;
      attempt.answers = answers.map(a => a.answerIndex);
      attempt.completedAt = Date.now();
      await attempt.save();
    } else {
      attempt = await TestAttempt.create({
        user: req.user.id,
        test: testId,
        score: correctAnswers,
        totalQuestions,
        correctAnswers,
        answers: answers.map(a => a.answerIndex)
      });
    }

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score: correctAnswers,
        totalQuestions,
        percentage: Math.round((correctAnswers / totalQuestions) * 100),
        breakdown: questionsBreakdown
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get test attempts history
// @route   GET /api/tests/attempts/history
// @access  Private
exports.getAttemptsHistory = async (req, res, next) => {
  try {
    const attempts = await TestAttempt.find({ user: req.user.id }).populate('test').sort({ completedAt: -1 });
    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new aptitude test (Admin and Faculty)
// @route   POST /api/tests
// @access  Private (Admin, Faculty)
exports.createTest = async (req, res, next) => {
  try {
    if (req.user.role === 'faculty') {
      req.body.createdBy = req.user.id;

      if (req.body.subject) {
        const Subject = require('../models/Subject');
        const subject = await Subject.findById(req.body.subject);
        if (!subject) {
          return res.status(404).json({ success: false, error: 'Subject not found' });
        }
        if (req.user.managedScopes && req.user.managedScopes.length > 0) {
          const canManage = req.user.managedScopes.some(scope => {
            const sYear = (scope.academicYear || '').trim().toLowerCase();
            const sBranch = (scope.branch || '').trim().toLowerCase();
            const reqYear = (subject.academicYear || '').trim().toLowerCase();
            const reqBranch = (subject.branch || '').trim().toLowerCase();
            const yearMatch = !sYear || sYear === 'all' || !reqYear || sYear === reqYear || reqYear.includes(sYear) || sYear.includes(reqYear);
            const branchMatch = !sBranch || sBranch === 'all' || !reqBranch || sBranch === reqBranch;
            return yearMatch && branchMatch;
          });
          if (!canManage) {
            return res.status(403).json({ success: false, error: 'You are not assigned to manage this subject.' });
          }
        }

        // Scope inheritance for faculty practice tests (Year, Branch, Section)
        const matchingScope = req.user.managedScopes?.find(s => {
          if (s.subject && String(s.subject) === String(subject._id)) return true;
          const yearMatch = !s.academicYear || s.academicYear.toLowerCase() === 'all' ||
            !subject.academicYear ||
            s.academicYear.trim().toLowerCase() === subject.academicYear.trim().toLowerCase() ||
            subject.academicYear.toLowerCase().includes(s.academicYear.toLowerCase());
          const branchMatch = !s.branch || s.branch.toLowerCase() === 'all' ||
            !subject.branch ||
            s.branch.trim().toLowerCase() === subject.branch.trim().toLowerCase();
          return yearMatch && branchMatch;
        }) || req.user.managedScopes?.[0];

        if (!req.body.academicYear) req.body.academicYear = matchingScope?.academicYear || subject.academicYear || '';
        if (!req.body.branch) req.body.branch = matchingScope?.branch || subject.branch || '';
        if (!req.body.section) req.body.section = matchingScope?.section || '';
      }
    }

    const test = await AptitudeTest.create(req.body);

    // Notify matching students in the assigned scope (Year, Branch, Section)
    try {
      const studentQuery = { role: 'student' };
      if (test.academicYear && test.academicYear !== 'All' && test.academicYear !== 'All Years') {
        studentQuery.$or = [{ academicYear: test.academicYear }, { year: test.academicYear }];
      }
      if (test.branch && test.branch !== 'All' && test.branch !== 'All Branches') {
        studentQuery.branch = new RegExp(`^${test.branch}$`, 'i');
      }
      if (test.section && test.section !== 'All' && test.section !== 'All Sections') {
        studentQuery.section = new RegExp(`^(?:Section\\s*)?${test.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      }

      const students = await User.find(studentQuery).select('_id');
      if (students && students.length > 0) {
        const notifDocs = students.map(s => ({
          user: s._id,
          type: 'test_assigned',
          message: `📝 New Practice Test Available: "${test.title}" (${test.duration || 20} mins). Test your skills!`,
          metadata: {
            testId: test._id,
            subjectId: test.subject || undefined
          }
        }));
        await Notification.insertMany(notifDocs);
        const io = req.app.get('socketio');
        if (io) {
          notifDocs.forEach(n => io.to(`user_${n.user}`).emit('new_notification', n));
        }
      }
    } catch (notifErr) {
      console.warn('Error dispatching student test notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      data: test
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a practice test
// @route   DELETE /api/tests/:id
// @access  Private/Admin & Faculty
exports.deleteTest = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    await AptitudeTest.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Practice test deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all questions for a test (Admin only)
// @route   GET /api/tests/:id/questions
// @access  Private/Admin
exports.getTestQuestionsAdmin = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    res.status(200).json({ success: true, data: test.questions });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a question to a test (Admin only)
// @route   POST /api/tests/:id/questions
// @access  Private/Admin
exports.addQuestion = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }

    test.questions.push(req.body);
    await test.save();

    res.status(201).json({ success: true, data: test.questions[test.questions.length - 1] });
  } catch (err) {
    next(err);
  }
};

// @desc    Edit a question in a test (Admin only)
// @route   PUT /api/tests/:id/questions/:qId
// @access  Private/Admin
exports.editQuestion = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }

    const question = test.questions.id(req.params.qId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const { questionText, questionImage, options, optionImages, correctOptionIndex, difficulty, explanation, explanationImage } = req.body;
    if (questionText !== undefined) question.questionText = questionText;
    if (questionImage !== undefined) question.questionImage = questionImage;
    if (options !== undefined) question.options = options;
    if (optionImages !== undefined) question.optionImages = optionImages;
    if (correctOptionIndex !== undefined) question.correctOptionIndex = correctOptionIndex;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (explanation !== undefined) question.explanation = explanation;
    if (explanationImage !== undefined) question.explanationImage = explanationImage;

    await test.save();

    res.status(200).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a question from a test (Admin only)
// @route   DELETE /api/tests/:id/questions/:qId
// @access  Private/Admin
exports.deleteQuestion = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }

    test.questions.pull(req.params.qId);
    await test.save();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all test attempts (Admin only)
// @route   GET /api/tests/admin/attempts
// @access  Private/Admin
exports.getAdminAttempts = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.testId) {
      query.test = req.query.testId;
    }
    const attempts = await TestAttempt.find(query)
      .populate('user', 'name email rollNumber branch section academicYear year')
      .populate('test', 'title category duration questionLimit subject')
      .sort({ completedAt: -1 });

    res.status(200).json({ success: true, data: attempts });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student test reports for a specific subject (Admin and Faculty)
// @route   GET /api/tests/subject/:subjectId/reports
// @access  Private (Admin, Faculty)
exports.getSubjectTestReports = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const Subject = require('../models/Subject');
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Check faculty scope permission if faculty
    if (req.user.role === 'faculty') {
      const canManage = !req.user.managedScopes || req.user.managedScopes.length === 0 || req.user.managedScopes.some(scope => {
        const sYear = (scope.academicYear || '').trim().toLowerCase();
        const sBranch = (scope.branch || '').trim().toLowerCase();
        const reqYear = (subject.academicYear || '').trim().toLowerCase();
        const reqBranch = (subject.branch || '').trim().toLowerCase();
        const yearMatch = !sYear || sYear === 'all' || !reqYear || sYear === reqYear || reqYear.includes(sYear) || sYear.includes(reqYear);
        const branchMatch = !sBranch || sBranch === 'all' || !reqBranch || sBranch === reqBranch;
        return yearMatch && branchMatch;
      });
      if (!canManage) {
        return res.status(403).json({ success: false, error: 'You are not assigned to manage this subject.' });
      }
    }

    // Find all tests linked to this subject
    const tests = await AptitudeTest.find({ subject: subjectId });
    const testIds = tests.map(t => t._id);

    // Find all attempts on these tests
    const attempts = await TestAttempt.find({ test: { $in: testIds } })
      .populate('user', 'name email rollNumber branch section academicYear year')
      .populate('test', 'title duration category difficulty questionLimit')
      .sort({ completedAt: -1 });

    const formattedReports = attempts.map(attempt => {
      const totalQ = attempt.totalQuestions || 1;
      const score = attempt.score || 0;
      const percentage = Math.round((score / totalQ) * 100);
      return {
        _id: attempt._id,
        student: {
          id: attempt.user?._id,
          name: attempt.user?.name || 'Unknown Student',
          email: attempt.user?.email || 'N/A',
          rollNumber: attempt.user?.rollNumber || 'N/A',
          branch: attempt.user?.branch || 'N/A',
          section: attempt.user?.section || 'N/A',
          academicYear: attempt.user?.academicYear || attempt.user?.year || 'N/A'
        },
        test: {
          id: attempt.test?._id,
          title: attempt.test?.title || 'Practice Test',
          duration: attempt.test?.duration,
          difficulty: attempt.test?.difficulty
        },
        score,
        totalQuestions: totalQ,
        correctAnswers: attempt.correctAnswers || score,
        percentage,
        passed: percentage >= 50,
        completedAt: attempt.completedAt
      };
    });

    res.status(200).json({
      success: true,
      subject: {
        id: subject._id,
        name: subject.name,
        code: subject.code,
        academicYear: subject.academicYear,
        branch: subject.branch,
        section: subject.section,
        notesCount: subject.notes ? subject.notes.length : 0
      },
      testsCount: tests.length,
      totalAttempts: formattedReports.length,
      data: formattedReports
    });
  } catch (err) {
    next(err);
  }
};

// --- IMAGE UPLOAD SUPPORT ---

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `img-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WEBP images are supported!'), false);
  }
};

exports.uploadQuestionImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('image');

exports.uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload an image file' });
  }
  res.status(200).json({
    success: true,
    url: `/uploads/${req.file.filename}`
  });
};



const titleFromSlug = (slug) => {
  if (!slug) return 'Custom Practice Problem';
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
};

const parsePracticeQuestionUrl = (platform, rawUrl = '') => {
  const url = String(rawUrl).trim();
  let parsedId = null;
  let parsedSlug = '';
  let parsedTitle = '';

  try {
    if (platform === 'leetcode') {
      const match = url.match(/problems\/([a-zA-Z0-9-]+)/);
      if (match?.[1]) {
        parsedSlug = match[1];
        parsedTitle = titleFromSlug(parsedSlug);
      }
    } else if (platform === 'codeforces') {
      const match = url.match(/problemset\/problem\/(\d+)\/([A-Z]\d*)/i) || url.match(/contest\/(\d+)\/problem\/([A-Z]\d*)/i);
      if (match?.[1] && match?.[2]) {
        parsedId = Number(match[1]);
        parsedSlug = String(match[1]) + match[2].toUpperCase();
        parsedTitle = 'Problem ' + parsedSlug;
      }
    } else if (platform === 'codechef') {
      const match = url.match(/problems\/([a-zA-Z0-9_-]+)/i);
      if (match?.[1]) {
        parsedSlug = match[1].toUpperCase();
        parsedTitle = parsedSlug;
      }
    } else if (platform === 'hackerrank') {
      const match = url.match(/challenges\/([a-zA-Z0-9-]+)/i);
      if (match?.[1]) {
        parsedSlug = match[1];
        parsedTitle = titleFromSlug(parsedSlug);
      }
    }
  } catch (err) {
    parsedSlug = '';
    parsedTitle = '';
  }

  if (!parsedSlug && url) {
    const cleanUrl = url.replace(/[?#].*$/, '').replace(/\/$/, '');
    const lastSegment = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
    if (/^[a-zA-Z0-9_-]+$/.test(lastSegment)) {
      parsedSlug = lastSegment;
      parsedTitle = titleFromSlug(lastSegment);
    }
  }

  return { id: parsedId, slug: parsedSlug, title: parsedTitle };
};

// --- PRACTICE PLATFORMS COORDINATION ---

// @desc    Get practice questions for a platform
// @route   GET /api/tests/practice-questions/:platform
// @access  Private
exports.getPracticeQuestions = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const query = { platform, isActive: true };
    if (req.query.company) {
      query.company = req.query.company;
    }
    const questions = await PracticeQuestion.find(query).sort({ id: 1 });
    res.status(200).json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a practice question to a platform (Admin only)
// @route   POST /api/tests/practice-questions/:platform
// @access  Private/Admin
exports.addPracticeQuestion = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { officialUrl, url, questionUrl, solution, tags } = req.body;
    const parsed = parsePracticeQuestionUrl(platform, officialUrl || url || questionUrl || '');

    const maxQuestion = await PracticeQuestion.findOne({ platform }).sort({ id: -1 }).select('id');
    const nextId = (maxQuestion?.id || 0) + 1;
    const finalId = Number(req.body.id || parsed.id || nextId);
    const finalSlug = String(req.body.slug || parsed.slug || '').trim();
    const finalTitle = String(req.body.title || parsed.title || titleFromSlug(finalSlug)).trim();
    const finalDifficulty = req.body.difficulty || 'Medium';

    if (!finalSlug) {
      return res.status(400).json({ success: false, error: 'Please provide a valid question URL.' });
    }

    const existing = await PracticeQuestion.findOne({
      platform,
      company: req.body.company || '',
      $or: [{ id: finalId }, { slug: finalSlug }]
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'This practice question already exists on this platform for this company.' });
    }

    const question = await PracticeQuestion.create({
      platform,
      id: finalId,
      title: finalTitle,
      difficulty: finalDifficulty,
      acceptance: req.body.acceptance || '50%',
      slug: finalSlug,
      solution: solution || '',
      tags: tags || [],
      company: req.body.company || '',
      year: req.body.year || new Date().getFullYear()
    });

    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a practice question from a platform (Admin only)
// @route   DELETE /api/tests/practice-questions/:platform/:id
// @access  Private/Admin
exports.deletePracticeQuestion = async (req, res, next) => {
  try {
    const { platform, id } = req.params;
    const question = await PracticeQuestion.findOneAndDelete({ platform, id: Number(id) });
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student practice progress report for a platform (Admin only)
// Helper to accurately determine which admin-added questions a student has solved
const calculateStudentPlatformSolved = (student, platform, questions, studentSolutions = []) => {
  if (!student || !questions || questions.length === 0) {
    return {
      solvedIds: [],
      solvedProblems: [],
      unsolvedProblems: questions ? questions.map(q => ({ id: q.id, title: q.title, difficulty: q.difficulty, slug: q.slug, acceptance: q.acceptance })) : [],
      solvedCount: 0,
      totalCount: questions ? questions.length : 0,
      percentage: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      easyTotal: (questions || []).filter(q => q.difficulty === 'Easy').length,
      mediumTotal: (questions || []).filter(q => q.difficulty === 'Medium').length,
      hardTotal: (questions || []).filter(q => q.difficulty === 'Hard').length
    };
  }

  // 1. Build map of user solutions saved in portal
  const portalSolutionsMap = new Map();
  studentSolutions.forEach(sol => {
    if (sol.problemId) {
      portalSolutionsMap.set(String(sol.problemId).toLowerCase().trim(), sol);
    }
  });

  // 2. Build verified solved slugs set from student's synchronized platform stats
  const verifiedSlugs = new Set();
  if (platform === 'leetcode') {
    (student.leetcodeStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  } else if (platform === 'codeforces') {
    (student.codeforcesStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  } else if (platform === 'codechef') {
    (student.codechefStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  } else if (platform === 'hackerrank') {
    (student.hackerrankStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  }

  const solvedIds = [];
  const solvedProblems = [];
  const unsolvedProblems = [];

  questions.forEach(q => {
    const slugKey = String(q.slug || '').toLowerCase().trim();
    const titleKey = String(q.title || '').toLowerCase().trim();
    const idKey = String(q.id);

    const portalSol = portalSolutionsMap.get(slugKey) || 
                      portalSolutionsMap.get(titleKey) || 
                      portalSolutionsMap.get(idKey);

    const isPlatformSolved = (slugKey && verifiedSlugs.has(slugKey)) || 
                             (titleKey && verifiedSlugs.has(titleKey));

    if (portalSol || isPlatformSolved) {
      solvedIds.push(q.id);
      solvedProblems.push({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        slug: q.slug,
        acceptance: q.acceptance,
        language: portalSol?.language || 'cpp',
        solvedAt: portalSol?.updatedAt || null,
        hasCustomCode: !!portalSol?.solutionCode,
        solutionCode: portalSol?.solutionCode || ''
      });
    } else {
      unsolvedProblems.push({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty,
        slug: q.slug,
        acceptance: q.acceptance
      });
    }
  });

  const easySolved = solvedProblems.filter(p => p.difficulty === 'Easy').length;
  const mediumSolved = solvedProblems.filter(p => p.difficulty === 'Medium').length;
  const hardSolved = solvedProblems.filter(p => p.difficulty === 'Hard').length;
  const totalCount = questions.length;
  const solvedCount = solvedProblems.length;
  const percentage = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return {
    solvedIds,
    solvedProblems,
    unsolvedProblems,
    solvedCount,
    totalCount,
    percentage,
    easySolved,
    mediumSolved,
    hardSolved,
    easyTotal: questions.filter(q => q.difficulty === 'Easy').length,
    mediumTotal: questions.filter(q => q.difficulty === 'Medium').length,
    hardTotal: questions.filter(q => q.difficulty === 'Hard').length
  };
};

exports.calculateStudentPlatformSolved = calculateStudentPlatformSolved;

// @desc    Get practice stats and rank for logged in student on all platforms
// @route   GET /api/tests/practice-stats/me
// @access  Private
exports.getStudentPracticeStats = async (req, res, next) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const platforms = ['leetcode', 'codeforces', 'codechef', 'hackerrank'];
    const allQuestions = await PracticeQuestion.find({ isActive: true }).sort({ id: 1 });
    const allStudentSolutions = await UserSolution.find({ user: student._id });
    const allStudents = await User.find({ role: { $ne: 'admin' } }).select('name leetcodeUsername leetcodeStats codeforcesUsername codeforcesStats codechefUsername codechefStats hackerrankUsername hackerrankStats');
    const allCohortSolutions = await UserSolution.find();

    // Map cohort solutions by user and platform
    const cohortSolutionsByUserPlat = new Map();
    allCohortSolutions.forEach(sol => {
      const key = `${sol.user}_${sol.platform}`;
      if (!cohortSolutionsByUserPlat.has(key)) cohortSolutionsByUserPlat.set(key, []);
      cohortSolutionsByUserPlat.get(key).push(sol);
    });

    const stats = {};

    platforms.forEach(plat => {
      const platQuestions = allQuestions.filter(q => q.platform === plat);
      const studentPlatSolutions = allStudentSolutions.filter(s => s.platform === plat);
      const studentResult = calculateStudentPlatformSolved(student, plat, platQuestions, studentPlatSolutions);

      // Calculate rank among all students on this platform
      const studentScores = allStudents.map(s => {
        const sPlatSolutions = cohortSolutionsByUserPlat.get(`${s._id}_${plat}`) || [];
        const res = calculateStudentPlatformSolved(s, plat, platQuestions, sPlatSolutions);
        return {
          id: String(s._id),
          solvedCount: res.solvedCount
        };
      });

      studentScores.sort((a, b) => b.solvedCount - a.solvedCount);
      const rankIndex = studentScores.findIndex(s => s.id === String(student._id));
      const rank = rankIndex !== -1 ? rankIndex + 1 : 1;

      stats[plat] = {
        ...studentResult,
        rank,
        totalStudents: allStudents.length
      };
    });

    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student practice progress report for a platform or all platforms (Admin & Faculty)
// @route   GET /api/tests/practice-reports/:platform
// @access  Private/Admin
exports.getPracticeReport = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { branch, academicYear, section } = req.query;

    const query = { role: { $ne: 'admin' } };
    if (branch && branch !== 'all') query.branch = branch;
    if (academicYear && academicYear !== 'all') query.academicYear = academicYear;
    if (section && section !== 'all') query.section = section;

    const students = await User.find(query).sort({ name: 1 });
    const studentIds = students.map(s => s._id);

    const isAll = platform === 'all';
    const platQuery = isAll ? { isActive: true } : { platform, isActive: true };
    const questions = await PracticeQuestion.find(platQuery).sort({ id: 1 });

    const solutionQuery = { user: { $in: studentIds } };
    if (!isAll) solutionQuery.platform = platform;
    const allSolutions = await UserSolution.find(solutionQuery);

    const solutionsByUserPlat = new Map();
    allSolutions.forEach(sol => {
      const key = `${sol.user}_${sol.platform}`;
      if (!solutionsByUserPlat.has(key)) solutionsByUserPlat.set(key, []);
      solutionsByUserPlat.get(key).push(sol);
    });

    const reportData = students.map(student => {
      let username = '';
      let platformTotalSolved = 0;
      let platformSpecificStats = {};

      if (platform === 'leetcode') {
        username = student.leetcodeUsername || '';
        platformTotalSolved = student.leetcodeStats?.totalSolved || 0;
        platformSpecificStats = {
          easySolved: student.leetcodeStats?.easySolved || 0,
          mediumSolved: student.leetcodeStats?.mediumSolved || 0,
          hardSolved: student.leetcodeStats?.hardSolved || 0
        };
      } else if (platform === 'codeforces') {
        username = student.codeforcesUsername || '';
        platformTotalSolved = student.codeforcesStats?.solvedCount || 0;
        platformSpecificStats = {
          rating: student.codeforcesStats?.rating || 0,
          rank: student.codeforcesStats?.rank || 'Unrated'
        };
      } else if (platform === 'codechef') {
        username = student.codechefUsername || '';
        platformTotalSolved = student.codechefStats?.solvedCount || 0;
        platformSpecificStats = {
          rating: student.codechefStats?.rating || 0,
          stars: student.codechefStats?.stars || '1★'
        };
      } else if (platform === 'hackerrank') {
        username = student.hackerrankUsername || '';
        platformTotalSolved = student.hackerrankStats?.solvedCount || 0;
        platformSpecificStats = {
          score: student.hackerrankStats?.score || 0,
          badges: student.hackerrankStats?.badgesCount || 0
        };
      } else {
        username = student.leetcodeUsername || student.codeforcesUsername || student.codechefUsername || student.hackerrankUsername || '';
        platformTotalSolved = (student.leetcodeStats?.totalSolved || 0) +
                              (student.codeforcesStats?.solvedCount || 0) +
                              (student.codechefStats?.solvedCount || 0) +
                              (student.hackerrankStats?.solvedCount || 0);
      }

      let solvedPracticeCount = 0;
      let solvedProblems = [];
      let unsolvedProblems = [];
      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;

      if (isAll) {
        ['leetcode', 'codeforces', 'codechef', 'hackerrank'].forEach(p => {
          const pQuestions = questions.filter(q => q.platform === p);
          const pSolutions = solutionsByUserPlat.get(`${student._id}_${p}`) || [];
          const res = calculateStudentPlatformSolved(student, p, pQuestions, pSolutions);
          solvedPracticeCount += res.solvedCount;
          solvedProblems.push(...res.solvedProblems.map(sp => ({ ...sp, platform: p })));
          unsolvedProblems.push(...res.unsolvedProblems.map(up => ({ ...up, platform: p })));
          easySolved += res.easySolved;
          mediumSolved += res.mediumSolved;
          hardSolved += res.hardSolved;
        });
      } else {
        const pSolutions = solutionsByUserPlat.get(`${student._id}_${platform}`) || [];
        const res = calculateStudentPlatformSolved(student, platform, questions, pSolutions);
        solvedPracticeCount = res.solvedCount;
        solvedProblems = res.solvedProblems;
        unsolvedProblems = res.unsolvedProblems;
        easySolved = res.easySolved;
        mediumSolved = res.mediumSolved;
        hardSolved = res.hardSolved;
      }

      const totalPracticeCount = questions.length;
      const percentage = totalPracticeCount > 0 ? Math.round((solvedPracticeCount / totalPracticeCount) * 100) : 0;

      return {
        _id: student._id,
        studentId: student._id,
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber || 'N/A',
        branch: student.branch || 'N/A',
        section: student.section || 'N/A',
        academicYear: student.academicYear || 'N/A',
        username,
        platformTotalSolved,
        platformSpecificStats,
        solvedPracticeCount,
        totalPracticeCount,
        percentage,
        solvedPercentage: percentage,
        easySolved,
        mediumSolved,
        hardSolved,
        solvedProblems,
        solvedProblemTitles: solvedProblems.map(p => p.title),
        unsolvedProblems
      };
    });

    // Compute cohort ranks based on solvedPracticeCount descending
    reportData.sort((a, b) => b.solvedPracticeCount - a.solvedPracticeCount);
    reportData.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.status(200).json({
      success: true,
      platform,
      totalQuestions: questions.length,
      data: reportData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get individual student practice report across platforms (Admin & Faculty)
// @route   GET /api/tests/practice-reports/student/:studentId
// @access  Private/Admin
exports.getIndividualPracticeReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!studentId || studentId === 'undefined' || studentId === 'null') {
      return res.status(400).json({ success: false, error: 'Valid Student ID is required.' });
    }
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const platforms = ['leetcode', 'codeforces', 'codechef', 'hackerrank'];
    const allQuestions = await PracticeQuestion.find({ isActive: true }).sort({ id: 1 });
    const studentSolutions = await UserSolution.find({ user: student._id });
    const allStudents = await User.find({ role: { $ne: 'admin' } }).select('name leetcodeUsername leetcodeStats codeforcesUsername codeforcesStats codechefUsername codechefStats hackerrankUsername hackerrankStats');
    const allCohortSolutions = await UserSolution.find();

    const cohortSolutionsByUserPlat = new Map();
    allCohortSolutions.forEach(sol => {
      const key = `${sol.user}_${sol.platform}`;
      if (!cohortSolutionsByUserPlat.has(key)) cohortSolutionsByUserPlat.set(key, []);
      cohortSolutionsByUserPlat.get(key).push(sol);
    });

    const platformReports = {};
    let grandTotalAdmin = 0;
    let grandTotalSolved = 0;

    platforms.forEach(plat => {
      const platQuestions = allQuestions.filter(q => q.platform === plat);
      const platSolutions = studentSolutions.filter(s => s.platform === plat);
      const res = calculateStudentPlatformSolved(student, plat, platQuestions, platSolutions);

      // Rank calculation
      const studentScores = allStudents.map(s => {
        const sPlatSolutions = cohortSolutionsByUserPlat.get(`${s._id}_${plat}`) || [];
        const r = calculateStudentPlatformSolved(s, plat, platQuestions, sPlatSolutions);
        return { id: String(s._id), solvedCount: r.solvedCount };
      });
      studentScores.sort((a, b) => b.solvedCount - a.solvedCount);
      const rankIdx = studentScores.findIndex(s => s.id === String(student._id));
      const rank = rankIdx !== -1 ? rankIdx + 1 : 1;

      // Full question checklist for modal & individual CSV
      const questionsList = platQuestions.map(q => {
        const isSolved = res.solvedIds.includes(q.id);
        const solInfo = res.solvedProblems.find(sp => sp.id === q.id);
        return {
          id: q.id,
          title: q.title,
          difficulty: q.difficulty,
          acceptance: q.acceptance,
          slug: q.slug,
          officialUrl: q.officialUrl,
          isSolved,
          language: solInfo?.language || 'cpp',
          solvedAt: solInfo?.solvedAt || null,
          hasCustomCode: solInfo?.hasCustomCode || false,
          solutionCode: solInfo?.solutionCode || ''
        };
      });

      platformReports[plat] = {
        ...res,
        rank,
        totalStudents: allStudents.length,
        questions: questionsList,
        solvedPercentage: res.percentage,
        username: plat === 'leetcode' ? student.leetcodeUsername
                : plat === 'codeforces' ? student.codeforcesUsername
                : plat === 'codechef' ? student.codechefUsername
                : student.hackerrankUsername || '',
        platformStats: plat === 'leetcode' ? student.leetcodeStats
                     : plat === 'codeforces' ? student.codeforcesStats
                     : plat === 'codechef' ? student.codechefStats
                     : student.hackerrankStats || {}
      };
      grandTotalAdmin += res.totalCount;
      grandTotalSolved += res.solvedCount;
    });

    res.status(200).json({
      success: true,
      data: {
        student: {
          _id: student._id,
          studentId: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber || 'N/A',
          branch: student.branch || 'N/A',
          section: student.section || 'N/A',
          academicYear: student.academicYear || 'N/A',
          leetcodeUsername: student.leetcodeUsername || '',
          codeforcesUsername: student.codeforcesUsername || '',
          codechefUsername: student.codechefUsername || '',
          hackerrankUsername: student.hackerrankUsername || ''
        },
        grandTotalAdmin,
        grandTotalSolved,
        overallPercentage: grandTotalAdmin > 0 ? Math.round((grandTotalSolved / grandTotalAdmin) * 100) : 0,
        platforms: platformReports
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Edit a practice question (Admin only)
// @route   PUT /api/tests/practice-questions/:platform/:id
// @access  Private/Admin
exports.editPracticeQuestion = async (req, res, next) => {
  try {
    const { platform, id } = req.params;
    const { title, difficulty, acceptance, slug, solution, tags, company, year } = req.body;

    const question = await PracticeQuestion.findOneAndUpdate(
      { platform, id: Number(id) },
      { title, difficulty, acceptance, slug, solution, tags, company, year },
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({ success: false, error: 'Practice question not found.' });
    }

    res.status(200).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

// Simple utility to capitalize slug terms
const cleanTitleFromSlug = (slug) => {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// @desc    Bulk create practice questions (Admin only)
// @route   POST /api/tests/practice-questions/:platform/bulk
// @access  Private/Admin
exports.bulkCreatePracticeQuestions = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ success: false, error: 'Please provide an array of questions.' });
    }

    const createdQuestions = [];
    const duplicateErrors = [];

    for (const q of questions) {
      const urlStr = q.officialUrl || q.url || q.questionUrl || '';

      // Parse details
      let parsedId = null;
      let parsedSlug = '';
      let parsedTitle = '';

      if (platform === 'leetcode') {
        const match = urlStr.match(/problems\/([a-zA-Z0-9-]+)/);
        if (match?.[1]) {
          parsedSlug = match[1];
          parsedTitle = cleanTitleFromSlug(parsedSlug);
        }
      } else if (platform === 'codeforces') {
        const match = urlStr.match(/problemset\/problem\/(\d+)\/([A-Z]\d*)/i) || urlStr.match(/contest\/(\d+)\/problem\/([A-Z]\d*)/i);
        if (match?.[1] && match?.[2]) {
          parsedId = Number(match[1]);
          parsedSlug = String(match[1]) + match[2].toUpperCase();
          parsedTitle = 'Problem ' + parsedSlug;
        }
      } else if (platform === 'codechef') {
        const match = urlStr.match(/problems\/([a-zA-Z0-9_-]+)/i);
        if (match?.[1]) {
          parsedSlug = match[1].toUpperCase();
          parsedTitle = parsedSlug;
        }
      } else if (platform === 'hackerrank') {
        const match = urlStr.match(/challenges\/([a-zA-Z0-9-]+)/i);
        if (match?.[1]) {
          parsedSlug = match[1];
          parsedTitle = cleanTitleFromSlug(parsedSlug);
        }
      }

      if (!parsedSlug && urlStr) {
        const cleanUrl = urlStr.replace(/[?#].*$/, '').replace(/\/$/, '');
        const lastSegment = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
        if (/^[a-zA-Z0-9_-]+$/.test(lastSegment)) {
          parsedSlug = lastSegment;
          parsedTitle = cleanTitleFromSlug(lastSegment);
        }
      }

      let idCount = q.id || parsedId;
      if (!idCount) {
        const maxQ = await PracticeQuestion.findOne({ platform }).sort({ id: -1 }).select('id');
        idCount = (maxQ?.id || 0) + 1;
      }

      const finalId = Number(idCount);
      const finalSlug = String(q.slug || parsedSlug || '').trim();
      const finalTitle = String(q.title || parsedTitle || cleanTitleFromSlug(finalSlug) || `Question ${finalId}`).trim();
      const finalDifficulty = q.difficulty || 'Medium';

      if (!finalSlug) {
        duplicateErrors.push(`Skipped: Missing URL or slug payload details`);
        continue;
      }

      const existing = await PracticeQuestion.findOne({
        platform,
        $or: [{ id: finalId }, { slug: finalSlug }]
      });

      if (existing) {
        duplicateErrors.push(`Skipped: "${finalTitle}" already exists on ${platform}`);
        continue;
      }

      const newQ = await PracticeQuestion.create({
        platform,
        id: finalId,
        title: finalTitle,
        difficulty: finalDifficulty,
        acceptance: q.acceptance || '50%',
        slug: finalSlug,
        solution: q.solution || '',
        tags: q.tags || []
      });

      createdQuestions.push(newQ);
    }

    res.status(200).json({
      success: true,
      count: createdQuestions.length,
      data: createdQuestions,
      errors: duplicateErrors
    });
  } catch (err) {
    next(err);
  }
};
