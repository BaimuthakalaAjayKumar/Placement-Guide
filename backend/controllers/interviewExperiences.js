const InterviewExperience = require('../models/InterviewExperience');

// Seed default company interview experiences if database has none
const seedInterviewExperiences = async () => {
  try {
    const count = await InterviewExperience.countDocuments();
    if (count > 0) return;

    const sampleExperiences = [
      {
        student: '665000000000000000000001',
        studentName: 'Sanjay Kumar (2025 Batch)',
        studentEmail: 'sanjay.k@grietcollege.com',
        studentBranch: 'CSE',
        studentBatch: '2025',
        company: 'TCS',
        role: 'Digital Software Engineer',
        packageLPA: '7.5 LPA',
        driveYear: '2025',
        hiringType: 'On-Campus',
        rounds: [
          {
            roundNumber: 1,
            roundName: 'Round 1: NQT Online Aptitude & Coding',
            roundType: 'Aptitude',
            questionsAsked: [
              'Quantitative: Compound Interest vs Simple Interest difference problem',
              'Logical: Syllogism and Seating Arrangement (Circular table)',
              'Coding: Rotate Matrix by 90 degrees in-place',
              'Coding: Find all anagram pairs in a sentence'
            ],
            difficulty: 'Medium',
            durationMinutes: 90,
            experienceSummary: 'Time management was critical in the quantitative section. 2 coding problems: 1 easy array problem and 1 string manipulation.'
          },
          {
            roundNumber: 2,
            roundName: 'Round 2: Technical Interview',
            roundType: 'Technical',
            questionsAsked: [
              'Explain OOP principles with real-world examples: Abstraction vs Encapsulation',
              'Write SQL query to find employees whose salary is above department average',
              'Explain how indexing works in MySQL (B-Tree vs Hash index)',
              'Walk through your final year project architecture and how MongoDB handles concurrency'
            ],
            difficulty: 'Medium',
            durationMinutes: 45,
            experienceSummary: 'The panelist focused heavily on project implementation and SQL indexing.'
          },
          {
            roundNumber: 3,
            roundName: 'Round 3: HR & Managerial',
            roundType: 'HR',
            questionsAsked: [
              'Why do you want to join TCS over startup offers?',
              'Are you flexible with relocation and rotational shifts?',
              'Describe a conflict in a team project and how you resolved it'
            ],
            difficulty: 'Easy',
            durationMinutes: 20,
            experienceSummary: 'Polite and conversational. Emphasize teamwork and continuous learning.'
          }
        ],
        overallFeedback: 'Be thorough with your resume projects and practice SQL queries thoroughly. TCS Digital looks for strong fundamentals.',
        keyTipsForJuniors: 'Practice previous year TCS NQT papers and focus on explaining your thought process during the coding round.',
        status: 'approved'
      },
      {
        student: '665000000000000000000002',
        studentName: 'Ananya Reddy (2025 Batch)',
        studentEmail: 'ananya.r@grietcollege.com',
        studentBranch: 'IT',
        studentBatch: '2025',
        company: 'Amazon',
        role: 'Software Development Engineer - Intern',
        packageLPA: '₹80,000 / month',
        driveYear: '2025',
        hiringType: 'On-Campus',
        rounds: [
          {
            roundNumber: 1,
            roundName: 'Round 1: Online Assessment (OA)',
            roundType: 'Coding',
            questionsAsked: [
              'Dynamic Programming: Minimum total cost to ship parcels between fulfillment centers',
              'Two Pointers: Subarray with target sum and minimum length',
              'Work Style Simulation: Prioritizing customer deliverables vs technical debt'
            ],
            difficulty: 'Hard',
            durationMinutes: 90,
            experienceSummary: 'Optimal time complexity (O(N log N) or O(N)) is mandatory to pass all hidden testcases.'
          },
          {
            roundNumber: 2,
            roundName: 'Round 2: Technical Interview 1 (DSA)',
            roundType: 'Technical',
            questionsAsked: [
              'Binary Tree Maximum Path Sum (LeetCode Hard)',
              'Design a LRU Cache data structure with O(1) get and put',
              'Amazon LP: Customer Obsession — describe when you went above and beyond for a user'
            ],
            difficulty: 'Hard',
            durationMinutes: 60,
            experienceSummary: 'Interviewer asked follow-ups on handling concurrency in the LRU Cache.'
          },
          {
            roundNumber: 3,
            roundName: 'Round 3: Technical & Hiring Manager (Bar Raiser)',
            roundType: 'Technical',
            questionsAsked: [
              'Graph: Course Schedule II (Topological Sort)',
              'Amazon LP: Bias for Action — when did you make a calculated risk?',
              'System design basics: Rate limiter token bucket algorithm'
            ],
            difficulty: 'Hard',
            durationMinutes: 60,
            experienceSummary: 'Every technical question was paired with an Amazon Leadership Principle behavioral question.'
          }
        ],
        overallFeedback: 'Amazon emphasizes Leadership Principles equally alongside coding proficiency. Practice behavioral STAR technique.',
        keyTipsForJuniors: 'Never jump straight to writing code. Discuss edge cases, time/space complexity, and clarify requirements first.',
        status: 'approved'
      }
    ];

    await InterviewExperience.insertMany(sampleExperiences);
  } catch (err) {
    console.warn('Interview experience seed skipped:', err.message);
  }
};

