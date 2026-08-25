const Question = require('../models/Question');
const Submission = require('../models/Submission');
const PlagiarismReport = require('../models/PlagiarismReport');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { evaluateCode } = require('../services/judgeService');
const { checkPlagiarism } = require('../services/plagiarismService');

// @desc    Get all questions with filters
// @route   GET /api/questions
// @access  Private
exports.getQuestions = async (req, res, next) => {
  try {
    const { difficulty, tag, language, search } = req.query;
    const query = {};

    // Standard filter
    if (difficulty) query.difficulty = difficulty;
    if (tag) query.tags = { $in: [tag] };
    if (language) query.allowedLanguages = { $in: [language] };

    // Non-admin can only see active questions
    if (req.user.role !== 'admin') {
      query.isActive = true;
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const questions = await Question.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // For every question, calculate total submissions count
    const questionsWithSubCount = await Promise.all(
      questions.map(async (q) => {
        const subCount = await Submission.countDocuments({ question: q._id });
        return {
          ...q.toObject(),
          totalSubmissions: subCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: questionsWithSubCount.length,
      data: questionsWithSubCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
exports.getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).populate('createdBy', 'name');
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Hide hidden test cases from students
    const questionData = question.toObject();
    if (req.user.role !== 'admin') {
      delete questionData.hiddenTestCases;
    }

    res.status(200).json({
      success: true,
      data: questionData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create question
// @route   POST /api/questions
// @access  Private/Admin
exports.createQuestion = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can perform this action' });
    }

    req.body.createdBy = req.user.id;
    const question = await Question.create(req.body);

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private/Admin
exports.updateQuestion = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can perform this action' });
    }

    let question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: question
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private/Admin
exports.deleteQuestion = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can perform this action' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    await question.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Run code against visible test cases
// @route   POST /api/questions/:id/run
// @access  Private
exports.runCode = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    if (!code || !language) {
      return res.status(400).json({ success: false, error: 'Please provide code and language' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Run only against visible test cases
    const results = await evaluateCode(
      code,
      language,
      question.visibleTestCases,
      question.timeLimit,
      question.memoryLimit,
      question.title
    );

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
};

// @desc    Submit code against all test cases + run plagiarism check
// @route   POST /api/questions/:id/submit
// @access  Private
exports.submitCode = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    if (!code || !language) {
      return res.status(400).json({ success: false, error: 'Please provide code and language' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    // Gather all test cases (visible and hidden)
    const allTestCases = [...question.visibleTestCases, ...question.hiddenTestCases];

    // Evaluate
    const evalResult = await evaluateCode(
      code,
      language,
      allTestCases,
      question.timeLimit,
      question.memoryLimit,
      question.title
    );

    // Save initial submission
    const submission = await Submission.create({
      user: req.user.id,
      question: question._id,
      code,
      language,
      status: evalResult.status,
      executionTime: evalResult.executionTime,
      memoryUsage: evalResult.memoryUsage,
      passedTestCasesCount: evalResult.passedTestCasesCount,
      failedTestCasesCount: evalResult.failedTestCasesCount,
      totalScore: evalResult.totalScore
    });

    // Run Plagiarism Check
    const plagResult = await checkPlagiarism(submission._id, question._id, code, language, req.user.id);

    // Update submission with plagiarism percentage
    submission.plagiarismPercentage = plagResult.plagiarismPercentage;
    await submission.save();

    // Create detailed Plagiarism Report
    const plagReport = await PlagiarismReport.create({
      submission: submission._id,
      question: question._id,
      plagiarismPercentage: plagResult.plagiarismPercentage,
      status: plagResult.status,
      matchedSubmissions: plagResult.matchedSubmissions,
      matchedLines: plagResult.matchedLines,
      similarityGraphData: plagResult.similarityGraphData
    });

    // Create Notification if plagiarism > 40%
    if (plagResult.plagiarismPercentage > 40) {
      const recipients = await User.find({ role: { $in: ['admin', 'faculty'] } });
      const io = req.app.get('socketio');
      
      for (const recipient of recipients) {
        const notification = await Notification.create({
          user: recipient._id,
          type: 'plagiarism_alert',
          message: `High Plagiarism Detected! Student "${req.user.name}" submitted solution with ${plagResult.plagiarismPercentage}% similarity for question "${question.title}".`,
          metadata: {
            submissionId: submission._id,
            questionId: question._id,
            plagiarismPercentage: plagResult.plagiarismPercentage,
            studentName: req.user.name
          }
        });
        
        if (io) {
          io.to(`user_${recipient._id}`).emit('new_notification', notification);
        }
      }
    }

    res.status(200).json({
      success: true,
      submission,
      report: plagReport,
      evaluation: evalResult
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get submissions list (Admin: all, Student: only their own)
// @route   GET /api/questions/:id/submissions
// @access  Private
exports.getSubmissions = async (req, res, next) => {
  try {
    const query = { question: req.params.id };

    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    const submissions = await Submission.find(query)
      .populate('user', 'name email rollNumber branch year')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed submission report (Plagiarism report, student details, code matched)
// @route   GET /api/questions/submissions/:submissionId/report
// @access  Private
exports.getDetailedReport = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.submissionId)
      .populate('user', 'name email rollNumber branch year')
      .populate('question', 'title difficulty tags');

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    // Non-admin can only see their own reports
    if (req.user.role !== 'admin' && submission.user._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this report' });
    }

    const report = await PlagiarismReport.findOne({ submission: submission._id })
      .populate({
        path: 'matchedSubmissions.submission',
        select: 'code language createdAt'
      })
      .populate({
        path: 'matchedSubmissions.user',
        select: 'name email rollNumber branch year'
      });

    res.status(200).json({
      success: true,
      data: {
        submission,
        report
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Admin dashboard wide question submission report with sort & filters
// @route   GET /api/questions/submissions/report
// @access  Private/Admin
exports.getAdminSubmissionReport = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can perform this action' });
    }

    const { sort, difficulty, plagiarismStatus } = req.query;

    // Find all submissions
    let query = {};

    // Fetch submissions populated
    let submissions = await Submission.find(query)
      .populate('user', 'name email rollNumber branch year')
      .populate('question', 'title difficulty tags');

    // Filter by question difficulty
    if (difficulty) {
      submissions = submissions.filter(sub => sub.question && sub.question.difficulty === difficulty);
    }

    // Filter by plagiarism risk status
    if (plagiarismStatus) {
      submissions = submissions.filter(sub => {
        const percentage = sub.plagiarismPercentage || 0;
        let status = 'Original';
        if (percentage > 60) status = 'High Plagiarism';
        else if (percentage > 30) status = 'Moderate Similarity';
        else if (percentage > 10) status = 'Low Similarity';
        return status === plagiarismStatus;
      });
    }

    // Sort mappings
    if (sort === 'Highest Plagiarism') {
      submissions.sort((a, b) => b.plagiarismPercentage - a.plagiarismPercentage);
    } else if (sort === 'Lowest Plagiarism') {
      submissions.sort((a, b) => a.plagiarismPercentage - b.plagiarismPercentage);
    } else if (sort === 'Latest Submission') {
      submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'Oldest Submission') {
      submissions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'Highest Score') {
      submissions.sort((a, b) => b.totalScore - a.totalScore);
    } else {
      // Default: latest submission
      submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk create internal questions
// @route   POST /api/questions/bulk
// @access  Private/Admin
exports.bulkCreateQuestions = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can perform this action' });
    }

    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ success: false, error: 'Please provide an array of questions' });
    }

    const formattedQuestions = questions.map(q => ({
      title: q.title,
      difficulty: q.difficulty || 'Easy',
      description: q.description || 'No description provided.',
      constraints: q.constraints || '',
      inputFormat: q.inputFormat || '',
      outputFormat: q.outputFormat || '',
      sampleInput: q.sampleInput || '',
      sampleOutput: q.sampleOutput || '',
      explanation: q.explanation || '',
      visibleTestCases: q.visibleTestCases || [],
      hiddenTestCases: q.hiddenTestCases || [],
      timeLimit: q.timeLimit || 2000,
      memoryLimit: q.memoryLimit || 256,
      tags: q.tags || [],
      allowedLanguages: q.allowedLanguages || ['c', 'cpp', 'java', 'python', 'javascript', 'typescript', 'sql', 'mysql', 'postgresql', 'mongodb', 'html', 'css', 'reactjs', 'expressjs'],
      createdBy: req.user.id
    }));

    const created = await Question.insertMany(formattedQuestions);

    res.status(201).json({
      success: true,
      count: created.length,
      data: created
    });
  } catch (err) {
    next(err);
  }
};
