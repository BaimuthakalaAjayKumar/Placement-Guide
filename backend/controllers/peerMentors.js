const PeerMentor = require('../models/PeerMentor');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Seed default mentors if none exist
const seedInitialMentors = async () => {
  try {
    const count = await PeerMentor.countDocuments();
    if (count > 0) return;

    // Find any existing senior or user
    const users = await User.find({ role: 'student' }).limit(3);
    if (!users || users.length === 0) return;

    const sampleMentors = [
      {
        mentor: users[0]._id,
        mentorName: 'Priya Sharma (Placed: Amazon)',
        mentorEmail: users[0].email,
        mentorBranch: 'CSE',
        placedCompany: 'Amazon',
        placedRole: 'SDE-1',
        packageLPA: '28 LPA',
        bio: 'Cleared Amazon on-campus hiring with strong focus on Trees, Graphs & Dynamic Programming. Happy to review resumes and conduct mock coding rounds.',
        expertiseAreas: ['DSA & LeetCode', 'System Design Basics', 'Resume Review', 'Amazon Leadership Principles']
      },
      {
        mentor: users[1] ? users[1]._id : users[0]._id,
        mentorName: 'Rahul Varma (Placed: TCS Digital)',
        mentorEmail: users[1] ? users[1].email : users[0].email,
        mentorBranch: 'IT',
        placedCompany: 'TCS Digital',
        placedRole: 'Systems Engineer',
        packageLPA: '9.5 LPA',
        bio: 'Cracked TCS Digital through high score in Advanced Coding and Aptitude sections. Mentoring on Quantitative Aptitude and Core Java.',
        expertiseAreas: ['Aptitude Mastery', 'Java & OOPs', 'TCS Ninja to Digital Transition', 'HR Tips']
      }
    ];

    await PeerMentor.insertMany(sampleMentors);
  } catch (err) {
    console.warn('Peer mentor seed skipped:', err.message);
  }
};

seedInitialMentors();

// @desc    Get all active peer mentors
// @route   GET /api/peer-mentors
// @access  Private
exports.getMentors = async (req, res, next) => {
  try {
    const { company, search } = req.query;
    let query = { isActive: true };

    if (company && company !== 'all') {
      query.placedCompany = new RegExp(company, 'i');
    }
    if (search) {
      query.$or = [
        { mentorName: new RegExp(search, 'i') },
        { placedCompany: new RegExp(search, 'i') },
        { expertiseAreas: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const mentors = await PeerMentor.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: mentors.length,
      data: mentors
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Register as a peer mentor (Placed student)
// @route   POST /api/peer-mentors/register
// @access  Private
exports.becomeMentor = async (req, res, next) => {
  try {
    const existing = await PeerMentor.findOne({ mentor: req.user.id });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You are already registered as a Peer Mentor.' });
    }

    const { placedCompany, placedRole, packageLPA, bio, expertiseAreas } = req.body;

    const mentor = await PeerMentor.create({
      mentor: req.user.id,
      mentorName: req.user.name,
      mentorEmail: req.user.email,
      mentorBranch: req.user.branch || 'CSE',
      placedCompany,
      placedRole,
      packageLPA,
      bio,
      expertiseAreas: Array.isArray(expertiseAreas) ? expertiseAreas : (expertiseAreas || '').split(',').map(s => s.trim())
    });

    res.status(201).json({
      success: true,
      message: '🎉 Congratulations on your placement! You are now registered as a Peer Mentor.',
      data: mentor
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request mentorship from a senior mentor
// @route   POST /api/peer-mentors/:id/request
// @access  Private
exports.requestMentorship = async (req, res, next) => {
  try {
    const mentor = await PeerMentor.findById(req.params.id);
    if (!mentor) {
      return res.status(404).json({ success: false, error: 'Mentor not found' });
    }

    if (String(mentor.mentor) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: 'You cannot request mentorship from yourself.' });
    }

    const alreadyRequested = mentor.mentorshipRequests.some(r => String(r.student) === String(req.user.id) && r.status === 'pending');
    if (alreadyRequested) {
      return res.status(400).json({ success: false, error: 'You already have a pending mentorship request with this mentor.' });
    }

    const newRequest = {
      student: req.user.id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      studentBranch: req.user.branch || '',
      studentBatch: req.user.batch || '',
      message: req.body.message || 'Hi, I would love your guidance on preparing for upcoming campus recruitment rounds.',
      targetCompany: req.body.targetCompany || mentor.placedCompany,
      status: 'pending',
      requestedAt: new Date()
    };

    mentor.mentorshipRequests.push(newRequest);
    await mentor.save();

    // Notify mentor
    try {
      await Notification.create({
        user: mentor.mentor,
        type: 'mentor_request',
        message: `🤝 New mentorship request received from ${req.user.name} for ${mentor.placedCompany} preparation!`,
        metadata: { studentId: req.user.id }
      });
    } catch (e) {
      // Non-blocking
    }

    res.status(200).json({
      success: true,
      message: `Mentorship request sent to ${mentor.mentorName}!`,
      data: newRequest
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mentor responds to student request (Accept / Reject)
// @route   PUT /api/peer-mentors/requests/:requestId
// @access  Private
exports.respondToRequest = async (req, res, next) => {
  try {
    const { status, mentorNotes } = req.body; // 'accepted' | 'rejected'
    const mentorProfile = await PeerMentor.findOne({ mentor: req.user.id });

    if (!mentorProfile) {
      return res.status(403).json({ success: false, error: 'You do not have a registered mentor profile.' });
    }

    const request = mentorProfile.mentorshipRequests.id(req.params.requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found.' });
    }

    request.status = status;
    request.mentorNotes = mentorNotes || '';
    request.responseDate = new Date();
    await mentorProfile.save();

    // Notify student
    try {
      await Notification.create({
        user: request.student,
        type: 'mentor_response',
        message: status === 'accepted'
          ? `🎉 ${mentorProfile.mentorName} accepted your mentorship request for ${mentorProfile.placedCompany}!`
          : `Notice: ${mentorProfile.mentorName} could not accept your mentorship request due to full capacity.`,
        metadata: { mentorId: mentorProfile._id }
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Mentorship request marked as ${status}.`,
      data: request
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's mentorship relationships (as mentee and as mentor)
// @route   GET /api/peer-mentors/my
// @access  Private
exports.getMyMentorships = async (req, res, next) => {
  try {
    // 1. Where user is mentor
    const myMentorProfile = await PeerMentor.findOne({ mentor: req.user.id });

    // 2. Where user is mentee
    const allMentors = await PeerMentor.find({ 'mentorshipRequests.student': req.user.id });
    const myRequestsAsMentee = [];

    allMentors.forEach(m => {
      const myReqs = m.mentorshipRequests.filter(r => String(r.student) === String(req.user.id));
      myReqs.forEach(r => {
        myRequestsAsMentee.push({
          requestId: r._id,
          mentorName: m.mentorName,
          placedCompany: m.placedCompany,
          placedRole: m.placedRole,
          status: r.status,
          message: r.message,
          mentorNotes: r.mentorNotes,
          requestedAt: r.requestedAt
        });
      });
    });

    res.status(200).json({
      success: true,
      asMentor: myMentorProfile,
      asMentee: myRequestsAsMentee
    });
  } catch (err) {
    next(err);
  }
};
