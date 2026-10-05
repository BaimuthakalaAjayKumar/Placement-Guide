const AchievementDefinition = require('../models/AchievementDefinition');
const StudentAchievement = require('../models/StudentAchievement');
const {
  evaluateStudentAchievements,
  seedAchievementDefinitions
} = require('../services/achievementService');

/**
 * @desc    Get all achievement definitions
 * @route   GET /api/achievements
 * @access  Private
 */
exports.getAllAchievements = async (req, res) => {
  try {
    await seedAchievementDefinitions();
    const achievements = await AchievementDefinition.find({ isActive: true }).sort({ category: 1, points: 1 });
    res.status(200).json({ success: true, count: achievements.length, data: achievements });
  } catch (err) {
    console.error('Error fetching achievement definitions:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
};

/**
 * @desc    Get logged in student's achievements and progress
 * @route   GET /api/achievements/my
 * @access  Private
 */
exports.getMyAchievements = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;
    const io = req.app.get('socketio');

    // Run evaluation to keep achievements accurate with live activity
    const evaluation = await evaluateStudentAchievements(studentId, io);

    // Fetch all student achievements with definition populated
    const studentAchs = await StudentAchievement.find({ student: studentId })
      .populate('achievement')
      .lean();

    let totalPoints = 0;
    let unlockedCount = 0;

    const list = studentAchs
      .filter(sa => sa.achievement && sa.achievement.isActive)
      .map(sa => {
        const def = sa.achievement;
        if (sa.isUnlocked) {
          totalPoints += def.points || 0;
          unlockedCount++;
        }
        return {
          _id: sa._id,
          achievementId: def._id,
          name: def.name,
          slug: def.slug,
          description: def.description,
          category: def.category,
          icon: def.icon,
          rarity: def.rarity,
          points: def.points,
          criteria: def.criteria,
          isUnlocked: sa.isUnlocked,
          earnedAt: sa.earnedAt,
          progress: sa.progress,
          metadata: sa.metadata
        };
      });

    // Group by category summary
    const categories = [
      'Coding', 'Projects', 'Learning', 'Interviews', 'Resume',
      'Contests', 'Placement', 'GitHub', 'Academic', 'Community'
    ].map(cat => {
      const inCat = list.filter(item => item.category === cat);
      return {
        name: cat,
        total: inCat.length,
        unlocked: inCat.filter(i => i.isUnlocked).length
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalBadges: list.length,
        unlockedCount,
        totalPoints,
        currentStreak: evaluation.stats.currentStreak,
        longestStreak: evaluation.stats.longestStreak,
        totalProblemsSolved: evaluation.stats.totalProblemsSolved,
        projectsApproved: evaluation.stats.projectsApproved,
        contestsCompleted: evaluation.stats.contestsCompleted,
        interviewsCompleted: evaluation.stats.interviewsCompleted,
        resumeScore: evaluation.stats.resumeScore,
        placementReadiness: evaluation.stats.placementReadiness,
        categories,
        achievements: list
      }
    });
  } catch (err) {
    console.error('Error fetching student achievements:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve achievements' });
  }
};

/**
 * @desc    Force re-evaluate student achievements
 * @route   POST /api/achievements/evaluate
 * @access  Private
 */
exports.evaluateMyAchievements = async (req, res) => {
  try {
    const studentId = req.user._id || req.user.id;
    const io = req.app.get('socketio');

    const result = await evaluateStudentAchievements(studentId, io);

    res.status(200).json({
      success: true,
      message: 'Achievements successfully synchronized with platform records',
      newlyUnlocked: result.newlyUnlocked,
      stats: result.stats
    });
  } catch (err) {
    console.error('Error evaluating achievements:', err);
    res.status(500).json({ success: false, error: 'Failed to evaluate achievements' });
  }
};
