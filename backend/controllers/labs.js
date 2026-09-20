const LabTask = require('../models/LabTask');
const LabPracticeAttempt = require('../models/LabPracticeAttempt');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { evaluateLabSubmission } = require('../services/labEvaluationService');
const { checkLabTaskPlagiarism } = require('../services/plagiarismService');

const studentYear = user => user.academicYear || user.year || '';
const canManage = (user, task) => user.role === 'admin' || (
  user.role === 'faculty' && user.managedScopes.some(scope =>
    scope.academicYear === task.academicYear &&
    (!scope.branch || scope.branch === task.branch) &&
    (!scope.section || scope.section === task.section) &&
    (!scope.subject || scope.subject.toString() === task.subject.toString())
  )
);

exports.getTasks = async (req, res, next) => {
  try {
    const query = { isActive: true };
    if (req.user.role === 'student') {
      const year = studentYear(req.user);
      const scopeFilters = [];

      if (year) {
        scopeFilters.push({
          $or: [
            { academicYear: year },
            { academicYear: { $in: ['', null, 'All', 'all'] } },
            { academicYear: { $exists: false } }
          ]
        });
      }

      if (req.user.branch) {
        scopeFilters.push({
          $or: [
            { branch: new RegExp(`^${req.user.branch}$`, 'i') },
            { branch: { $in: ['', null, 'All', 'all'] } },
            { branch: { $exists: false } }
          ]
        });
      }

      if (req.user.section) {
        scopeFilters.push({
          $or: [
            { section: new RegExp(`^${req.user.section}$`, 'i') },
            { section: { $in: ['', null, 'All', 'all'] } },
            { section: { $exists: false } }
          ]
        });
      }

      if (scopeFilters.length) {
        query.$and = scopeFilters;
      }
    } else if (req.query.subject) {
      query.subject = req.query.subject;
    }

    let tasks = await LabTask.find(query)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Attach caller's previous attempt if any
    const userAttempts = await LabPracticeAttempt.find({
      task: { $in: tasks.map(t => t._id) },
      student: req.user.id
    }).lean();

    const attemptMap = new Map();
    userAttempts.forEach(a => attemptMap.set(a.task.toString(), a));

    tasks = tasks.map(t => {
      const obj = t.toObject();
      if (req.user.role === 'student') {
        delete obj.referenceSolution;
      }
      obj.myAttempt = attemptMap.get(t._id.toString()) || null;
      return obj;
    });

    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      instructions,
      subject,
      academicYear,
      branch = '',
      section = '',
      maxScore,
      dueDate,
      referenceSolution = '',
      solutionLanguage = 'cpp',
      allowedLanguages
    } = req.body;

    if (!title || !instructions || !subject || !academicYear) {
      return res.status(400).json({ success: false, error: 'Title, instructions, subject, and academic year are required.' });
    }
    if (req.user.role === 'faculty' && !req.user.managedScopes.some(scope =>
      scope.academicYear === academicYear && (!scope.branch || scope.branch === branch) && (!scope.section || scope.section === section) && (!scope.subject || scope.subject.toString() === subject)
    )) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this lab scope.' });
    }

    const task = await LabTask.create({
      title,
      instructions,
      subject,
      academicYear,
      branch,
      section,
      maxScore: maxScore || 100,
      dueDate,
      referenceSolution,
      solutionLanguage,
      allowedLanguages: allowedLanguages || ['cpp', 'java', 'python', 'c', 'javascript', 'sql'],
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

exports.submitAttempt = async (req, res, next) => {
  try {
    const task = await LabTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Lab task not found.' });

    if (req.user.role === 'student') {
      const studentYr = (studentYear(req.user) || '').toLowerCase();
      const taskYr = (task.academicYear || '').toLowerCase();
      const isYearMatch = !task.academicYear || taskYr === 'all' || !studentYr || taskYr === studentYr;

      const studentBr = (req.user.branch || '').toLowerCase();
      const taskBr = (task.branch || '').toLowerCase();
      const isBranchMatch = !task.branch || taskBr === 'all' || !studentBr || taskBr === studentBr;

      const studentSec = (req.user.section || '').toLowerCase();
      const taskSec = (task.section || '').toLowerCase();
      const isSectionMatch = !task.section || taskSec === 'all' || !studentSec || taskSec === studentSec;

      if (!isYearMatch || !isBranchMatch || !isSectionMatch) {
        return res.status(403).json({ success: false, error: 'This lab task is not assigned to you.' });
      }
    }

    const submittedCode = req.body.code || req.body.submission || '';
    let submittedLang = req.body.language || task.solutionLanguage || 'cpp';

    // Auto-detect language if code has distinctive SQL or Python syntax
    if (/\b(create\s+(table|database)|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|alter\s+table|use\s+[a-zA-Z0-9_]+;?)\b/i.test(submittedCode)) {
      submittedLang = 'sql';
    } else if (/^\s*(import\s+(sys|os|numpy|math|pandas)|def\s+[a-zA-Z_]\w*\(|print\(|elif\s+)/m.test(submittedCode)) {
      submittedLang = 'python';
    }

    // 1. Evaluate student's code against the faculty reference solution
    const evalResult = evaluateLabSubmission(
      submittedCode,
      submittedLang,
      task.referenceSolution || '',
      task.solutionLanguage || 'cpp',
      task.maxScore || 100
    );

    // 2. Run Plagiarism Checker across all other student submissions for this specific Lab Task
    const plagResult = await checkLabTaskPlagiarism(
      task._id,
      req.user.id,
      submittedCode,
      submittedLang
    );

    // 3. Upsert attempt with score, code, evaluation breakdown and plagiarism report
    const attempt = await LabPracticeAttempt.findOneAndUpdate(
      { task: task._id, student: req.user.id },
      {
        submission: submittedCode,
        code: submittedCode,
        language: submittedLang,
        report: req.body.report || '',
        score: evalResult.score,
        feedback: evalResult.remarks,
        evaluationDetails: evalResult,
        plagiarismPercentage: plagResult.plagiarismPercentage,
        plagiarismStatus: plagResult.status,
        plagiarizedWith: plagResult.plagiarizedWith,
        matchedLines: plagResult.matchedLines,
        status: 'submitted'
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // 4. Send Plagiarism Alert Notification if plagiarism > 40%
    if (plagResult.plagiarismPercentage > 40) {
      try {
        const recipients = new Set();
        if (task.createdBy) recipients.add(task.createdBy.toString());

        // Notify Admins
        const admins = await User.find({ role: 'admin' }).select('_id');
        admins.forEach(a => recipients.add(a._id.toString()));

        for (const recipientId of recipients) {
          await Notification.create({
            user: recipientId,
            type: 'plagiarism_alert',
            message: `🚨 Plagiarism Alert! Student "${req.user.name}" (${req.user.rollNumber || 'N/A'}) submitted code with ${plagResult.plagiarismPercentage}% similarity to peer ${plagResult.plagiarizedWith?.studentName || ''} for Lab Task "${task.title}".`,
            metadata: {
              taskId: task._id,
              taskTitle: task.title,
              studentId: req.user.id,
              studentName: req.user.name,
              plagiarismPercentage: plagResult.plagiarismPercentage,
              plagiarizedWithName: plagResult.plagiarizedWith?.studentName
            }
          });
        }

        const io = req.app.get('socketio');
        if (io) {
          io.emit('plagiarism_alert', {
            taskId: task._id,
            taskTitle: task.title,
            studentName: req.user.name,
            plagiarismPercentage: plagResult.plagiarismPercentage,
            plagiarizedWithName: plagResult.plagiarizedWith?.studentName
          });
        }
      } catch (notifyErr) {
        console.error('Error dispatching lab plagiarism notification:', notifyErr.message);
      }
    }

    res.status(200).json({
      success: true,
      data: attempt,
      evaluation: evalResult,
      plagiarism: plagResult
    });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const task = await LabTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Lab task not found.' });
    if (!canManage(req.user, task)) return res.status(403).json({ success: false, error: 'Not authorized to view this lab report.' });

    const reports = await LabPracticeAttempt.find({ task: task._id })
      .populate('student', 'name email rollNumber branch section academicYear year')
      .populate('reviewedBy', 'name email')
      .populate('plagiarizedWith.student', 'name email rollNumber')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    next(err);
  }
};

exports.reviewAttempt = async (req, res, next) => {
  try {
    const attempt = await LabPracticeAttempt.findById(req.params.attemptId).populate('task');
    if (!attempt) return res.status(404).json({ success: false, error: 'Lab practice attempt not found.' });
    if (!canManage(req.user, attempt.task)) return res.status(403).json({ success: false, error: 'Not authorized to review this attempt.' });

    attempt.score = Math.max(0, Math.min(attempt.task.maxScore, Number(req.body.score) || 0));
    attempt.feedback = req.body.feedback || '';
    attempt.status = 'reviewed';
    attempt.reviewedBy = req.user.id;
    attempt.reviewedAt = new Date();
    await attempt.save();
    res.status(200).json({ success: true, data: attempt });
  } catch (err) {
    next(err);
  }
};

exports.getAllLabReports = async (req, res, next) => {
  try {
    let taskFilter = {};
    const isMainAdmin = req.user.role === 'admin' && (!req.user.managedScopes || req.user.managedScopes.length === 0);
    if (!isMainAdmin && req.user.managedScopes && req.user.managedScopes.length > 0) {
      taskFilter = {
        $or: req.user.managedScopes.map(scope => {
          const cond = {};
          if (scope.academicYear && scope.academicYear.toLowerCase() !== 'all') {
            cond.academicYear = new RegExp(scope.academicYear.trim(), 'i');
          }
          if (scope.branch && scope.branch.toLowerCase() !== 'all') {
            cond.branch = new RegExp(`^${scope.branch.trim()}$`, 'i');
          }
          if (scope.section && scope.section.toLowerCase() !== 'all') {
            cond.section = new RegExp(`^${scope.section.trim()}$`, 'i');
          }
          return cond;
        })
      };
    }

    const tasks = await LabTask.find(taskFilter).select('_id');
    const taskIds = tasks.map(t => t._id);

    const reports = await LabPracticeAttempt.find({ task: { $in: taskIds } })
      .populate({
        path: 'task',
        select: 'title maxScore academicYear branch section referenceSolution solutionLanguage createdBy',
        populate: { path: 'createdBy', select: 'name email' }
      })
      .populate('student', 'name email rollNumber branch section academicYear year')
      .populate('reviewedBy', 'name email')
      .populate('plagiarizedWith.student', 'name email rollNumber')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    next(err);
  }
};

