const PlacementEvent = require('../models/PlacementEvent');
const { logActivity } = require('../utils/auditLogger');

// Initial seed helper so calendar has realistic events out of the box
const seedInitialEventsIfEmpty = async (userId) => {
  const count = await PlacementEvent.countDocuments();
  if (count > 0) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const seedEvents = [
    {
      title: 'TCS National Qualifier Drive',
      description: 'Campus placement drive for 2026 graduating batch across all engineering disciplines.',
      eventType: 'company_drive',
      colorTag: 'purple',
      startDateTime: new Date(year, month, 5, 9, 30),
      endDateTime: new Date(year, month, 5, 17, 30),
      venueOrLink: 'GRIET Auditorium / Online Portal',
      instructorOrCompany: 'Tata Consultancy Services',
      targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
    },
    {
      title: 'DSA & Dynamic Programming Workshop',
      description: 'Hands-on intensive masterclass on advanced DP and Graph interview patterns.',
      eventType: 'training',
      colorTag: 'green',
      startDateTime: new Date(year, month, 8, 14, 0),
      endDateTime: new Date(year, month, 8, 16, 30),
      venueOrLink: 'Seminar Hall 3 & Zoom',
      instructorOrCompany: 'Prof. Ramesh (Lead Algorithms Coach)',
      targetAudience: { roles: ['student', 'faculty'], branches: ['CSE', 'IT', 'CSIT', 'AIML'] }
    },
    {
      title: 'Institutional Aptitude & Reasoning Mock Test',
      description: 'Timed assessment covering quantitative aptitude, logical reasoning, and verbal ability.',
      eventType: 'aptitude_test',
      colorTag: 'orange',
      startDateTime: new Date(year, month, 12, 10, 0),
      endDateTime: new Date(year, month, 12, 11, 30),
      venueOrLink: 'Online Assessment Engine',
      instructorOrCompany: 'TPO Assessment Cell',
      targetAudience: { roles: ['student'], branches: ['All'] }
    },
    {
      title: 'Google & Microsoft Mock Interview Rounds',
      description: 'Simulated 1-on-1 technical and behavioral rounds with industry mentors and senior faculty.',
      eventType: 'mock_interview',
      colorTag: 'blue',
      startDateTime: new Date(year, month, 15, 11, 0),
      endDateTime: new Date(year, month, 15, 16, 0),
      venueOrLink: 'Interview Rooms 1-4 & Google Meet',
      instructorOrCompany: 'Alumni Mentors & TPO Cell',
      targetAudience: { roles: ['student', 'faculty'], branches: ['All'] }
    },
    {
      title: 'Infosys & Accenture Registration Deadline',
      description: 'Strict cutoff for profile verification, resume upload, and consent submission on portal.',
      eventType: 'deadline',
      colorTag: 'red',
      startDateTime: new Date(year, month, 18, 23, 59),
      endDateTime: new Date(year, month, 18, 23, 59),
      allDay: true,
      venueOrLink: 'Portal Profile Portal',
      instructorOrCompany: 'Placement Cell',
      targetAudience: { roles: ['student', 'admin'], branches: ['All'] }
    },
    {
      title: 'Full-Stack System Design & Cloud Workshop',
      description: 'Architecting scalable microservices with Docker, Node.js, and AWS architecture basics.',
      eventType: 'workshop',
      colorTag: 'yellow',
      startDateTime: new Date(year, month, 22, 13, 0),
      endDateTime: new Date(year, month, 22, 17, 0),
      venueOrLink: 'Lab 502 & Live Stream',
      instructorOrCompany: 'Cloud Solutions Architect Guest Speaker',
      targetAudience: { roles: ['student', 'faculty'], branches: ['CSE', 'IT', 'CSIT'] }
    },
    {
      title: 'Deloitte Tech Assessment Drive',
      description: 'Online test for Associate Software Engineer and Risk Advisory campus roles.',
      eventType: 'company_drive',
      colorTag: 'purple',
      startDateTime: new Date(year, month, 26, 10, 0),
      endDateTime: new Date(year, month, 26, 13, 0),
      venueOrLink: 'Central Computing Lab',
      instructorOrCompany: 'Deloitte India',
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

    // Role-based target audience filtering
    const userRole = req.user?.role || 'student';
    query['targetAudience.roles'] = { $in: [userRole] };

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

// @desc    Create new calendar event
// @route   POST /api/placement-events
// @access  Private (Admin, Faculty)
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
      allDay
    } = req.body;

    if (!title || !eventType || !startDateTime || !endDateTime) {
      return res.status(400).json({ success: false, error: 'Please provide all required event fields' });
    }

    const event = await PlacementEvent.create({
      title,
      description,
      eventType,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      venueOrLink: venueOrLink || 'Campus Placement Cell',
      instructorOrCompany: instructorOrCompany || '',
      allDay: !!allDay,
      targetAudience: {
        roles: targetRoles && targetRoles.length > 0 ? targetRoles : ['student', 'faculty', 'admin'],
        branches: targetBranches && targetBranches.length > 0 ? targetBranches : ['All']
      },
      createdBy: req.user.id
    });

    await logActivity({
      user: req.user,
      action: 'CALENDAR_EVENT_CREATED',
      category: 'Placement Calendar',
      description: `Created placement event: ${event.title} (${event.eventType})`,
      details: { eventId: event._id, eventType: event.eventType },
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
// @access  Private (Admin, Faculty)
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await PlacementEvent.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Placement event deleted'
    });
  } catch (err) {
    next(err);
  }
};
