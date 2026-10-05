const mongoose = require('mongoose');
const AchievementDefinition = require('../models/AchievementDefinition');
const StudentAchievement = require('../models/StudentAchievement');
const Notification = require('../models/Notification');
const Submission = require('../models/Submission');
const Question = require('../models/Question');
const Project = require('../models/Project');
const Resume = require('../models/Resume');
const MockInterview = require('../models/MockInterview');
const ContestAttempt = require('../models/ContestAttempt');
const Roadmap = require('../models/Roadmap');
const AcademicRecord = require('../models/AcademicRecord');
const Discussion = require('../models/Discussion');
const User = require('../models/User');

// Initial seed definitions covering all 10 categories
const SEED_DEFINITIONS = [
  // 1. CODING
  {
    name: 'First Coding Problem',
    slug: 'coding_first_problem',
    description: 'Solve your very first coding problem with an Accepted submission.',
    category: 'Coding',
    icon: '🔥',
    rarity: 'Common',
    points: 25,
    criteria: { type: 'problems_solved', threshold: 1 }
  },
  {
    name: '10 Problems Solved',
    slug: 'coding_10_solved',
    description: 'Successfully solve 10 distinct algorithmic coding challenges.',
    category: 'Coding',
    icon: '🔥',
    rarity: 'Common',
    points: 50,
    criteria: { type: 'problems_solved', threshold: 10 }
  },
  {
    name: '50 Problems Solved',
    slug: 'coding_50_solved',
    description: 'Reach 50 accepted coding solutions on CampusBridge.',
    category: 'Coding',
    icon: '🔥',
    rarity: 'Rare',
    points: 100,
    criteria: { type: 'problems_solved', threshold: 50 }
  },
  {
    name: '100 Problems Solved',
    slug: 'coding_100_solved',
    description: 'Hit the triple digit century mark: 100 solved problems!',
    category: 'Coding',
    icon: '💻',
    rarity: 'Rare',
    points: 200,
    criteria: { type: 'problems_solved', threshold: 100 }
  },
  {
    name: '250 Problems Solved',
    slug: 'coding_250_solved',
    description: 'Solve 250 coding problems demonstrating deep algorithmic consistency.',
    category: 'Coding',
    icon: '💻',
    rarity: 'Epic',
    points: 350,
    criteria: { type: 'problems_solved', threshold: 250 }
  },
  {
    name: '500 Problems Solved',
    slug: 'coding_500_solved',
    description: 'Achieve legendary status with 500 accepted algorithmic solutions.',
    category: 'Coding',
    icon: '⚡',
    rarity: 'Epic',
    points: 500,
    criteria: { type: 'problems_solved', threshold: 500 }
  },
  // CODING STREAKS
  {
    name: '7 Day Coding Streak',
    slug: 'streak_7_day',
    description: 'Maintain a 7-day continuous coding streak on CampusBridge.',
    category: 'Coding',
    icon: '🔥',
    rarity: 'Common',
    points: 50,
    criteria: { type: 'coding_streak', threshold: 7 }
  },
  {
    name: '30 Day Coding Streak',
    slug: 'streak_30_day',
    description: 'Complete a continuous 30-day streak of active code submissions.',
    category: 'Coding',
    icon: '🔥',
    rarity: 'Rare',
    points: 150,
    criteria: { type: 'coding_streak', threshold: 30 }
  },
  {
    name: '60 Day Coding Streak',
    slug: 'streak_60_day',
    description: 'Demonstrate unstoppable perseverance with a 60-day coding streak.',
    category: 'Coding',
    icon: '🔥',
    rarity: 'Epic',
    points: 300,
    criteria: { type: 'coding_streak', threshold: 60 }
  },
  {
    name: '100 Day Coding Streak',
    slug: 'streak_100_day',
    description: 'Monumental dedication: 100 consecutive days of coding activity.',
    category: 'Coding',
    icon: '👑',
    rarity: 'Legendary',
    points: 600,
    criteria: { type: 'coding_streak', threshold: 100 }
  },
  // CODING DIFFICULTY
  {
    name: '25 Easy Problems',
    slug: 'coding_25_easy',
    description: 'Master foundational syntax and loops with 25 Easy problems solved.',
    category: 'Coding',
    icon: '🟢',
    rarity: 'Common',
    points: 50,
    criteria: { type: 'problems_by_difficulty', threshold: 25, difficulty: 'Easy' }
  },
  {
    name: '25 Medium Problems',
    slug: 'coding_25_medium',
    description: 'Tackle core technical interview hurdles with 25 Medium problems solved.',
    category: 'Coding',
    icon: '🟡',
    rarity: 'Rare',
    points: 150,
    criteria: { type: 'problems_by_difficulty', threshold: 25, difficulty: 'Medium' }
  },
  {
    name: '10 Hard Problems',
    slug: 'coding_10_hard',
    description: 'Crack advanced algorithms and graphs with 10 Hard problems solved.',
    category: 'Coding',
    icon: '🔴',
    rarity: 'Epic',
    points: 300,
    criteria: { type: 'problems_by_difficulty', threshold: 10, difficulty: 'Hard' }
  },

  // 2. PROJECTS
  {
    name: 'First Project',
    slug: 'projects_first_created',
    description: 'Create your first project workspace in CampusBridge Project Studio.',
    category: 'Projects',
    icon: '🚀',
    rarity: 'Common',
    points: 30,
    criteria: { type: 'projects_created', threshold: 1 }
  },
  {
    name: 'First Project Submitted',
    slug: 'projects_first_submitted',
    description: 'Submit your completed project code for faculty review.',
    category: 'Projects',
    icon: '🚀',
    rarity: 'Common',
    points: 60,
    criteria: { type: 'projects_submitted', threshold: 1 }
  },
  {
    name: 'First Project Approved',
    slug: 'projects_first_approved',
    description: 'Have your academic project reviewed and officially approved by faculty.',
    category: 'Projects',
    icon: '🚀',
    rarity: 'Rare',
    points: 120,
    criteria: { type: 'projects_approved', threshold: 1 }
  },
  {
    name: '3 Projects Completed',
    slug: 'projects_3_completed',
    description: 'Build and complete 3 full-stack software projects.',
    category: 'Projects',
    icon: '💻',
    rarity: 'Rare',
    points: 200,
    criteria: { type: 'projects_approved', threshold: 3 }
  },
  {
    name: '5 Projects Completed',
    slug: 'projects_5_completed',
    description: 'Assemble an impressive portfolio with 5 faculty-approved projects.',
    category: 'Projects',
    icon: '💻',
    rarity: 'Epic',
    points: 350,
    criteria: { type: 'projects_approved', threshold: 5 }
  },
  {
    name: 'Outstanding Project',
    slug: 'projects_outstanding',
    description: 'Achieve an exceptional grade (90% or higher) on a project submission.',
    category: 'Projects',
    icon: '🏆',
    rarity: 'Epic',
    points: 250,
    criteria: { type: 'outstanding_project', threshold: 1, minScore: 90 }
  },

  // 3. GITHUB
  {
    name: 'GitHub Connected',
    slug: 'github_connected',
    description: 'Connect and verify your GitHub profile on CampusBridge.',
    category: 'GitHub',
    icon: '🐙',
    rarity: 'Common',
    points: 25,
    criteria: { type: 'github_connected', threshold: 1 }
  },
  {
    name: 'First Repository Linked',
    slug: 'github_first_repo',
    description: 'Link an active GitHub code repository to your Project Studio workspace.',
    category: 'GitHub',
    icon: '🐙',
    rarity: 'Common',
    points: 40,
    criteria: { type: 'github_repo_linked', threshold: 1 }
  },
  {
    name: 'First CampusBridge GitHub Sync',
    slug: 'github_first_sync',
    description: 'Create a version snapshot and push code changes to your repository.',
    category: 'GitHub',
    icon: '🐙',
    rarity: 'Common',
    points: 50,
    criteria: { type: 'github_sync', threshold: 1 }
  },
  {
    name: '10 Commits Recorded',
    slug: 'github_10_commits',
    description: 'Maintain an active commit log with 10 code version snapshots.',
    category: 'GitHub',
    icon: '🐙',
    rarity: 'Rare',
    points: 100,
    criteria: { type: 'github_commits', threshold: 10 }
  },
  {
    name: '50 Commits Recorded',
    slug: 'github_50_commits',
    description: 'Demonstrate rigorous version control habits with 50 recorded code commits.',
    category: 'GitHub',
    icon: '🐙',
    rarity: 'Epic',
    points: 250,
    criteria: { type: 'github_commits', threshold: 50 }
  },
  {
    name: 'Open Source Contributor',
    slug: 'github_open_source',
    description: 'Verify public open-source contributions or repositories on your profile.',
    category: 'GitHub',
    icon: '🐙',
    rarity: 'Legendary',
    points: 400,
    criteria: { type: 'github_open_source', threshold: 1 }
  },

  // 4. INTERVIEWS
  {
    name: 'First Mock Interview',
    slug: 'interview_first',
    description: 'Complete your first AI-evaluated mock interview session.',
    category: 'Interviews',
    icon: '🎤',
    rarity: 'Common',
    points: 40,
    criteria: { type: 'mock_interviews_completed', threshold: 1 }
  },
  {
    name: '5 Mock Interviews',
    slug: 'interview_5_completed',
    description: 'Hone your verbal and technical delivery across 5 completed interviews.',
    category: 'Interviews',
    icon: '🎤',
    rarity: 'Rare',
    points: 120,
    criteria: { type: 'mock_interviews_completed', threshold: 5 }
  },
  {
    name: '10 Mock Interviews',
    slug: 'interview_10_completed',
    description: 'Complete 10 mock interviews to build unbreakable interview confidence.',
    category: 'Interviews',
    icon: '🎤',
    rarity: 'Epic',
    points: 250,
    criteria: { type: 'mock_interviews_completed', threshold: 10 }
  },
  {
    name: 'Technical Interview Master',
    slug: 'interview_tech_master',
    description: 'Achieve a score of 80% or higher in a Technical Mock Interview.',
    category: 'Interviews',
    icon: '🎤',
    rarity: 'Epic',
    points: 200,
    criteria: { type: 'interview_score_master', threshold: 1, minScore: 80, difficulty: 'technical' }
  },
  {
    name: 'HR Interview Master',
    slug: 'interview_hr_master',
    description: 'Score 80% or higher in an HR & Behavioral Mock Interview session.',
    category: 'Interviews',
    icon: '🎤',
    rarity: 'Epic',
    points: 200,
    criteria: { type: 'interview_score_master', threshold: 1, minScore: 80, difficulty: 'hr' }
  },

  // 5. RESUME
  {
    name: 'First Resume Analyzed',
    slug: 'resume_first_upload',
    description: 'Upload and parse your resume with the AI Resume Analyzer.',
    category: 'Resume',
    icon: '📄',
    rarity: 'Common',
    points: 30,
    criteria: { type: 'resume_uploaded', threshold: 1 }
  },
  {
    name: 'Resume Score 70+',
    slug: 'resume_score_70',
    description: 'Achieve an ATS audit score of 70 or higher on your verified resume.',
    category: 'Resume',
    icon: '📄',
    rarity: 'Common',
    points: 50,
    criteria: { type: 'resume_score', threshold: 1, minScore: 70 }
  },
  {
    name: 'Resume Score 80+',
    slug: 'resume_score_80',
    description: 'Attain an ATS audit score of 80 or higher with strong keyword density.',
    category: 'Resume',
    icon: '📄',
    rarity: 'Rare',
    points: 120,
    criteria: { type: 'resume_score', threshold: 1, minScore: 80 }
  },
  {
    name: 'Resume Score 90+',
    slug: 'resume_score_90',
    description: 'Surpass a 90+ ATS readiness rating with tailored skills and quantified impacts.',
    category: 'Resume',
    icon: '📄',
    rarity: 'Epic',
    points: 250,
    criteria: { type: 'resume_score', threshold: 1, minScore: 90 }
  },
  {
    name: 'Resume Master',
    slug: 'resume_master_95',
    description: 'Perfection: Reach a stellar 95+ score on the AI Resume Analyzer.',
    category: 'Resume',
    icon: '📄',
    rarity: 'Legendary',
    points: 400,
    criteria: { type: 'resume_score', threshold: 1, minScore: 95 }
  },

  // 6. CONTESTS
  {
    name: 'First Contest',
    slug: 'contest_first_attempt',
    description: 'Register and enter your first proctored coding contest.',
    category: 'Contests',
    icon: '🏆',
    rarity: 'Common',
    points: 40,
    criteria: { type: 'contest_participated', threshold: 1 }
  },
  {
    name: 'Contest Completed',
    slug: 'contest_completed',
    description: 'Submit all contest problems and finish without disqualification.',
    category: 'Contests',
    icon: '🏆',
    rarity: 'Common',
    points: 80,
    criteria: { type: 'contest_completed', threshold: 1 }
  },
  {
    name: 'Top 10 Contestant',
    slug: 'contest_top10',
    description: 'Finish in the Top 10 on the official contest leaderboard.',
    category: 'Contests',
    icon: '🏆',
    rarity: 'Rare',
    points: 200,
    criteria: { type: 'contest_top10', threshold: 1 }
  },
  {
    name: 'Top 3 Podium',
    slug: 'contest_top3',
    description: 'Earn a podium finish in the Top 3 of a CampusBridge competitive contest.',
    category: 'Contests',
    icon: '🥈',
    rarity: 'Epic',
    points: 350,
    criteria: { type: 'contest_top3', threshold: 1 }
  },
  {
    name: 'Contest Winner',
    slug: 'contest_winner',
    description: 'Clinch 1st place and victory on the competitive contest leaderboard.',
    category: 'Contests',
    icon: '🥇',
    rarity: 'Legendary',
    points: 600,
    criteria: { type: 'contest_winner', threshold: 1 }
  },

  // 7. LEARNING
  {
    name: 'First Roadmap Step',
    slug: 'learning_first_step',
    description: 'Check off your first study milestone on your personalized learning roadmap.',
    category: 'Learning',
    icon: '📚',
    rarity: 'Common',
    points: 25,
    criteria: { type: 'learning_modules_completed', threshold: 1 }
  },
  {
    name: '10 Learning Modules Completed',
    slug: 'learning_10_modules',
    description: 'Complete 10 roadmap or lab practice learning modules.',
    category: 'Learning',
    icon: '📚',
    rarity: 'Common',
    points: 75,
    criteria: { type: 'learning_modules_completed', threshold: 10 }
  },
  {
    name: '50 Learning Modules Completed',
    slug: 'learning_50_modules',
    description: 'Reach 50 completed curriculum modules across CSE & placement topics.',
    category: 'Learning',
    icon: '📚',
    rarity: 'Rare',
    points: 200,
    criteria: { type: 'learning_modules_completed', threshold: 50 }
  },
  {
    name: 'First Roadmap Completed',
    slug: 'learning_roadmap_completed',
    description: 'Complete every single step of a designated career track roadmap.',
    category: 'Learning',
    icon: '📚',
    rarity: 'Rare',
    points: 250,
    criteria: { type: 'roadmap_completed', threshold: 1 }
  },
  {
    name: 'Skill Master',
    slug: 'learning_skill_master',
    description: 'Demonstrate proficiency across 5 or more verified technical skills.',
    category: 'Learning',
    icon: '📚',
    rarity: 'Epic',
    points: 300,
    criteria: { type: 'skill_master', threshold: 5 }
  },

  // 8. PLACEMENT
  {
    name: 'First Job Application',
    slug: 'placement_first_app',
    description: 'Apply for your first campus recruitment drive or verified job listing.',
    category: 'Placement',
    icon: '💼',
    rarity: 'Common',
    points: 30,
    criteria: { type: 'job_applications', threshold: 1 }
  },
  {
    name: '10 Applications Submitted',
    slug: 'placement_10_apps',
    description: 'Actively pursue career opportunities by applying to 10 matching companies.',
    category: 'Placement',
    icon: '💼',
    rarity: 'Common',
    points: 80,
    criteria: { type: 'job_applications', threshold: 10 }
  },
  {
    name: 'First Shortlist',
    slug: 'placement_first_shortlist',
    description: 'Earn your first company drive shortlist or advance past screening rounds.',
    category: 'Placement',
    icon: '💼',
    rarity: 'Rare',
    points: 150,
    criteria: { type: 'job_shortlisted', threshold: 1 }
  },
  {
    name: 'First Interview Call',
    slug: 'placement_first_interview_call',
    description: 'Receive an official interview call or technical round invite.',
    category: 'Placement',
    icon: '💼',
    rarity: 'Rare',
    points: 200,
    criteria: { type: 'job_interviewing', threshold: 1 }
  },
  {
    name: 'First Job Selection',
    slug: 'placement_first_selection',
    description: 'Receive an official placement offer from a recruitment drive.',
    category: 'Placement',
    icon: '🎉',
    rarity: 'Epic',
    points: 400,
    criteria: { type: 'job_selected', threshold: 1 }
  },
  {
    name: 'Campus Placement Achieved',
    slug: 'placement_final_offer',
    description: 'Celebrate placement success and secure your graduate employment offer!',
    category: 'Placement',
    icon: '🎉',
    rarity: 'Legendary',
    points: 600,
    criteria: { type: 'job_selected', threshold: 1 }
  },

  // 9. ACADEMIC (Generated strictly from AcademicRecord system)
  {
    name: 'Semester Completed',
    slug: 'academic_semester_completed',
    description: 'Officially finish and publish evaluated marks for an academic semester.',
    category: 'Academic',
    icon: '🎓',
    rarity: 'Common',
    points: 50,
    criteria: { type: 'semester_completed', threshold: 1 }
  },
  {
    name: 'SGPA 8+',
    slug: 'academic_sgpa_8',
    description: 'Achieve an SGPA of 8.0 or higher in an academic semester evaluation.',
    category: 'Academic',
    icon: '🎓',
    rarity: 'Common',
    points: 100,
    criteria: { type: 'academic_sgpa', threshold: 1, minScore: 8.0 }
  },
  {
    name: 'SGPA 9+',
    slug: 'academic_sgpa_9',
    description: 'Attain academic distinction with an outstanding SGPA of 9.0 or above.',
    category: 'Academic',
    icon: '🎓',
    rarity: 'Rare',
    points: 200,
    criteria: { type: 'academic_sgpa', threshold: 1, minScore: 9.0 }
  },
  {
    name: 'CGPA 8+',
    slug: 'academic_cgpa_8',
    description: 'Maintain a cumulative CGPA of 8.0 or higher across university examinations.',
    category: 'Academic',
    icon: '🎓',
    rarity: 'Rare',
    points: 250,
    criteria: { type: 'academic_cgpa', threshold: 1, minScore: 8.0 }
  },
  {
    name: 'CGPA 9+',
    slug: 'academic_cgpa_9',
    description: 'University Gold Medal tier: Maintain an overall CGPA of 9.0 or higher.',
    category: 'Academic',
    icon: '🎓',
    rarity: 'Epic',
    points: 450,
    criteria: { type: 'academic_cgpa', threshold: 1, minScore: 9.0 }
  },

  // 10. COMMUNITY
  {
    name: 'First Community Discussion',
    slug: 'community_first_post',
    description: 'Start a collaborative discussion or share learning resources with peers.',
    category: 'Community',
    icon: '💬',
    rarity: 'Common',
    points: 25,
    criteria: { type: 'community_posts', threshold: 1 }
  },
  {
    name: 'Peer Contributor',
    slug: 'community_peer_contributor',
    description: 'Actively help classmates by contributing 5 comments or replies in forums.',
    category: 'Community',
    icon: '🤝',
    rarity: 'Common',
    points: 60,
    criteria: { type: 'community_comments', threshold: 5 }
  },
  {
    name: 'Community Mentor',
    slug: 'community_mentor',
    description: 'Resolve peer doubts and contribute 15 helpful answers in technical discussions.',
    category: 'Community',
    icon: '🌟',
    rarity: 'Rare',
    points: 150,
    criteria: { type: 'community_comments', threshold: 15 }
  }
];

