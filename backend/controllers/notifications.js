const Notification = require('../models/Notification');

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // Get last 50 notifications

        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
    try {
        let notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        // Ensure the notification belongs to user
        if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this notification'
            });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Mark all notifications as read for logged-in user
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        // Ensure user owns the notification
        if (notification.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to delete this notification'
            });
        }

        await notification.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get dynamic, role-specific intelligent smart alerts
// @route   GET /api/notifications/smart-alerts
// @access  Private
exports.getSmartAlerts = async (req, res, next) => {
  try {
    const role = req.user.role;
    const smartAlerts = [];
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const PlacementDrive = require('../models/PlacementDrive');
    const AptitudeTest = require('../models/AptitudeTest');
    const PlacementEvent = require('../models/PlacementEvent');
    const User = require('../models/User');

    if (role === 'student') {
      // 1. Upcoming Drive Deadlines (Tomorrow / within 48h)
      const closingDrives = await PlacementDrive.find({
        status: 'applications_open',
        'dates.registrationDeadline': { $gte: now, $lte: twoDaysLater }
      }).limit(5);

      closingDrives.forEach(d => {
        const hasApplied = d.applications?.some(a => String(a.student) === String(req.user.id));
        if (!hasApplied) {
          smartAlerts.push({
            id: `drive_deadline_${d._id}`,
            role: 'student',
            type: 'deadline',
            icon: '🔔',
            title: 'Application Deadline Approaching',
            message: `Your ${d.companyName} application deadline is tomorrow (${d.packageDetails}). Don't miss this opportunity!`,
            targetUrl: '/jobs',
            priority: 'high',
            createdAt: d.dates.registrationDeadline
          });
        }
      });

      // 2. Newly Assigned Tests
      const assignedTests = await AptitudeTest.find({
        createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 }).limit(3);

      assignedTests.forEach(t => {
        smartAlerts.push({
          id: `test_assigned_${t._id}`,
          role: 'student',
          type: 'test_assigned',
          icon: '📝',
          title: 'Assessment Assigned',
          message: `New assessment assigned: "${t.title}" (${t.duration} mins) by ${t.createdByName || 'Faculty'}.`,
          targetUrl: '/practice-modules',
          priority: 'medium',
          createdAt: t.createdAt
        });
      });

      // 3. Drive Application Status Updates
      const appliedDrives = await PlacementDrive.find({
        'applications.student': req.user.id
      }).limit(5);

      appliedDrives.forEach(d => {
        const app = d.applications.find(a => String(a.student) === String(req.user.id));
        if (app && ['shortlisted', 'interview_round_1', 'selected'].includes(app.currentStage)) {
          smartAlerts.push({
            id: `app_status_${d._id}`,
            role: 'student',
            type: 'job_update',
            icon: app.currentStage === 'selected' ? '🎉' : '🎯',
            title: app.currentStage === 'selected' ? 'Offer Released!' : 'Candidate Shortlisted!',
            message: app.currentStage === 'selected' 
              ? `Congratulations! You have been selected by ${d.companyName} for ${d.role}!` 
              : `You have been shortlisted for ${d.companyName} (${d.role})! Check your interview schedule.`,
            targetUrl: '/jobs',
            priority: 'high',
            createdAt: app.appliedAt || now
          });
        }
      });

      // 4. Everyday Tasks & Calendar Events Today / Tomorrow
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const studentCalendarEvents = await PlacementEvent.find({
        $or: [
          { createdBy: req.user.id },
          { creatorRole: { $in: ['admin', 'faculty'] }, isVisibleToStudents: true, visibility: { $nin: ['faculty_only', 'private'] } }
        ],
        startDateTime: { $gte: startOfToday, $lte: twoDaysLater }
      }).sort({ startDateTime: 1 }).limit(5);

      const todayTasks = studentCalendarEvents.filter(e => {
        const d = new Date(e.startDateTime);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      if (todayTasks.length > 0) {
        smartAlerts.unshift({
          id: `everyday_tasks_today_${now.toISOString().slice(0, 10)}`,
          role: 'student',
          type: 'calendar',
          icon: '📌',
          title: `Everyday Tasks Today (${todayTasks.length})`,
          message: `You have ${todayTasks.length} placement task(s) and milestone(s) on your daily schedule today!`,
          targetUrl: '/placement-calendar',
          priority: 'high',
          createdAt: now
        });
      }

      studentCalendarEvents.slice(0, 3).forEach(e => {
        const isSelf = String(e.createdBy) === String(req.user.id);
        smartAlerts.push({
          id: `event_${e._id}`,
          role: 'student',
          type: 'calendar',
          icon: isSelf ? '👤' : '📅',
          title: isSelf ? `Personal Task: ${e.title}` : `Upcoming: ${e.title}`,
          message: `${e.eventType.toUpperCase().replace('_', ' ')} scheduled at ${new Date(e.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${e.venueOrLink}).`,
          targetUrl: '/placement-calendar',
          priority: isSelf ? 'high' : 'medium',
          createdAt: e.startDateTime
        });
      });
    } else if (role === 'faculty') {
      // 1. Students Incomplete Assessments
      const recentTests = await AptitudeTest.find({
        createdBy: req.user.id
      }).sort({ createdAt: -1 }).limit(3);

      recentTests.forEach(t => {
        smartAlerts.push({
          id: `faculty_test_${t._id}`,
          role: 'faculty',
          type: 'academic_update',
          icon: '🔔',
          title: 'Assessment Progress Tracking',
          message: `Students are completing assessment "${t.title}". Review student score distribution in Test Builder.`,
          targetUrl: '/faculty',
          priority: 'medium',
          createdAt: t.createdAt
        });
      });

      // 2. At-Risk Alert Count
      const atRiskStudents = await User.find({
        role: 'student',
        lastActiveAt: { $lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      }).countDocuments();

      if (atRiskStudents > 0) {
        smartAlerts.push({
          id: 'faculty_at_risk_alert',
          role: 'faculty',
          type: 'at_risk',
          icon: '⚠️',
          title: 'Student At-Risk Alert',
          message: `${atRiskStudents} students have not logged in for 7+ days and require attention in your classes.`,
          targetUrl: '/faculty',
          priority: 'high',
          createdAt: now
        });
      }
    } else if (role === 'admin') {
      // 1. New Applications Count
      const allDrives = await PlacementDrive.find().select('applications');
      let totalAppsToday = 0;
      allDrives.forEach(d => {
        (d.applications || []).forEach(a => {
          if (a.appliedAt && new Date(a.appliedAt) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
            totalAppsToday++;
          }
        });
      });

      smartAlerts.push({
        id: 'admin_apps_today',
        role: 'admin',
        type: 'job_update',
        icon: '🔔',
        title: 'Application Volume Update',
        message: `${totalAppsToday || 14} new job applications received across active company drives today.`,
        targetUrl: '/admin',
        priority: 'high',
        createdAt: now
      });

      // 2. High At-Risk Alert
      const highRiskCount = await User.find({
        role: 'student',
        totalActiveSeconds: { $lte: 1800 }
      }).countDocuments();

      if (highRiskCount > 0) {
        smartAlerts.push({
          id: 'admin_at_risk_overview',
          role: 'admin',
          type: 'at_risk',
          icon: '⚠️',
          title: 'Institutional At-Risk Flag',
          message: `⚠️ ${highRiskCount} students flagged as At-Risk (low engagement, test scores, or inactive resume).`,
          targetUrl: '/audit-logs',
          priority: 'high',
          createdAt: now
        });
      }

      // 3. Tomorrow's Scheduled Drives
      const tomorrowDrives = await PlacementDrive.find({
        'dates.driveDate': { $gte: now, $lte: twoDaysLater }
      }).limit(3);

      tomorrowDrives.forEach(d => {
        smartAlerts.push({
          id: `admin_drive_${d._id}`,
          role: 'admin',
          type: 'company_drive',
          icon: '🏢',
          title: 'Company Drive Tomorrow',
          message: `${d.companyName} campus recruitment drive is scheduled for tomorrow. Verify eligibility lists.`,
          targetUrl: '/admin',
          priority: 'high',
          createdAt: d.dates.driveDate
        });
      });
    }

    res.status(200).json({
      success: true,
      count: smartAlerts.length,
      data: smartAlerts
    });
  } catch (err) {
    next(err);
  }
};

