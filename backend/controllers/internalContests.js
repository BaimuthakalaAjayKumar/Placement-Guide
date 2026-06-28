const Contest = require('../models/Contest');
const ContestAttempt = require('../models/ContestAttempt');
const Question = require('../models/Question');
const User = require('../models/User');
const { evaluateCode } = require('../services/judgeService');
const sendEmail = require('../utils/sendEmail');

// @desc    Create an internal contest
// @route   POST /api/contests/internal
// @access  Private/Admin
exports.createContest = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can perform this action' });
    }

    const { title, description, startTime, endTime, duration, questions } = req.body;
    if (!title || !startTime || !endTime || !duration || !questions || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    const contest = await Contest.create({
      title,
      description,
      startTime,
      endTime,
      duration,
      questions,
      createdBy: req.user.id
    });

    // Notify all students via email (asynchronous background operation)
    User.find({ role: 'student' })
      .select('email name')
      .then(students => {
        console.log("==================================");
        console.log("Contest Students Found:", students.length);
        console.log(students);
        console.log("==================================");
        students.forEach(student => {
          sendEmail({
            to: student.email,
            subject: `New Internal Contest Scheduled: ${title}`,
            text: `Hello ${student.name},\n\nA new internal coding contest has been scheduled: "${title}".\n\nStart Time: ${new Date(startTime).toLocaleString()}\nDuration: ${duration} minutes\n\nLog in to PrepPortal to view details.\n\nPrepPortal Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">New Internal Contest Scheduled</h2>
                <p>Hello <strong>${student.name}</strong>,</p>
                <p>A new internal coding contest has been added to PrepPortal. Here are the details:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 30%;">Contest Title</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${title}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Description</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${description || 'No description provided.'}</td>
                  </tr>
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Start Time</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(startTime).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">End Time</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(endTime).toLocaleString()}</td>
                  </tr>
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Duration</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${duration} minutes</td>
                  </tr>
                </table>
                <p style="margin-top: 20px;">Please log in to your account and navigate to the Coding Contests section to take the contest when it starts.</p>
                <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b;">
                  This is an automated notification from PrepPortal. Please do not reply directly to this email.
                </div>
              </div>
            `
          }).catch(err => {
            console.error(`Failed to send email to ${student.email}:`, err);
          });
        });
      })
      .catch(err => {
        console.error('Failed to fetch students for contest email notification:', err);
      });

    res.status(201).json({
      success: true,
      data: contest
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all internal contests
// @route   GET /api/contests/internal
// @access  Private
exports.getContests = async (req, res, next) => {
  try {
    const contests = await Contest.find()
      .populate('createdBy', 'name')
      .populate('questions', 'title difficulty')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      data: contests
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get internal contest details
// @route   GET /api/contests/internal/:id
// @access  Private
exports.getContestById = async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('questions')
      .populate('createdBy', 'name');

    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    // Check if student has already started/completed an attempt
    const attempt = await ContestAttempt.findOne({ contest: contest._id, user: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        contest,
        userAttempt: attempt ? {
          isFinished: attempt.isFinished,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          fullscreenExits: attempt.fullscreenExits,
          score: attempt.score
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Start an internal contest attempt
// @route   POST /api/contests/internal/:id/start
// @access  Private
exports.startContest = async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    // Prevent duplicate attempts
    let attempt = await ContestAttempt.findOne({ contest: contest._id, user: req.user.id });
    if (attempt) {
      return res.status(200).json({
        success: true,
        message: 'Contest already started',
        data: attempt
      });
    }

    attempt = await ContestAttempt.create({
      contest: contest._id,
      user: req.user.id,
      proctoringLogs: [
        { message: 'Contest initiated. Webcam activated and proctoring enabled.', type: 'info' }
      ]
    });

    res.status(201).json({
      success: true,
      data: attempt
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Log a proctoring violation (fullscreen exit or suspicious face expression)
// @route   POST /api/contests/internal/:id/log-violation
// @access  Private
exports.logViolation = async (req, res, next) => {
  try {
    const { message, type } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const attempt = await ContestAttempt.findOne({ contest: req.params.id, user: req.user.id });
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Contest attempt not found' });
    }

    if (attempt.isFinished) {
      return res.status(400).json({ success: false, error: 'Exam is already closed' });
    }

    attempt.proctoringLogs.push({
      message,
      type: type || 'warning',
      timestamp: new Date()
    });

    // Check if it's a fullscreen violation
    if (type === 'violation' && message.toLowerCase().includes('fullscreen')) {
      attempt.fullscreenExits += 1;

      // Auto-terminate on 3rd fullscreen exit
      if (attempt.fullscreenExits >= 3) {
        attempt.isFinished = true;
        attempt.submittedAt = new Date();
        attempt.proctoringLogs.push({
          message: 'Exam terminated automatically: 3 fullscreen exits reached.',
          type: 'violation',
          timestamp: new Date()
        });
      }
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      data: {
        fullscreenExits: attempt.fullscreenExits,
        isFinished: attempt.isFinished
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit code during an internal contest + Plagiarism Check
// @route   POST /api/contests/internal/:id/submit-question
// @access  Private
exports.submitQuestion = async (req, res, next) => {
  try {
    const { questionId, code, language } = req.body;
    if (!questionId || !code || !language) {
      return res.status(400).json({ success: false, error: 'Please provide questionId, code, and language' });
    }

    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    const attempt = await ContestAttempt.findOne({ contest: contest._id, user: req.user.id });
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Contest attempt not found' });
    }

    if (attempt.isFinished) {
      return res.status(400).json({ success: false, error: 'Exam is already closed' });
    }

    // Check if this question is disqualified for this user
    if (attempt.disqualifiedQuestions.includes(questionId)) {
      return res.status(400).json({
        success: false,
        error: 'This question has been terminated for you due to a plagiarism violation.'
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Normalized code comparison helper
    const getNormalized = (c) => c.replace(/\s+/g, '');

    const currentNormalized = getNormalized(code);
    let plagiarismDetected = false;
    let matchingUser = null;

    // Search other candidates' attempts in the same contest
    const otherAttempts = await ContestAttempt.find({
      contest: contest._id,
      user: { $ne: req.user.id }
    }).populate('user', 'name');

    for (const other of otherAttempts) {
      const match = other.submissions.find(sub =>
        sub.question.toString() === questionId &&
        sub.status !== 'Plagiarized' &&
        getNormalized(sub.code) === currentNormalized
      );

      if (match) {
        plagiarismDetected = true;
        matchingUser = other.user;
        break;
      }
    }

    if (plagiarismDetected) {
      // Disqualify this question for the current student
      if (!attempt.disqualifiedQuestions.includes(questionId)) {
        attempt.disqualifiedQuestions.push(questionId);
      }

      // Add warning/violation logs
      attempt.proctoringLogs.push({
        message: `Plagiarism detected! Submitted solution matches another candidate (${matchingUser?.name || 'Anonymous'}). Question terminated.`,
        type: 'violation',
        timestamp: new Date()
      });

      // Save submission as Plagiarized
      attempt.submissions.push({
        question: questionId,
        code,
        language,
        status: 'Plagiarized',
        score: 0,
        similarityRefUser: matchingUser ? matchingUser._id : null
      });

      // Recalculate score (sum of all other valid submissions)
      let totalScore = 0;
      const seenQuestions = new Set();
      // Loop backward to find the highest score for each non-disqualified question
      for (let i = attempt.submissions.length - 1; i >= 0; i--) {
        const sub = attempt.submissions[i];
        if (attempt.disqualifiedQuestions.includes(sub.question)) continue;
        if (seenQuestions.has(sub.question.toString())) continue;
        seenQuestions.add(sub.question.toString());
        totalScore += sub.score;
      }
      attempt.score = totalScore;

      await attempt.save();

      return res.status(200).json({
        success: true,
        data: {
          status: 'Plagiarized',
          score: 0,
          passedTestCasesCount: 0,
          failedTestCasesCount: 0,
          disqualified: true,
          error: 'Plagiarism detected! Your submission matches another candidate\'s code. This question has been locked.'
        }
      });
    }

    // Evaluate code normally
    const allTestCases = [...question.visibleTestCases, ...question.hiddenTestCases];
    const evalResult = await evaluateCode(
      code,
      language,
      allTestCases,
      question.timeLimit,
      question.memoryLimit,
      question.title
    );

    // Calculate score
    const totalCases = allTestCases.length || 1;
    const passedCases = evalResult.passedTestCasesCount || 0;
    const subScore = Math.round((passedCases / totalCases) * 100);

    // Save submission
    attempt.submissions.push({
      question: questionId,
      code,
      language,
      status: evalResult.status === 'Accepted' ? 'Accepted' : 'Wrong Answer',
      score: subScore
    });

    // Recalculate attempt score
    let totalScore = 0;
    const seenQuestions = new Set();
    for (let i = attempt.submissions.length - 1; i >= 0; i--) {
      const sub = attempt.submissions[i];
      if (attempt.disqualifiedQuestions.includes(sub.question)) continue;
      if (seenQuestions.has(sub.question.toString())) continue;
      seenQuestions.add(sub.question.toString());
      totalScore += sub.score;
    }
    attempt.score = totalScore;

    await attempt.save();

    res.status(200).json({
      success: true,
      data: {
        status: evalResult.status,
        score: subScore,
        passedTestCasesCount: evalResult.passedTestCasesCount,
        failedTestCasesCount: evalResult.failedTestCasesCount,
        disqualified: false,
        error: evalResult.error
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Finish the contest attempt
// @route   POST /api/contests/internal/:id/finish
// @access  Private
exports.finishContest = async (req, res, next) => {
  try {
    const attempt = await ContestAttempt.findOne({ contest: req.params.id, user: req.user.id });
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Contest attempt not found' });
    }

    attempt.isFinished = true;
    attempt.submittedAt = new Date();
    attempt.proctoringLogs.push({
      message: 'Exam completed and submitted by candidate.',
      type: 'info',
      timestamp: new Date()
    });

    await attempt.save();

    res.status(200).json({
      success: true,
      data: attempt
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed Admin report for a contest
// @route   GET /api/contests/internal/:id/report
// @access  Private/Admin
exports.getContestReport = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can view reports' });
    }

    const contest = await Contest.findById(req.params.id).populate('questions', 'title difficulty');
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    const attempts = await ContestAttempt.find({ contest: contest._id })
      .populate('user', 'name email rollNumber branch')
      .populate('submissions.question', 'title')
      .populate('submissions.similarityRefUser', 'name')
      .sort({ score: -1, submittedAt: 1 });

    res.status(200).json({
      success: true,
      data: {
        contest,
        attempts: attempts.map(a => ({
          _id: a._id,
          user: a.user,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          isFinished: a.isFinished,
          score: a.score,
          fullscreenExits: a.fullscreenExits,
          proctoringLogs: a.proctoringLogs,
          disqualifiedQuestions: a.disqualifiedQuestions,
          submissions: a.submissions
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get public Contest Leaderboard for students/admins
// @route   GET /api/contests/internal/:id/leaderboard
// @access  Private
exports.getContestLeaderboard = async (req, res, next) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ success: false, error: 'Contest not found' });
    }

    const students = await User.find({ role: 'student' }).select('name rollNumber branch');
    const attempts = await ContestAttempt.find({ contest: contest._id });

    const rankings = students.map(student => {
      const attempt = attempts.find(a => a.user.toString() === student._id.toString());
      const totalQuestions = contest.questions ? contest.questions.length : 0;

      if (!attempt) {
        return {
          name: student.name,
          rollNumber: student.rollNumber || 'N/A',
          branch: student.branch || 'General',
          score: 0,
          solvedCount: 0,
          totalQuestions,
          languages: '-',
          timeSpent: 'N/A',
          isFinished: false,
          status: 'Not Attempted',
          date: '-'
        };
      }

      // Calculate completion time or duration spent
      const endTime = attempt.submittedAt || new Date();
      const durationSeconds = Math.max(0, Math.floor((new Date(endTime) - new Date(attempt.startedAt)) / 1000));
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;

      // Count solved questions
      const solvedCount = attempt.submissions.filter(s => s.status === 'Accepted' && !attempt.disqualifiedQuestions.includes(s.question)).length;

      // Extract unique languages used
      const uniqueLangs = Array.from(new Set(attempt.submissions.map(s => {
        if (!s.language) return null;
        const l = s.language.toLowerCase();
        if (l === 'cpp') return 'C++';
        if (l === 'java') return 'Java';
        if (l === 'python') return 'Python';
        if (l === 'javascript') return 'JavaScript';
        if (l === 'c') return 'C';
        return s.language;
      }).filter(Boolean)));

      const languagesUsed = uniqueLangs.join(', ') || 'N/A';

      return {
        name: student.name,
        rollNumber: student.rollNumber || 'N/A',
        branch: student.branch || 'General',
        score: attempt.score,
        solvedCount,
        totalQuestions,
        languages: languagesUsed,
        timeSpent: `${mins}m ${secs}s`,
        isFinished: attempt.isFinished,
        status: attempt.isFinished ? 'Finished' : 'Coding',
        date: new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      };
    });

    // Sort: attempted users first (by score descending, then timeSpent ascending), then not attempted users
    rankings.sort((a, b) => {
      if (a.status === 'Not Attempted' && b.status !== 'Not Attempted') return 1;
      if (a.status !== 'Not Attempted' && b.status === 'Not Attempted') return -1;
      if (a.status === 'Not Attempted' && b.status === 'Not Attempted') return 0;

      if (b.score !== a.score) return b.score - a.score;

      const parseTime = (timeStr) => {
        const parts = timeStr.split(' ');
        let totalSecs = 0;
        parts.forEach(p => {
          if (p.endsWith('m')) totalSecs += parseInt(p) * 60;
          if (p.endsWith('s')) totalSecs += parseInt(p);
        });
        return totalSecs;
      };
      return parseTime(a.timeSpent) - parseTime(b.timeSpent);
    });

    const rankedList = rankings.map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    res.status(200).json({
      success: true,
      data: {
        title: contest.title,
        rankings: rankedList
      }
    });
  } catch (err) {
    next(err);
  }
};