seedInterviewExperiences();

// @desc    Get approved interview experiences (or all if faculty/admin)
// @route   GET /api/interview-experiences
// @access  Private
exports.getExperiences = async (req, res, next) => {
  try {
    const { company, search, role } = req.query;
    let query = {};

    // Students only see approved experiences; faculty/admin can see pending
    if (req.user.role === 'student') {
      query.status = 'approved';
    } else if (req.query.status) {
      query.status = req.query.status;
    }

    if (company && company !== 'all') {
      query.company = new RegExp(`^${company}$`, 'i');
    }
    if (search) {
      query.$or = [
        { company: new RegExp(search, 'i') },
        { role: new RegExp(search, 'i') },
        { studentName: new RegExp(search, 'i') },
        { overallFeedback: new RegExp(search, 'i') },
        { 'rounds.questionsAsked': { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const experiences = await InterviewExperience.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: experiences.length,
      data: experiences
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single interview experience
// @route   GET /api/interview-experiences/:id
// @access  Private
exports.getExperienceById = async (req, res, next) => {
  try {
    const experience = await InterviewExperience.findById(req.params.id);
    if (!experience) {
      return res.status(404).json({ success: false, error: 'Experience not found.' });
    }

    res.status(200).json({
      success: true,
      data: experience
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit new interview experience
// @route   POST /api/interview-experiences
// @access  Private (Students, Faculty, Admin)
exports.submitExperience = async (req, res, next) => {
  try {
    const {
      company,
      role,
      packageLPA,
      driveYear,
      hiringType,
      rounds,
      overallFeedback,
      keyTipsForJuniors
    } = req.body;

    // Faculty/Admin submissions auto-approved; student submissions auto-approved or pending moderation
    const status = (req.user.role === 'admin' || req.user.role === 'faculty') ? 'approved' : 'approved';

    const experience = await InterviewExperience.create({
      student: req.user.id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      studentBranch: req.user.branch || '',
      studentBatch: req.user.batch || '',
      company,
      role,
      packageLPA,
      driveYear: driveYear || '2025',
      hiringType: hiringType || 'On-Campus',
      rounds: rounds || [],
      overallFeedback,
      keyTipsForJuniors,
      status
    });

    res.status(201).json({
      success: true,
      message: '🎉 Thank you for contributing your interview experience! It will guide future batches.',
      data: experience
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Moderate interview experience (Admin & Faculty)
// @route   PUT /api/interview-experiences/:id/moderate
// @access  Private/Admin & Faculty
exports.moderateExperience = async (req, res, next) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }

    const experience = await InterviewExperience.findByIdAndUpdate(
      req.params.id,
      {
        status,
        moderatedBy: req.user.id,
        moderatedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Experience submission marked as ${status}.`,
      data: experience
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Upvote interview experience
// @route   POST /api/interview-experiences/:id/upvote
// @access  Private
exports.upvoteExperience = async (req, res, next) => {
  try {
    const experience = await InterviewExperience.findById(req.params.id);
    if (!experience) {
      return res.status(404).json({ success: false, error: 'Experience not found.' });
    }

    const userIdStr = String(req.user.id);
    const existingIndex = experience.upvotes.findIndex(u => String(u) === userIdStr);

    if (existingIndex > -1) {
      experience.upvotes.splice(existingIndex, 1);
    } else {
      experience.upvotes.push(req.user.id);
    }

    await experience.save();

    res.status(200).json({
      success: true,
      upvotesCount: experience.upvotes.length
    });
  } catch (err) {
    next(err);
  }
};
