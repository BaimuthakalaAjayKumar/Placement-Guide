const PlacementEvent = require('../models/PlacementEvent');
const { logActivity } = require('../utils/auditLogger');

// Initial seed helper so calendar has realistic events out of the box
const seedInitialEventsIfEmpty = async (userId) => {
  const count = await PlacementEvent.countDocuments();
  if (count > 0) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const seedEvents = [
    {
      title: 'TPO Admin Task: Final Resume & ATS Clearance',
      description: 'Mandatory verification of student resumes and CGPA verification for Tier-1 companies.',
      eventType: 'admin_task',
      colorTag: 'gold',
      startDateTime: new Date(year, month, day, 10, 0),
      endDateTime: new Date(year, month, day, 18, 0),
      venueOrLink: 'Placement Management Portal',
      instructorOrCompany: 'Campus Bridge Head of Placements',
      creatorRole: 'admin',
      creatorName: 'Main Admin (TPO Cell)',
      visibility: 'public',
      isVisibleToStudents: true,
      priority: 'urgent',
      targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
    },
    {
      title: 'TCS National Qualifier Drive',
      description: 'Campus placement drive for 2026 graduating batch across all engineering disciplines.',
      eventType: 'company_drive',
      colorTag: 'purple',
      startDateTime: new Date(year, month, day + 2, 9, 30),
      endDateTime: new Date(year, month, day + 2, 17, 30),
      venueOrLink: 'Campus Bridge Auditorium / Online Portal',
      instructorOrCompany: 'Tata Consultancy Services',
      creatorRole: 'admin',
      creatorName: 'Main Admin (TPO Cell)',
      visibility: 'public',
      isVisibleToStudents: true,
      priority: 'high',
      targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
    },
    {
      title: 'DSA & Dynamic Programming Workshop',
      description: 'Hands-on intensive masterclass on advanced DP and Graph interview patterns.',
      eventType: 'training',
      colorTag: 'green',
      startDateTime: new Date(year, month, day + 4, 14, 0),
      endDateTime: new Date(year, month, day + 4, 16, 30),
      venueOrLink: 'Seminar Hall 3 & Zoom',
      instructorOrCompany: 'Prof. Ramesh (Lead Algorithms Coach)',
      creatorRole: 'faculty',
      creatorName: 'Prof. Ramesh (Faculty Coordinator)',
      visibility: 'students',
      isVisibleToStudents: true,
      priority: 'medium',
      targetAudience: { roles: ['student', 'faculty'], branches: ['CSE', 'IT', 'CSIT', 'AIML'] }
    },
    {
      title: 'Institutional Aptitude & Reasoning Mock Test',
      description: 'Timed assessment covering quantitative aptitude, logical reasoning, and verbal ability.',
      eventType: 'aptitude_test',
      colorTag: 'orange',
      startDateTime: new Date(year, month, day + 6, 10, 0),
      endDateTime: new Date(year, month, day + 6, 11, 30),
      venueOrLink: 'Online Assessment Engine',
      instructorOrCompany: 'TPO Assessment Cell',
      creatorRole: 'admin',
      creatorName: 'Main Admin',
      visibility: 'students',
      isVisibleToStudents: true,
      priority: 'high',
      targetAudience: { roles: ['student'], branches: ['All'] }
    },
    {
      title: 'Google & Microsoft Mock Interview Rounds',
      description: 'Simulated 1-on-1 technical and behavioral rounds with industry mentors and senior faculty.',
      eventType: 'mock_interview',
      colorTag: 'blue',
      startDateTime: new Date(year, month, day + 8, 11, 0),
      endDateTime: new Date(year, month, day + 8, 16, 0),
      venueOrLink: 'Interview Rooms 1-4 & Google Meet',
      instructorOrCompany: 'Dr. Madhuri & Alumni Mentors',
      creatorRole: 'faculty',
      creatorName: 'Dr. Madhuri (Faculty Coordinator)',
      visibility: 'students',
      isVisibleToStudents: true,
      priority: 'high',
      targetAudience: { roles: ['student', 'faculty'], branches: ['All'] }
    },
    {
      title: 'Infosys & Accenture Registration Deadline',
      description: 'Strict cutoff for profile verification, resume upload, and consent submission on portal.',
      eventType: 'deadline',
      colorTag: 'red',
      startDateTime: new Date(year, month, day + 11, 23, 59),
      endDateTime: new Date(year, month, day + 11, 23, 59),
      allDay: true,
      venueOrLink: 'Portal Profile Portal',
      instructorOrCompany: 'Placement Cell',
      creatorRole: 'admin',
      creatorName: 'Main Admin',
      visibility: 'public',
      isVisibleToStudents: true,
      priority: 'urgent',
      targetAudience: { roles: ['student', 'admin'], branches: ['All'] }
    },
    {
      title: 'Full-Stack System Design & Cloud Workshop',
      description: 'Architecting scalable microservices with Docker, Node.js, and AWS architecture basics.',
      eventType: 'workshop',
      colorTag: 'yellow',
      startDateTime: new Date(year, month, day + 14, 13, 0),
      endDateTime: new Date(year, month, day + 14, 17, 0),
      venueOrLink: 'Lab 502 & Live Stream',
      instructorOrCompany: 'Cloud Solutions Architect Guest Speaker',
      creatorRole: 'faculty',
      creatorName: 'Prof. K. Reddy (Faculty)',
      visibility: 'students',
      isVisibleToStudents: true,
      priority: 'medium',
      targetAudience: { roles: ['student', 'faculty'], branches: ['CSE', 'IT', 'CSIT'] }
    },
    {
      title: 'Deloitte Tech Assessment Drive',
      description: 'Online test for Associate Software Engineer and Risk Advisory campus roles.',
      eventType: 'company_drive',
      colorTag: 'purple',
      startDateTime: new Date(year, month, day + 18, 10, 0),
      endDateTime: new Date(year, month, day + 18, 13, 0),
      venueOrLink: 'Central Computing Lab',
      instructorOrCompany: 'Deloitte India',
      creatorRole: 'admin',
      creatorName: 'Main Admin',
      visibility: 'public',
      isVisibleToStudents: true,
      priority: 'high',
      targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
    }
  ];

  await PlacementEvent.insertMany(seedEvents.map(e => ({ ...e, createdBy: userId || null })));
};

