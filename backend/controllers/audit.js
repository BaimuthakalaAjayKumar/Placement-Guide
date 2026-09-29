const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { logActivity, extractClientIp, extractUserAgent } = require('../utils/auditLogger');

// Helper to format seconds into readable string (e.g. "4h 23m 15s")
const formatDuration = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

// @desc    Record client heartbeat to track active student time
// @route   POST /api/audit/heartbeat
// @access  Private (Students, Faculty, Admin)
exports.recordHeartbeat = async (req, res, next) => {
  try {
    const rawSeconds = Number(req.body.durationSeconds) || 60;
    // Cap reasonable heartbeat chunk (e.g. 5s to 300s) to prevent manipulation
    const durationSeconds = Math.min(Math.max(rawSeconds, 5), 300);
    const { currentPath, pageTitle } = req.body;
    const clientIp = extractClientIp(req);
    const userAgent = extractUserAgent(req);

    const setFields = {
      lastActiveAt: new Date(),
      lastIpAddress: clientIp,
      userAgent: userAgent
    };
    if (currentPath) {
      setFields.currentPage = currentPath;
    }

    // Check user to ensure loginCount >= 1 and lastLoginIp is recorded
    const existing = await User.findById(req.user.id).select('loginCount lastLoginIp');
    if (!existing?.loginCount || existing.loginCount === 0) {
      setFields.loginCount = 1;
    }
    if (!existing?.lastLoginIp || existing.lastLoginIp === '127.0.0.1') {
      setFields.lastLoginIp = clientIp;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $inc: { totalActiveSeconds: durationSeconds },
        $set: setFields
      },
      { new: true }
    ).select('totalActiveSeconds lastActiveAt loginCount role lastIpAddress lastLoginIp currentPage');

    res.status(200).json({
      success: true,
      data: {
        totalActiveSeconds: user?.totalActiveSeconds || 0,
        totalActiveFormatted: formatDuration(user?.totalActiveSeconds || 0),
        lastActiveAt: user?.lastActiveAt,
        lastIpAddress: user?.lastIpAddress || clientIp,
        currentPage: user?.currentPage || currentPath
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Manually record an activity log entry
// @route   POST /api/audit/activity
// @access  Private
exports.recordActivity = async (req, res, next) => {
  try {
    const { action, category, description, details, durationSeconds } = req.body;

    if (!action || !description) {
      return res.status(400).json({ success: false, error: 'Please provide action and description' });
    }

    const logEntry = await logActivity({
      user: req.user,
      action,
      category: category || 'General',
      description,
      details: details || {},
      durationSeconds: Number(durationSeconds) || 0,
      req
    });

    res.status(201).json({
      success: true,
      data: logEntry
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get paginated audit logs with search and filters
// @route   GET /api/audit/logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      search,
      category,
      action,
      branch,
      academicYear,
      userRole,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (userId) {
      query.user = userId;
    }

    if (userRole) {
      query.userRole = userRole;
    } else {
      // Default to student logs if not specified, or allow all
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (action && action !== 'All') {
      query.action = action;
    }

    if (branch && branch !== 'All') {
      query.branch = new RegExp(`^${branch.trim()}$`, 'i');
    }

    if (academicYear && academicYear !== 'All') {
      query.academicYear = new RegExp(`^${academicYear.trim()}$`, 'i');
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { userName: { $regex: s, $options: 'i' } },
        { userEmail: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student engagement and session time summary roster
// @route   GET /api/audit/student-sessions
// @access  Private (Admin only)
exports.getStudentSessions = async (req, res, next) => {
  try {
    const { search, branch, academicYear, section, onlineOnly } = req.query;

    const query = { role: 'student' };

    if (branch && branch !== 'All') {
      query.branch = new RegExp(`^${branch.trim()}$`, 'i');
    }

    if (academicYear && academicYear !== 'All') {
      query.$or = [
        { academicYear: new RegExp(`^${academicYear.trim()}$`, 'i') },
        { year: new RegExp(`^${academicYear.trim()}$`, 'i') }
      ];
    }

    if (section && section !== 'All') {
      query.section = new RegExp(`^${section.trim()}$`, 'i');
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { rollNumber: { $regex: s, $options: 'i' } }
      ];
    }

    // Three minutes threshold for active online status
    const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);
    if (onlineOnly === 'true' || onlineOnly === true) {
      query.lastActiveAt = { $gte: onlineThreshold };
    }

    const students = await User.find(query)
      .select('name email rollNumber branch section academicYear year totalActiveSeconds lastActiveAt lastLoginAt loginCount lastIpAddress lastLoginIp currentPage currentDevice userAgent currentSessionStartedAt createdAt')
      .sort({ lastActiveAt: -1, totalActiveSeconds: -1 });

    // Count activities and gather recent session activities per student
    const studentIds = students.map(s => s._id);
    const [activityCounts, recentLogs] = await Promise.all([
      AuditLog.aggregate([
        { $match: { user: { $in: studentIds } } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ]),
      AuditLog.find({ user: { $in: studentIds } })
        .sort({ createdAt: -1 })
        .limit(300)
    ]);

    const activityCountMap = {};
    activityCounts.forEach(item => {
      activityCountMap[String(item._id)] = item.count;
    });

    const sessionActivitiesMap = {};
    const latestIpMap = {};
    recentLogs.forEach(log => {
      const uId = String(log.user);
      if (!sessionActivitiesMap[uId]) sessionActivitiesMap[uId] = [];
      if (sessionActivitiesMap[uId].length < 6) {
        sessionActivitiesMap[uId].push({
          _id: log._id,
          action: log.action,
          category: log.category,
          description: log.description,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt
        });
      }
      if (!latestIpMap[uId] && log.ipAddress) {
        latestIpMap[uId] = log.ipAddress;
      }
    });

    const formattedStudents = students.map(st => {
      const lastActive = st.lastActiveAt ? new Date(st.lastActiveAt) : null;
      const isOnline = !!lastActive && lastActive >= onlineThreshold;
      const totalSec = st.totalActiveSeconds || 0;

      const resolvedIp = st.lastIpAddress && st.lastIpAddress !== '127.0.0.1' 
        ? st.lastIpAddress 
        : (latestIpMap[String(st._id)] || st.lastLoginIp || st.lastIpAddress || '127.0.0.1');

      const resolvedLoginIp = st.lastLoginIp && st.lastLoginIp !== '127.0.0.1'
        ? st.lastLoginIp
        : (st.lastIpAddress || latestIpMap[String(st._id)] || '127.0.0.1');

      const studentSessionActions = sessionActivitiesMap[String(st._id)] || [];
      const computedLogins = Math.max(st.loginCount || 0, isOnline || st.lastActiveAt ? 1 : 0);

      return {
        _id: st._id,
        name: st.name,
        email: st.email,
        rollNumber: st.rollNumber || 'N/A',
        branch: st.branch || 'N/A',
        section: st.section || '—',
        academicYear: st.academicYear || st.year || 'N/A',
        totalActiveSeconds: totalSec,
        totalActiveFormatted: formatDuration(totalSec),
        totalActiveHours: (totalSec / 3600).toFixed(1),
        loginCount: computedLogins,
        lastActiveAt: st.lastActiveAt,
        lastLoginAt: st.lastLoginAt,
        isOnline,
        lastIpAddress: resolvedIp,
        lastLoginIp: resolvedLoginIp,
        currentPage: st.currentPage || '',
        currentDevice: st.currentDevice || '',
        currentSessionStartedAt: st.currentSessionStartedAt || st.lastLoginAt,
        sessionActivities: studentSessionActions,
        activityCount: Math.max(activityCountMap[String(st._id)] || 0, studentSessionActions.length),
        createdAt: st.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedStudents.length,
      data: formattedStudents
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get detailed audit timeline and session dossier for a single student
// @route   GET /api/audit/student/:id/timeline
// @access  Private (Admin only)
exports.getStudentTimeline = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id)
      .select('name email rollNumber branch section academicYear year totalActiveSeconds lastActiveAt lastLoginAt loginCount readinessScore lastIpAddress lastLoginIp currentPage currentDevice userAgent currentSessionStartedAt createdAt');

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found' });
    }

    const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);
    const isOnline = !!student.lastActiveAt && new Date(student.lastActiveAt) >= onlineThreshold;

    const logs = await AuditLog.find({ user: student._id })
      .sort({ createdAt: -1 })
      .limit(200);

    const systemLoginIp = student.lastLoginIp && student.lastLoginIp !== '127.0.0.1'
      ? student.lastLoginIp
      : (logs[0]?.ipAddress || student.lastIpAddress || '127.0.0.1');

    res.status(200).json({
      success: true,
      data: {
        student: {
          ...student.toObject(),
          totalActiveFormatted: formatDuration(student.totalActiveSeconds || 0),
          isOnline,
          systemLoginIp,
          currentIpAddress: student.lastIpAddress || systemLoginIp
        },
        activitiesCount: logs.length,
        logs
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get high-level audit overview statistics
// @route   GET /api/audit/stats
// @access  Private (Admin only)
exports.getAuditStats = async (req, res, next) => {
  try {
    const onlineThreshold = new Date(Date.now() - 3 * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      onlineNowCount,
      activeTodayCount,
      activeTimeAggregate,
      totalActivitiesLogged,
      categoryCounts,
      topStudents
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', lastActiveAt: { $gte: onlineThreshold } }),
      User.countDocuments({ role: 'student', lastActiveAt: { $gte: startOfToday } }),
      User.aggregate([
        { $match: { role: 'student' } },
        { $group: { _id: null, totalSeconds: { $sum: '$totalActiveSeconds' } } }
      ]),
      AuditLog.countDocuments({}),
      AuditLog.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.find({ role: 'student' })
        .select('name email rollNumber branch section totalActiveSeconds lastActiveAt')
        .sort({ totalActiveSeconds: -1 })
        .limit(5)
    ]);

    const totalSeconds = activeTimeAggregate[0]?.totalSeconds || 0;
    const totalHours = (totalSeconds / 3600).toFixed(1);

    const formattedTopStudents = topStudents.map(s => ({
      _id: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      branch: s.branch,
      totalActiveFormatted: formatDuration(s.totalActiveSeconds || 0),
      totalActiveHours: (s.totalActiveSeconds / 3600).toFixed(1)
    }));

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        onlineNowCount,
        activeTodayCount,
        totalSeconds,
        totalHours,
        totalActiveTimeFormatted: formatDuration(totalSeconds),
        totalActivitiesLogged,
        categoryCounts,
        topStudents: formattedTopStudents
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear audit logs
// @route   DELETE /api/audit/logs
// @access  Private (Admin only)
exports.clearAuditLogs = async (req, res, next) => {
  try {
    const { days } = req.query;
    let query = {};
    if (days) {
      const cutoff = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000);
      query = { createdAt: { $lt: cutoff } };
    }

    const result = await AuditLog.deleteMany(query);

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} audit log records successfully.`
    });
  } catch (err) {
    next(err);
  }
};
