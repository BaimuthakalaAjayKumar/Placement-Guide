const LabTask = require('../models/LabTask');
const LabPracticeAttempt = require('../models/LabPracticeAttempt');

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
      query.academicYear = studentYear(req.user);
      query.$or = [
        { branch: '' }, { branch: req.user.branch || '' }
      ];
      query.$and = [{ $or: [{ section: '' }, { section: req.user.section || '' }] }];
    } else if (req.query.subject) {
      query.subject = req.query.subject;
    }

    const tasks = await LabTask.find(query).populate('subject', 'name code').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const { title, instructions, subject, academicYear, branch = '', section = '', maxScore, dueDate } = req.body;
    if (!title || !instructions || !subject || !academicYear) {
      return res.status(400).json({ success: false, error: 'Title, instructions, subject, and academic year are required.' });
    }
    if (req.user.role === 'faculty' && !req.user.managedScopes.some(scope =>
      scope.academicYear === academicYear && (!scope.branch || scope.branch === branch) && (!scope.section || scope.section === section) && (!scope.subject || scope.subject.toString() === subject)
    )) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this lab scope.' });
    }

    const task = await LabTask.create({ title, instructions, subject, academicYear, branch, section, maxScore, dueDate, createdBy: req.user.id });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

exports.submitAttempt = async (req, res, next) => {
  try {
    const task = await LabTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Lab task not found.' });
    if (task.academicYear !== studentYear(req.user) || (task.branch && task.branch !== req.user.branch) || (task.section && task.section !== req.user.section)) {
      return res.status(403).json({ success: false, error: 'This lab task is not assigned to you.' });
    }

    const attempt = await LabPracticeAttempt.findOneAndUpdate(
      { task: task._id, student: req.user.id },
      { submission: req.body.submission || '', report: req.body.report || '', status: 'submitted' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: attempt });
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