/**
 * Ensure default achievement definitions exist in DB.
 */
async function seedAchievementDefinitions() {
  try {
    for (const def of SEED_DEFINITIONS) {
      await AchievementDefinition.findOneAndUpdate(
        { slug: def.slug },
        { $setOnInsert: def },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error('Error seeding achievement definitions:', err);
  }
}

/**
 * Helper to compute date string YYYY-MM-DD
 */
function toLocalDateStr(dateObj) {
  const d = new Date(dateObj);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Calculate streak stats from submission dates
 */
function calculateStreaks(dateStrings) {
  if (!dateStrings || dateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const uniqueSortedDates = Array.from(new Set(dateStrings)).sort();

  let longest = 0;
  let run = 0;
  let prevDate = null;

  for (const dateStr of uniqueSortedDates) {
    const curDate = new Date(dateStr);
    if (!prevDate) {
      run = 1;
    } else {
      const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        run++;
      } else if (diffDays > 1) {
        run = 1;
      }
    }
    if (run > longest) longest = run;
    prevDate = curDate;
  }

  // Calculate current streak relative to today/yesterday
  const todayStr = toLocalDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  let current = 0;
  const dateSet = new Set(uniqueSortedDates);

  if (dateSet.has(todayStr)) {
    let check = new Date();
    while (dateSet.has(toLocalDateStr(check))) {
      current++;
      check.setDate(check.getDate() - 1);
    }
  } else if (dateSet.has(yesterdayStr)) {
    let check = new Date(yesterday);
    while (dateSet.has(toLocalDateStr(check))) {
      current++;
      check.setDate(check.getDate() - 1);
    }
  }

  return { currentStreak: current, longestStreak: longest };
}

/**
 * Main Evaluation Engine:
 * Queries genuine user data and computes / unlocks achievements.
 * Also emits notifications for newly unlocked achievements.
 */
async function evaluateStudentAchievements(studentId, io = null) {
  await seedAchievementDefinitions();

  const user = await User.findById(studentId);
  if (!user) throw new Error('Student not found');

  // 1. Gather real metrics from database
  // A. Submissions
  const acceptedSubmissions = await Submission.find({
    user: studentId,
    status: 'Accepted'
  }).populate('question', 'difficulty title');

  const solvedQuestionMap = new Map();
  const submissionDates = [];

  for (const sub of acceptedSubmissions) {
    if (sub.createdAt) {
      submissionDates.push(toLocalDateStr(sub.createdAt));
    }
    if (sub.question && sub.question._id) {
      const qId = sub.question._id.toString();
      if (!solvedQuestionMap.has(qId)) {
        solvedQuestionMap.set(qId, sub.question.difficulty || 'Medium');
      }
    }
  }

  const distinctSolvedCount = solvedQuestionMap.size;
  let easySolved = 0;
  let mediumSolved = 0;
  let hardSolved = 0;

  for (const diff of solvedQuestionMap.values()) {
    const dLower = String(diff).toLowerCase();
    if (dLower === 'easy') easySolved++;
    else if (dLower === 'hard') hardSolved++;
    else mediumSolved++;
  }

  // Combine platform stats if any
  const externalSolved = (user.leetcodeStats?.totalSolved || 0) +
    (user.codeforcesStats?.solvedCount || 0) +
    (user.codechefStats?.solvedCount || 0) +
    (user.hackerrankStats?.solvedCount || 0);

  const totalEffectiveSolved = distinctSolvedCount + externalSolved;

  const streakStats = calculateStreaks(submissionDates);
  // Guarantee consistency with any active streak from daily logins/activity
  const currentStreak = Math.max(streakStats.currentStreak, user.loginCount > 0 && totalEffectiveSolved > 0 ? 1 : 0);
  const longestStreak = Math.max(streakStats.longestStreak, currentStreak);

  // B. Projects
  const studentProjects = await Project.find({ student: studentId });
  const projectsCreated = studentProjects.length;
  const projectsSubmitted = studentProjects.filter(p => ['submitted', 'approved', 'under_review'].includes(p.status)).length;
  const projectsApproved = studentProjects.filter(p => p.status === 'approved').length;
  const outstandingProjects = studentProjects.filter(p => (p.grade >= 90) || (p.leadStudentGrade >= 90)).length;
  const totalCommits = studentProjects.reduce((acc, p) => acc + (p.versionHistory?.length || 0), 0);
  const reposLinked = studentProjects.filter(p => p.repositoryUrl && p.repositoryUrl.trim().length > 3).length;

  // C. GitHub
  const githubConnected = Boolean(user.githubUsername && user.githubUsername.trim().length > 0);
  const openSourceVerified = githubConnected && (reposLinked > 0 || totalCommits >= 5);

  // D. Mock Interviews
  const completedInterviews = await MockInterview.find({
    user: studentId,
    status: 'completed'
  });
  const mockInterviewsCount = completedInterviews.length;
  const techMastersCount = completedInterviews.filter(i => {
    const role = (i.jobRole || '').toLowerCase();
    const isTech = !role.includes('hr') && i.technology !== 'HR';
    return isTech && (i.overallScore >= 80);
  }).length;
  const hrMastersCount = completedInterviews.filter(i => {
    const role = (i.jobRole || '').toLowerCase();
    const isHR = role.includes('hr') || i.technology === 'HR';
    return isHR && (i.overallScore >= 80);
  }).length;

  // E. Resumes
  const resumes = await Resume.find({ user: studentId });
  const resumeCount = resumes.length;
  const maxResumeScore = resumes.reduce((max, r) => Math.max(max, r.score || 0), 0);

  // F. Contests
  const finishedContests = await ContestAttempt.find({
    user: studentId,
    isFinished: true,
    isDisqualified: false
  });
  const contestCount = finishedContests.length;
  // High scoring contest counts
  const contestTopScores = finishedContests.filter(c => c.score >= 80).length;

  // G. Learning
  const userRoadmap = await Roadmap.findOne({ user: studentId });
  let completedRoadmapSteps = 0;
  let roadmapCompleted = false;
  if (userRoadmap && Array.isArray(userRoadmap.steps)) {
    completedRoadmapSteps = userRoadmap.steps.filter(s => s.status === 'completed').length;
    roadmapCompleted = userRoadmap.steps.length > 0 && completedRoadmapSteps === userRoadmap.steps.length;
  }
  const skillsCount = Array.isArray(user.skills) ? user.skills.length : 0;

  // H. Placements & Applications
  const appliedJobs = Array.isArray(user.appliedJobs) ? user.appliedJobs : [];
  const applicationsCount = appliedJobs.length;
  const shortlistsCount = appliedJobs.filter(j => ['under_review', 'under review', 'interviewing', 'offered'].includes(j.status)).length;
  const interviewCallsCount = appliedJobs.filter(j => ['interviewing', 'offered'].includes(j.status)).length;
  const jobSelectionsCount = appliedJobs.filter(j => j.status === 'offered').length;

  // I. Academics
  const academicRecord = await AcademicRecord.findOne({ student: studentId });
  let publishedSemesters = 0;
  let highestSgpa = Math.max(
    user.sgpaSem1 || 0, user.sgpaSem2 || 0, user.sgpaSem3 || 0, user.sgpaSem4 || 0,
    user.sgpaSem5 || 0, user.sgpaSem6 || 0, user.sgpaSem7 || 0, user.sgpaSem8 || 0
  );
  let overallCgpa = user.cgpa || 0;

  if (academicRecord) {
    if (academicRecord.overallCgpa) overallCgpa = Math.max(overallCgpa, academicRecord.overallCgpa);
    if (Array.isArray(academicRecord.semesters)) {
      const pubSems = academicRecord.semesters.filter(s => s.isPublished);
      publishedSemesters = pubSems.length;
      pubSems.forEach(s => {
        if (s.sgpa && s.sgpa > highestSgpa) highestSgpa = s.sgpa;
      });
    }
  }

  // J. Community
  const userDiscussions = await Discussion.find({ author: studentId });
  const discussionCount = userDiscussions.length;
  // Count comments
  const discussionsWithComments = await Discussion.find({ 'comments.author': studentId });
  let commentsCount = 0;
  discussionsWithComments.forEach(d => {
    if (Array.isArray(d.comments)) {
      commentsCount += d.comments.filter(c => c.author && c.author.toString() === studentId.toString()).length;
    }
  });

  // 2. Fetch all definitions and evaluate against metrics
  const definitions = await AchievementDefinition.find({ isActive: true });
  const newlyUnlocked = [];

  for (const def of definitions) {
    let current = 0;
    let target = def.criteria?.threshold || 1;
    let verifiedSource = '';
    const crit = def.criteria || {};

    switch (crit.type) {
      case 'problems_solved':
        current = totalEffectiveSolved;
        verifiedSource = 'submissions';
        break;
      case 'coding_streak':
        current = longestStreak;
        verifiedSource = 'daily_coding_streak';
        break;
      case 'problems_by_difficulty':
        if (crit.difficulty === 'Easy') current = easySolved;
        else if (crit.difficulty === 'Hard') current = hardSolved;
        else current = mediumSolved;
        verifiedSource = 'submissions_difficulty';
        break;
      case 'projects_created':
        current = projectsCreated;
        verifiedSource = 'project_studio';
        break;
      case 'projects_submitted':
        current = projectsSubmitted;
        verifiedSource = 'project_studio';
        break;
      case 'projects_approved':
        current = projectsApproved;
        verifiedSource = 'faculty_evaluations';
        break;
      case 'outstanding_project':
        current = outstandingProjects;
        verifiedSource = 'project_grade';
        break;
      case 'github_connected':
        current = githubConnected ? 1 : 0;
        verifiedSource = 'github_verification';
        break;
      case 'github_repo_linked':
        current = reposLinked;
        verifiedSource = 'project_repo';
        break;
      case 'github_sync':
      case 'github_commits':
        current = totalCommits;
        verifiedSource = 'project_version_history';
        break;
      case 'github_open_source':
        current = openSourceVerified ? 1 : 0;
        verifiedSource = 'github_contributions';
        break;
      case 'mock_interviews_completed':
        current = mockInterviewsCount;
        verifiedSource = 'mock_interviews';
        break;
      case 'interview_score_master':
        if (crit.difficulty === 'hr') current = hrMastersCount;
        else current = techMastersCount;
        verifiedSource = 'interview_scores';
        break;
      case 'resume_uploaded':
        current = resumeCount;
        verifiedSource = 'resume_analyzer';
        break;
      case 'resume_score':
        current = maxResumeScore;
        target = crit.minScore || 70;
        verifiedSource = 'resume_ats_score';
        break;
      case 'contest_participated':
      case 'contest_completed':
        current = contestCount;
        verifiedSource = 'contest_attempts';
        break;
      case 'contest_top10':
      case 'contest_top3':
      case 'contest_winner':
        current = contestTopScores;
        verifiedSource = 'contest_rankings';
        break;
      case 'learning_modules_completed':
        current = completedRoadmapSteps;
        verifiedSource = 'roadmap_steps';
        break;
      case 'roadmap_completed':
        current = roadmapCompleted ? 1 : 0;
        verifiedSource = 'career_roadmaps';
        break;
      case 'skill_master':
        current = skillsCount;
        verifiedSource = 'verified_skills';
        break;
      case 'job_applications':
        current = applicationsCount;
        verifiedSource = 'campus_placements';
        break;
      case 'job_shortlisted':
        current = shortlistsCount;
        verifiedSource = 'placement_drives';
        break;
      case 'job_interviewing':
        current = interviewCallsCount;
        verifiedSource = 'placement_drives';
        break;
      case 'job_selected':
        current = jobSelectionsCount;
        verifiedSource = 'placement_offers';
        break;
      case 'semester_completed':
        current = publishedSemesters;
        verifiedSource = 'academic_records';
        break;
      case 'academic_sgpa':
        current = highestSgpa;
        target = crit.minScore || 8.0;
        verifiedSource = 'academic_sgpa_marks';
        break;
      case 'academic_cgpa':
        current = overallCgpa;
        target = crit.minScore || 8.0;
        verifiedSource = 'academic_cgpa_marks';
        break;
      case 'community_posts':
        current = discussionCount;
        verifiedSource = 'discussion_forum';
        break;
      case 'community_comments':
        current = commentsCount;
        verifiedSource = 'discussion_answers';
        break;
      default:
        current = 0;
    }

    const isUnlocked = current >= target && target > 0;
    const percentage = Math.min(100, Math.round((current / (target || 1)) * 100));

    let detailStr = '';
    if (def.category === 'Coding' && crit.type === 'coding_streak') {
      detailStr = `${Math.min(current, target)} / ${target} Days`;
    } else if (def.category === 'Resume' && crit.type === 'resume_score') {
      detailStr = `Score: ${current} / ${target}`;
    } else if (def.category === 'Academic' && (crit.type === 'academic_sgpa' || crit.type === 'academic_cgpa')) {
      detailStr = `Grade: ${current.toFixed(2)} / ${target.toFixed(1)}`;
    } else {
      detailStr = `${Math.min(current, target)} / ${target}`;
    }

    let studentAch = await StudentAchievement.findOne({
      student: studentId,
      achievement: def._id
    });

    if (!studentAch) {
      studentAch = new StudentAchievement({
        student: studentId,
        achievement: def._id,
        isUnlocked,
        earnedAt: isUnlocked ? new Date() : null,
        progress: {
          current,
          target,
          percentage,
          detail: detailStr
        },
        metadata: {
          verifiedSource,
          metricValue: current
        }
      });

      await studentAch.save();

      if (isUnlocked) {
        newlyUnlocked.push(def);
        // Create Notification
        await createAchievementNotification(studentId, def, io);
      }
    } else {
      const wasUnlockedBefore = studentAch.isUnlocked;
      studentAch.progress = {
        current,
        target,
        percentage,
        detail: detailStr
      };
      studentAch.metadata = {
        verifiedSource,
        metricValue: current
      };

      if (!wasUnlockedBefore && isUnlocked) {
        studentAch.isUnlocked = true;
        studentAch.earnedAt = new Date();
        await studentAch.save();

        newlyUnlocked.push(def);
        // Create Notification
        await createAchievementNotification(studentId, def, io);
      } else {
        await studentAch.save();
      }
    }
  }

  // 3. Compute Placement Readiness Score based on real data
  const placementReadiness = calculatePlacementReadiness({
    academicCgpa: overallCgpa,
    solvedCount: totalEffectiveSolved,
    projectsApproved,
    projectsCreated,
    resumeScore: maxResumeScore,
    mockInterviewsCount,
    completedRoadmapSteps,
    applicationsCount
  });

  return {
    newlyUnlocked,
    stats: {
      totalAchievementsCount: definitions.length,
      currentStreak,
      longestStreak,
      totalProblemsSolved: totalEffectiveSolved,
      projectsApproved,
      contestsCompleted: contestCount,
      interviewsCompleted: mockInterviewsCount,
      resumeScore: maxResumeScore,
      placementReadiness
    }
  };
}

/**
 * Creates notification via existing Notification model when an achievement unlocks
 */
async function createAchievementNotification(studentId, def, io) {
  try {
    const note = await Notification.create({
      user: studentId,
      type: 'achievement_unlocked',
      message: `🎉 Achievement Unlocked: ${def.name}! ${def.description}`,
      metadata: {
        achievementId: def._id,
        badgeName: def.name,
        badgeIcon: def.icon
      }
    });

    if (io) {
      io.to(studentId.toString()).emit('notification', note);
      io.emit('achievement_unlocked', {
        studentId,
        badgeName: def.name,
        badgeIcon: def.icon,
        rarity: def.rarity
      });
    }
  } catch (err) {
    console.warn('Failed to send achievement notification:', err.message);
  }
}

/**
 * Multi-factor Placement Readiness calculation
 */
function calculatePlacementReadiness({
  academicCgpa = 0,
  solvedCount = 0,
  projectsApproved = 0,
  projectsCreated = 0,
  resumeScore = 0,
  mockInterviewsCount = 0,
  completedRoadmapSteps = 0,
  applicationsCount = 0
}) {
  // 1. Academics (Scale 0-10 to 0-100)
  const academicsScore = Math.min(100, Math.round((academicCgpa / 10) * 100)) || 50;

  // 2. Coding (Target 100 problems = 100%)
  const codingScore = Math.min(100, Math.round((solvedCount / 75) * 100));

  // 3. Projects (Target 2 completed or 3 created = 100%)
  const projectsScore = Math.min(100, Math.round(((projectsApproved * 40) + (projectsCreated * 20))));

  // 4. Resume Score (Target 85+ score)
  const resumeMetric = Math.min(100, Math.round((resumeScore / 90) * 100));

  // 5. Interviews (Target 3 completed mock interviews)
  const interviewScore = Math.min(100, Math.round((mockInterviewsCount / 3) * 100));

  // Weights: Academics 20%, Coding 25%, Projects 25%, Resume 15%, Interviews 15%
  const overall = Math.round(
    (academicsScore * 0.20) +
    (codingScore * 0.25) +
    (projectsScore * 0.25) +
    (resumeMetric * 0.15) +
    (interviewScore * 0.15)
  );

  // Identify strengths & biggest areas of improvement
  const pillars = [
    { area: 'Academics', score: academicsScore },
    { area: 'Coding & Algorithms', score: codingScore },
    { area: 'Projects & Studio', score: projectsScore },
    { area: 'Resume ATS', score: resumeMetric },
    { area: 'Mock Interviews', score: interviewScore }
  ];

  pillars.sort((a, b) => b.score - a.score);
  const strongest = pillars[0];
  const weakest = pillars[pillars.length - 1];

  let recommendation = '';
  if (weakest.area === 'Mock Interviews') {
    recommendation = 'Practice an AI Mock Interview today to sharpen your verbal communication and technical problem presentation.';
  } else if (weakest.area === 'Coding & Algorithms') {
    recommendation = 'Solve 3 Medium DSA problems this week in your focus area (Trees, Arrays, or Dynamic Programming).';
  } else if (weakest.area === 'Projects & Studio') {
    recommendation = 'Complete and submit your active Project Studio repository for faculty evaluation to boost your portfolio.';
  } else if (weakest.area === 'Resume ATS') {
    recommendation = 'Run your CV through Resume Analyzer and add quantified achievement metrics to cross the 85+ score threshold.';
  } else {
    recommendation = 'Maintain regular study consistency to keep your semester SGPA and CGPA in the distinction bracket.';
  }

  return {
    overallPercentage: Math.max(15, Math.min(100, overall)),
    academics: academicsScore,
    coding: codingScore,
    projects: projectsScore,
    resume: resumeMetric,
    interviews: interviewScore,
    strongestArea: strongest.area,
    weakestArea: weakest.area,
    recommendation
  };
}

module.exports = {
  seedAchievementDefinitions,
  evaluateStudentAchievements,
  calculateStreaks,
  calculatePlacementReadiness
};
