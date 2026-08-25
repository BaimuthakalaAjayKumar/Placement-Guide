const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const Resume = require('../models/Resume');
const TestAttempt = require('../models/TestAttempt');
const MockInterview = require('../models/MockInterview');
const Submission = require('../models/Submission');
const aiService = require('../services/aiService');

// Local rule-based roadmap generator (fallback)
const generateLocalRoadmap = async (userId, user, latestResume, attempts, interviews, totalSolved) => {
  const steps = [];
  const strengths = [];
  const weaknesses = [];

  // Resume analysis
  const resumeScore = latestResume ? latestResume.score : 0;
  if (!latestResume) {
    weaknesses.push('No professional resume parsed');
    steps.push({
      title: 'Upload Resume to AI Analyzer',
      description: 'Upload your PDF resume to receive automated ATS compatibility scoring and structure critique.',
      type: 'resume',
      status: 'todo',
      resourceLink: '/resume-analyzer'
    });
  } else if (resumeScore < 70) {
    weaknesses.push('Resume optimization required');
    steps.push({
      title: 'Improve Resume ATS Score',
      description: `Your resume score is ${resumeScore}/100. Incorporate missing keywords and format achievements with action verbs.`,
      type: 'resume',
      status: 'todo',
      resourceLink: '/resume-analyzer'
    });
  } else {
    strengths.push('Highly optimized ATS Resume');
  }

  // Aptitude Analysis
  let aptitudeAvg = 0;
  let quantAvg = 0;
  let logicalAvg = 0;
  if (attempts.length > 0) {
    let totalPct = 0;
    let quantSum = 0, quantCount = 0;
    let logicalSum = 0, logicalCount = 0;

    attempts.forEach(att => {
      const pct = (att.score / att.totalQuestions) * 100;
      totalPct += pct;
      if (att.test && att.test.category === 'quantitative') {
        quantSum += pct;
        quantCount++;
      }
      if (att.test && att.test.category === 'logical') {
        logicalSum += pct;
        logicalCount++;
      }
    });

    aptitudeAvg = totalPct / attempts.length;
    quantAvg = quantCount > 0 ? quantSum / quantCount : 70;
    logicalAvg = logicalCount > 0 ? logicalSum / logicalCount : 70;
  }

  if (attempts.length === 0) {
    weaknesses.push('No aptitude benchmarks recorded');
    steps.push({
      title: 'Attempt General Aptitude MCQ Test',
      description: 'Complete a timed aptitude assessment to establish logical and numerical performance indicators.',
      type: 'aptitude',
      status: 'todo',
      resourceLink: '/aptitude-tests'
    });
  } else {
    if (aptitudeAvg >= 75) {
      strengths.push('Strong logical reasoning & general aptitude');
    }
    if (quantAvg < 60) {
      weaknesses.push('Numerical and Quantitative gaps');
      steps.push({
        title: 'Practice Quantitative MCQs',
        description: 'Practice advanced quantitative worksheets covering ratio, probability, and percentages.',
        type: 'aptitude',
        status: 'todo',
        resourceLink: '/aptitude-tests?category=quantitative'
      });
    }
    if (logicalAvg < 60) {
      weaknesses.push('Logical and patterns structure gaps');
      steps.push({
        title: 'Review Logical reasoning tests',
        description: 'Review analytical pattern completions, syllogisms, and sequence logical puzzles.',
        type: 'aptitude',
        status: 'todo',
        resourceLink: '/aptitude-tests?category=logical'
      });
    }
  }

  // Coding Analysis
  if (totalSolved === 0) {
    weaknesses.push('No competitive programming practice recorded');
    steps.push({
      title: 'Solve Question Bank Challenges',
      description: 'Start solving coding problems in the Question Bank (Arrays, Strings, Dynamic Programming).',
      type: 'coding',
      status: 'todo',
      resourceLink: '/question-bank'
    });
  } else if (totalSolved < 10) {
    weaknesses.push('Low coding output/streak consistency');
    steps.push({
      title: 'Maintain 5-Day Coding Streak',
      description: 'Solve at least one internal or external competitive programming question daily to build consistency.',
      type: 'coding',
      status: 'todo',
      resourceLink: '/question-bank'
    });
  } else {
    strengths.push('Consistent competitive programming contributor');
  }

  // Interview Analysis
  let interviewAvg = 0;
  if (interviews.length > 0) {
    interviewAvg = interviews.reduce((sum, item) => sum + item.overallScore, 0) / interviews.length;
  }

  if (interviews.length === 0) {
    weaknesses.push('No mock interview history');
    steps.push({
      title: 'Simulate AI Mock Interview',
      description: 'Conduct a virtual HR and Technical mock session to record responses and evaluate verbal delivery.',
      type: 'interview',
      status: 'todo',
      resourceLink: '/mock-interviews'
    });
  } else {
    if (interviewAvg >= 80) {
      strengths.push('Excellent oral communication & technical reasoning');
    } else if (interviewAvg < 60) {
      weaknesses.push('Requires better structural STAR interview answers');
      steps.push({
        title: 'Review Mock Interview Feedback',
        description: 'Read the AI Recruiter Critique reports and restructure your answers using the STAR format.',
        type: 'interview',
        status: 'todo',
        resourceLink: '/mock-interviews'
      });
    }
  }

  // Default steps if none generated
  if (steps.length === 0) {
    steps.push({
      title: 'Participate in Live Coding Contests',
      description: 'Compete in upcoming placement-driven coding rounds to optimize algorithms under tight limits.',
      type: 'coding',
      status: 'todo',
      resourceLink: '/contests'
    });
  }

  return {
    careerInterest: user.targetRole || 'Software Engineer',
    strengths,
    weaknesses,
    steps
  };
};