// @desc    Get placement calendar events
// @route   GET /api/placement-events
// @access  Private (All roles)
exports.getEvents = async (req, res, next) => {
  try {
    await seedInitialEventsIfEmpty(req.user?.id);

    const { eventType, startDate, endDate, role } = req.query;
    const query = {};

    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    if (startDate || endDate) {
      query.startDateTime = {};
      if (startDate) query.startDateTime.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.startDateTime.$lte = end;
      }
    }

    const userRole = req.user?.role || 'student';
    const userId = req.user?.id;
    const { scope } = req.query; // 'all' | 'personal' | 'admin' | 'faculty' | 'students'

    if (scope === 'personal') {
      // User only wants to see their personal tasks & schedule
      query.createdBy = userId;
    } else if (scope === 'admin') {
      query.creatorRole = 'admin';
      if (userRole === 'student') {
        query.isVisibleToStudents = true;
        query.visibility = { $nin: ['faculty_only', 'private'] };
      }
    } else if (scope === 'faculty') {
      query.creatorRole = 'faculty';
      if (userRole === 'student') {
        query.isVisibleToStudents = true;
        query.visibility = { $nin: ['faculty_only', 'private'] };
      }
    } else if (userRole === 'admin') {
      // Main Admin sees all events, or respects filters
    } else if (userRole === 'faculty') {
      // Faculty sees:
      // 1. All events created by themselves (personal + departmental)
      // 2. Official admin tasks & company drives
      // 3. Any event with visibility: public, students, or faculty_only
      query.$or = [
        { createdBy: userId },
        { creatorRole: 'admin', visibility: { $in: ['public', 'students', 'faculty_only'] } },
        { isVisibleToStudents: true, visibility: { $in: ['public', 'students', 'faculty_only'] } }
      ];
    } else {
      // Student sees:
      // 1. Events created by this student (personal tasks)
      // 2. Official Admin & Faculty events intended for students
      query.$or = [
        { createdBy: userId },
        {
          creatorRole: { $in: ['admin', 'faculty'] },
          isVisibleToStudents: true,
          visibility: { $nin: ['faculty_only', 'private'] }
        }
      ];
    }

    const events = await PlacementEvent.find(query).sort({ startDateTime: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new calendar event (Admin, Faculty, and Students)
// @route   POST /api/placement-events
// @access  Private (All authenticated users)
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      eventType,
      startDateTime,
      endDateTime,
      venueOrLink,
      instructorOrCompany,
      targetRoles,
      targetBranches,
      allDay,
      isVisibleToStudents,
      audienceScope, // 'personal' | 'students'
      isForPersonal,
      priority,
      colorTag
    } = req.body;

    if (!title || !startDateTime || !endDateTime) {
      return res.status(400).json({ success: false, error: 'Please provide event title, start time, and end time' });
    }

    const userRole = req.user.role || 'student';
    const userName = req.user.name || 'User';

    // Normalize audience purpose
    const isPersonalScope = audienceScope === 'personal' || isForPersonal === true;

    // Normalize event type based on user role and scope
    let finalEventType = eventType;
    if (!finalEventType) {
      if (isPersonalScope) finalEventType = 'personal_task';
      else if (userRole === 'admin') finalEventType = 'admin_task';
      else if (userRole === 'faculty') finalEventType = 'faculty_task';
      else finalEventType = 'personal_task';
    }

    // Determine visibility & isVisibleToStudents flag
    let finalIsVisibleToStudents = false;
    let finalVisibility = 'private';

    if (isPersonalScope) {
      // Strictly personal to this user (Admin, Faculty, or Student)
      finalIsVisibleToStudents = false;
      finalVisibility = 'private';
    } else if (userRole === 'student') {
      // Students can share with classmates if explicitly selected
      finalIsVisibleToStudents = isVisibleToStudents === true;
      finalVisibility = finalIsVisibleToStudents ? 'students' : 'private';
    } else if (userRole === 'faculty') {
      // Faculty publishing for students
      finalIsVisibleToStudents = isVisibleToStudents !== false;
      finalVisibility = finalIsVisibleToStudents ? 'students' : 'faculty_only';
    } else if (userRole === 'admin') {
      // Admin publishing for students / institution
      finalIsVisibleToStudents = isVisibleToStudents !== false;
      finalVisibility = finalIsVisibleToStudents ? 'public' : 'faculty_only';
    }

    const event = await PlacementEvent.create({
      title: title.trim(),
      description: (description || '').trim(),
      eventType: finalEventType,
      colorTag: colorTag || undefined,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      venueOrLink: (venueOrLink || (isPersonalScope ? 'Personal Schedule / Desk' : 'Campus Placement Cell / Online')).trim(),
      instructorOrCompany: (instructorOrCompany || (isPersonalScope ? userName : userRole === 'admin' ? 'TPO Admin' : userName)).trim(),
      allDay: !!allDay,
      creatorRole: userRole,
      creatorName: userName,
      visibility: finalVisibility,
      isVisibleToStudents: finalIsVisibleToStudents,
      priority: priority || 'medium',
      targetAudience: {
        roles: isPersonalScope
          ? [userRole]
          : targetRoles && targetRoles.length > 0
          ? targetRoles
          : (userRole === 'student' ? ['student'] : ['student', 'faculty', 'admin']),
        branches: targetBranches && targetBranches.length > 0 ? targetBranches : ['All']
      },
      createdBy: req.user.id
    });

    await logActivity({
      user: req.user,
      action: 'CALENDAR_EVENT_CREATED',
      category: 'Placement Calendar',
      description: `Created placement event: ${event.title} (${event.eventType}) [Scope: ${isPersonalScope ? 'Personal' : 'Students'}]`,
      details: { eventId: event._id, eventType: event.eventType, creatorRole: userRole, isPersonalScope },
      req
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete calendar event
// @route   DELETE /api/placement-events/:id
// @access  Private (Admin, or Faculty/Student creator)
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await PlacementEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const userRole = req.user.role;
    const isCreator = event.createdBy && event.createdBy.toString() === req.user.id.toString();

    // Permissions: Admin can delete anything; Faculty can delete their own or faculty events; Students can delete only their own
    if (userRole !== 'admin' && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this event'
      });
    }

    await PlacementEvent.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Placement event deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};