// @desc    Get or generate personalized roadmap
// @route   GET /api/roadmaps/me
// @access  Private
exports.getMyRoadmap = async (req, res, next) => {
  try {
    let roadmap = await Roadmap.findOne({ user: req.user.id });
    
    // If roadmap already exists, return it
    if (roadmap) {
      return res.status(200).json({
        success: true,
        data: roadmap
      });
    }

    // Generate stats needed for roadmap decision making
    const user = await User.findById(req.user.id);
    const latestResume = await Resume.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    const attempts = await TestAttempt.find({ user: req.user.id }).populate('test');
    const interviews = await MockInterview.find({ user: req.user.id });
    const internalSolved = await Submission.distinct('question', { user: req.user.id, status: 'Accepted' });
    const externalSolvedCount = (user.leetcodeStats?.totalSolved || 0) + 
                                (user.codeforcesStats?.solvedCount || 0) + 
                                (user.hackerrankStats?.solvedCount || 0);
    const totalSolved = internalSolved.length + externalSolvedCount;

    let resumeScore = latestResume ? latestResume.score : 0;
    let aptitudeAvg = 0;
    if (attempts.length > 0) {
      aptitudeAvg = Math.round(attempts.reduce((sum, item) => sum + (item.score / item.totalQuestions) * 100, 0) / attempts.length);
    }
    let interviewAvg = 0;
    if (interviews.length > 0) {
      interviewAvg = Math.round(interviews.reduce((sum, item) => sum + item.overallScore, 0) / interviews.length);
    }

    const stats = { resumeScore, aptitudeAvg, totalSolved, interviewAvg };

    // Try AI generation first
    let generated = await aiService.generateRoadmapWithAI(user, stats);
    if (!generated) {
      // Local fallback
      generated = await generateLocalRoadmap(req.user.id, user, latestResume, attempts, interviews, totalSolved);
    }

    roadmap = await Roadmap.create({
      user: req.user.id,
      careerInterest: generated.careerInterest,
      strengths: generated.strengths,
      weaknesses: generated.weaknesses,
      steps: generated.steps
    });

    res.status(201).json({
      success: true,
      data: roadmap
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Regenerate roadmap
// @route   POST /api/roadmaps/me/regenerate
// @access  Private
exports.regenerateMyRoadmap = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const latestResume = await Resume.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    const attempts = await TestAttempt.find({ user: req.user.id }).populate('test');
    const interviews = await MockInterview.find({ user: req.user.id });
    const internalSolved = await Submission.distinct('question', { user: req.user.id, status: 'Accepted' });
    const externalSolvedCount = (user.leetcodeStats?.totalSolved || 0) + 
                                (user.codeforcesStats?.solvedCount || 0) + 
                                (user.hackerrankStats?.solvedCount || 0);
    const totalSolved = internalSolved.length + externalSolvedCount;

    let resumeScore = latestResume ? latestResume.score : 0;
    let aptitudeAvg = 0;
    if (attempts.length > 0) {
      aptitudeAvg = Math.round(attempts.reduce((sum, item) => sum + (item.score / item.totalQuestions) * 100, 0) / attempts.length);
    }
    let interviewAvg = 0;
    if (interviews.length > 0) {
      interviewAvg = Math.round(interviews.reduce((sum, item) => sum + item.overallScore, 0) / interviews.length);
    }

    const stats = { resumeScore, aptitudeAvg, totalSolved, interviewAvg };

    // Try AI generation first
    let generated = await aiService.generateRoadmapWithAI(user, stats);
    if (!generated) {
      // Local fallback
      generated = await generateLocalRoadmap(req.user.id, user, latestResume, attempts, interviews, totalSolved);
    }

    // Find and update or create
    let roadmap = await Roadmap.findOne({ user: req.user.id });
    if (roadmap) {
      roadmap.careerInterest = generated.careerInterest;
      roadmap.strengths = generated.strengths;
      roadmap.weaknesses = generated.weaknesses;
      roadmap.steps = generated.steps;
      roadmap.updatedAt = new Date();
      await roadmap.save();
    } else {
      roadmap = await Roadmap.create({
        user: req.user.id,
        careerInterest: generated.careerInterest,
        strengths: generated.strengths,
        weaknesses: generated.weaknesses,
        steps: generated.steps
      });
    }

    res.status(200).json({
      success: true,
      data: roadmap
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update status of a roadmap step
// @route   PUT /api/roadmaps/steps/:stepId
// @access  Private
exports.updateStepStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['todo', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status required (todo, in-progress, completed)' });
    }

    const roadmap = await Roadmap.findOne({ user: req.user.id });
    if (!roadmap) {
      return res.status(404).json({ success: false, error: 'Roadmap not found' });
    }

    const step = roadmap.steps.id(req.params.stepId);
    if (!step) {
      return res.status(404).json({ success: false, error: 'Step not found' });
    }

    step.status = status;
    roadmap.updatedAt = new Date();
    await roadmap.save();

    res.status(200).json({
      success: true,
      data: roadmap
    });
  } catch (err) {
    next(err);
  }
};
