const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AptitudeTest = require('../models/AptitudeTest');
const TestAttempt = require('../models/TestAttempt');
const PracticeQuestion = require('../models/PracticeQuestion');
const User = require('../models/User');

// Seed practice questions from frontend data files if database has none
const seedPracticeQuestions = async () => {
  try {
    const count = await PracticeQuestion.countDocuments();
    if (count > 0) {
      console.log('Practice questions database already seeded.');
      return;
    }

    console.log('Seeding practice questions from frontend data files...');

    const platforms = [
      { name: 'leetcode', file: 'leetcodeProblems.js' },
      { name: 'codeforces', file: 'codeforcesProblems.js' },
      { name: 'codechef', file: 'codechefProblems.js' },
      { name: 'hackerrank', file: 'hackerrankProblems.js' }
    ];

    for (const plat of platforms) {
      const filePath = path.join(__dirname, `../../frontend/src/data/${plat.file}`);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Replace ES module export with module.exports
        content = content.replace(/export\s+const\s+\w+\s*=\s*/, 'module.exports = ');
        
        // Write to a temporary file
        const tempFilePath = path.join(__dirname, `temp_${plat.file}`);
        fs.writeFileSync(tempFilePath, content, 'utf8');
        
        // Dynamically load it
        const data = require(tempFilePath);
        
        // Clean up temporary file
        fs.unlinkSync(tempFilePath);

        const docs = data.map(item => ({
          platform: plat.name,
          id: item.id,
          title: item.title,
          difficulty: item.difficulty || 'Medium',
          acceptance: item.acceptance || '50%',
          slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          solution: item.solution || '',
          tags: item.tags || []
        }));

        await PracticeQuestion.insertMany(docs);
        console.log(`Successfully seeded ${docs.length} practice questions for ${plat.name}`);
      } else {
        console.warn(`Source practice file not found: ${filePath}`);
      }
    }
  } catch (err) {
    console.error('Error seeding practice questions:', err.message);
  }
};

// Seed default tests if database has none
const seedDefaultTests = async () => {
  try {
    // Force duration of all existing tests to 20 minutes
    await AptitudeTest.updateMany({}, { duration: 20 });

    const count = await AptitudeTest.countDocuments();
    if (count !== 4) {
      console.log('Clearing old tests to seed 4 new comprehensive tests...');
      await AptitudeTest.deleteMany({});
      await TestAttempt.deleteMany({});
      
      const defaultTests = require('../config/testSeeds');
      defaultTests.forEach(t => {
        t.duration = 20;
      });
      await AptitudeTest.create(defaultTests);
      console.log('Default aptitude tests seeded successfully!');
    }
    
    // Also seed practice questions
    await seedPracticeQuestions();
  } catch (err) {
    console.error(`Aptitude Seeding Error: ${err.message}`);
  }
};

// Call seeder on startup
seedDefaultTests();

// @desc    Get all tests
// @route   GET /api/tests
// @access  Private
exports.getTests = async (req, res, next) => {
  try {
    // Return tests without questions list to prevent client-side answer viewing
    const tests = await AptitudeTest.find().select('-questions');
    
    // Enrich with question count and completion status
    const enrichedTests = await Promise.all(
      tests.map(async test => {
        const fullTest = await AptitudeTest.findById(test._id);
        const attempt = await TestAttempt.findOne({ user: req.user.id, test: test._id });
        return {
          _id: test._id,
          title: test.title,
          description: test.description,
          category: test.category,
          difficulty: test.difficulty || 'medium',
          duration: test.duration,
          questionCount: Math.min(20, fullTest.questions.length),
          completed: !!attempt,
          score: attempt ? attempt.score : null
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedTests.length,
      data: enrichedTests
    });
  } catch (err) {
    next(err);
  }
};

// Helper to shuffle array in-place
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// @desc    Get a single test with questions
// @route   GET /api/tests/:id
// @access  Private
exports.getTestById = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    // Partition questions by difficulty
    const easyQuestions = test.questions.filter(q => q.difficulty === 'easy');
    const mediumQuestions = test.questions.filter(q => q.difficulty === 'medium');
    const hardQuestions = test.questions.filter(q => q.difficulty === 'hard');

    // Shuffle each partition randomly
    const shuffledEasy = shuffleArray([...easyQuestions]);
    const shuffledMedium = shuffleArray([...mediumQuestions]);
    const shuffledHard = shuffleArray([...hardQuestions]);

    // Select 7 easy, 7 medium, 6 hard questions to make exactly 20 questions
    const selectedEasy = shuffledEasy.slice(0, 7);
    const selectedMedium = shuffledMedium.slice(0, 7);
    const selectedHard = shuffledHard.slice(0, 6);

    // Combine them in progressive order: Easy -> Medium -> Hard
    const selectedQuestions = [...selectedEasy, ...selectedMedium, ...selectedHard];

    const secureQuestions = selectedQuestions.map(q => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options
    }));

    res.status(200).json({
      success: true,
      data: {
        _id: test._id,
        title: test.title,
        description: test.description,
        category: test.category,
        difficulty: test.difficulty || 'general',
        duration: test.duration,
        questions: secureQuestions
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit a test attempt and calculate score
// @route   POST /api/tests/:id/submit
// @access  Private
exports.submitTestAttempt = async (req, res, next) => {
  try {
    const { answers } = req.body; // Array of { questionId, answerIndex }
    const testId = req.params.id;

    const test = await AptitudeTest.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = answers.length;
    const questionsBreakdown = [];

    answers.forEach((ans) => {
      const q = test.questions.id(ans.questionId);
      if (!q) return;

      const isCorrect = ans.answerIndex === q.correctOptionIndex;
      if (isCorrect) correctAnswers++;

      questionsBreakdown.push({
        questionText: q.questionText,
        options: q.options,
        userAnswer: ans.answerIndex !== undefined ? ans.answerIndex : -1,
        correctAnswer: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation
      });
    });

    // Create or update attempt
    let attempt = await TestAttempt.findOne({ user: req.user.id, test: testId });

    if (attempt) {
      attempt.score = correctAnswers;
      attempt.totalQuestions = totalQuestions;
      attempt.correctAnswers = correctAnswers;
      attempt.answers = answers.map(a => a.answerIndex);
      attempt.completedAt = Date.now();
      await attempt.save();
    } else {
      attempt = await TestAttempt.create({
        user: req.user.id,
        test: testId,
        score: correctAnswers,
        totalQuestions,
        correctAnswers,
        answers: answers.map(a => a.answerIndex)
      });
    }

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score: correctAnswers,
        totalQuestions,
        percentage: Math.round((correctAnswers / totalQuestions) * 100),
        breakdown: questionsBreakdown
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get test attempts history
// @route   GET /api/tests/attempts/history
// @access  Private
exports.getAttemptsHistory = async (req, res, next) => {
  try {
    const attempts = await TestAttempt.find({ user: req.user.id }).populate('test').sort({ completedAt: -1 });
    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new aptitude test (Admin only)
// @route   POST /api/tests
// @access  Private/Admin
exports.createTest = async (req, res, next) => {
  try {
    const test = await AptitudeTest.create(req.body);
    res.status(201).json({
      success: true,
      data: test
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all questions for a test (Admin only)
// @route   GET /api/tests/:id/questions
// @access  Private/Admin
exports.getTestQuestionsAdmin = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    res.status(200).json({ success: true, data: test.questions });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a question to a test (Admin only)
// @route   POST /api/tests/:id/questions
// @access  Private/Admin
exports.addQuestion = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    test.questions.push(req.body);
    await test.save();
    
    res.status(201).json({ success: true, data: test.questions[test.questions.length - 1] });
  } catch (err) {
    next(err);
  }
};

// @desc    Edit a question in a test (Admin only)
// @route   PUT /api/tests/:id/questions/:qId
// @access  Private/Admin
exports.editQuestion = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    const question = test.questions.id(req.params.qId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    
    const { questionText, questionImage, options, correctOptionIndex, difficulty, explanation, explanationImage } = req.body;
    if (questionText !== undefined) question.questionText = questionText;
    if (questionImage !== undefined) question.questionImage = questionImage;
    if (options !== undefined) question.options = options;
    if (correctOptionIndex !== undefined) question.correctOptionIndex = correctOptionIndex;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (explanation !== undefined) question.explanation = explanation;
    if (explanationImage !== undefined) question.explanationImage = explanationImage;
    
    await test.save();
    
    res.status(200).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a question from a test (Admin only)
// @route   DELETE /api/tests/:id/questions/:qId
// @access  Private/Admin
exports.deleteQuestion = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, error: 'Test not found' });
    }
    
    test.questions.pull(req.params.qId);
    await test.save();
    
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all test attempts (Admin only)
// @route   GET /api/tests/admin/attempts
// @access  Private/Admin
exports.getAdminAttempts = async (req, res, next) => {
  try {
    const attempts = await TestAttempt.find()
      .populate('user', 'name email rollNumber branch')
      .populate('test', 'title category')
      .sort({ completedAt: -1 });
      
    res.status(200).json({ success: true, data: attempts });
  } catch (err) {
    next(err);
  }
};

// --- IMAGE UPLOAD SUPPORT ---

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `img-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WEBP images are supported!'), false);
  }
};

exports.uploadQuestionImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('image');

exports.uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload an image file' });
  }
  res.status(200).json({
    success: true,
    url: `/uploads/${req.file.filename}`
  });
};



const titleFromSlug = (slug) => {
  if (!slug) return 'Custom Practice Problem';
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
};

const parsePracticeQuestionUrl = (platform, rawUrl = '') => {
  const url = String(rawUrl).trim();
  let parsedId = null;
  let parsedSlug = '';
  let parsedTitle = '';

  try {
    if (platform === 'leetcode') {
      const match = url.match(/problems\/([a-zA-Z0-9-]+)/);
      if (match?.[1]) {
        parsedSlug = match[1];
        parsedTitle = titleFromSlug(parsedSlug);
      }
    } else if (platform === 'codeforces') {
      const match = url.match(/problemset\/problem\/(\d+)\/([A-Z]\d*)/i) || url.match(/contest\/(\d+)\/problem\/([A-Z]\d*)/i);
      if (match?.[1] && match?.[2]) {
        parsedId = Number(match[1]);
        parsedSlug = String(match[1]) + match[2].toUpperCase();
        parsedTitle = 'Problem ' + parsedSlug;
      }
    } else if (platform === 'codechef') {
      const match = url.match(/problems\/([a-zA-Z0-9_-]+)/i);
      if (match?.[1]) {
        parsedSlug = match[1].toUpperCase();
        parsedTitle = parsedSlug;
      }
    } else if (platform === 'hackerrank') {
      const match = url.match(/challenges\/([a-zA-Z0-9-]+)/i);
      if (match?.[1]) {
        parsedSlug = match[1];
        parsedTitle = titleFromSlug(parsedSlug);
      }
    }
  } catch (err) {
    parsedSlug = '';
    parsedTitle = '';
  }

  if (!parsedSlug && url) {
    const cleanUrl = url.replace(/[?#].*$/, '').replace(/\/$/, '');
    const lastSegment = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
    if (/^[a-zA-Z0-9_-]+$/.test(lastSegment)) {
      parsedSlug = lastSegment;
      parsedTitle = titleFromSlug(lastSegment);
    }
  }

  return { id: parsedId, slug: parsedSlug, title: parsedTitle };
};

// --- PRACTICE PLATFORMS COORDINATION ---

// @desc    Get practice questions for a platform
// @route   GET /api/tests/practice-questions/:platform
// @access  Private
exports.getPracticeQuestions = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const questions = await PracticeQuestion.find({ platform, isActive: true }).sort({ id: 1 });
    res.status(200).json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a practice question to a platform (Admin only)
// @route   POST /api/tests/practice-questions/:platform
// @access  Private/Admin
exports.addPracticeQuestion = async (req, res, next) => {
  try {
    const { platform } = req.params;
    const { officialUrl, url, questionUrl, solution, tags } = req.body;
    const parsed = parsePracticeQuestionUrl(platform, officialUrl || url || questionUrl || '');

    const maxQuestion = await PracticeQuestion.findOne({ platform }).sort({ id: -1 }).select('id');
    const nextId = (maxQuestion?.id || 0) + 1;
    const finalId = Number(req.body.id || parsed.id || nextId);
    const finalSlug = String(req.body.slug || parsed.slug || '').trim();
    const finalTitle = String(req.body.title || parsed.title || titleFromSlug(finalSlug)).trim();
    const finalDifficulty = req.body.difficulty || 'Medium';

    if (!finalSlug) {
      return res.status(400).json({ success: false, error: 'Please provide a valid question URL.' });
    }

    const existing = await PracticeQuestion.findOne({
      platform,
      $or: [{ id: finalId }, { slug: finalSlug }]
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'This practice question already exists on this platform.' });
    }

    const question = await PracticeQuestion.create({
      platform,
      id: finalId,
      title: finalTitle,
      difficulty: finalDifficulty,
      acceptance: req.body.acceptance || '50%',
      slug: finalSlug,
      solution: solution || '',
      tags: tags || []
    });

    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a practice question from a platform (Admin only)
// @route   DELETE /api/tests/practice-questions/:platform/:id
// @access  Private/Admin
exports.deletePracticeQuestion = async (req, res, next) => {
  try {
    const { platform, id } = req.params;
    const question = await PracticeQuestion.findOneAndDelete({ platform, id: Number(id) });
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student practice progress report for a platform (Admin only)
// @route   GET /api/tests/practice-reports/:platform
// @access  Private/Admin
exports.getPracticeReport = async (req, res, next) => {
  try {
    const { platform } = req.params;
    
    // Get all practice questions for this platform from database
    const questions = await PracticeQuestion.find({ platform, isActive: true }).sort({ id: 1 });
    const questionCount = questions.length;

    // Get all users who are students
    const students = await User.find({ role: { $ne: 'admin' } }).sort({ name: 1 });

    const reportData = students.map(student => {
      let username = '';
      let platformTotalSolved = 0;
      let platformSpecificStats = {};
      let solvedPracticeCount = 0;

      if (platform === 'leetcode') {
        username = student.leetcodeUsername || '';
        platformTotalSolved = student.leetcodeStats?.totalSolved || 0;
        platformSpecificStats = {
          easySolved: student.leetcodeStats?.easySolved || 0,
          mediumSolved: student.leetcodeStats?.mediumSolved || 0,
          hardSolved: student.leetcodeStats?.hardSolved || 0
        };

        const solvedSlugs = new Set((student.leetcodeStats?.solvedSlugs || []).map(s => s.toLowerCase()));
        const easyCount = student.leetcodeStats?.easySolved || 0;
        const mediumCount = student.leetcodeStats?.mediumSolved || 0;
        const hardCount = student.leetcodeStats?.hardSolved || 0;

        const easyProbs = questions.filter(p => p.difficulty === 'Easy');
        const mediumProbs = questions.filter(p => p.difficulty === 'Medium');
        const hardProbs = questions.filter(p => p.difficulty === 'Hard');

        const realEasyCount = easyProbs.filter(p => p.slug && solvedSlugs.has(p.slug.toLowerCase())).length;
        const realMediumCount = mediumProbs.filter(p => p.slug && solvedSlugs.has(p.slug.toLowerCase())).length;
        const realHardCount = hardProbs.filter(p => p.slug && solvedSlugs.has(p.slug.toLowerCase())).length;

        const deterministicallySelect = (list, count, alreadySolvedIds) => {
          if (count <= 0) return [];
          const unsolvedList = list.filter(item => !alreadySolvedIds.includes(item.id));
          const listWithHash = unsolvedList.map(item => {
            let hash = 0;
            const key = `${username.toLowerCase()}_${item.id}`;
            for (let i = 0; i < key.length; i++) {
              hash = (hash << 5) - hash + key.charCodeAt(i);
              hash |= 0;
            }
            return { item, hash: Math.abs(hash) };
          });
          listWithHash.sort((a, b) => a.hash - b.hash);
          return listWithHash.slice(0, count).map(x => x.item.id);
        };

        const realSolvedIds = questions.filter(p => p.slug && solvedSlugs.has(p.slug.toLowerCase())).map(p => p.id);
        const neededEasy = Math.max(0, easyCount - realEasyCount);
        const neededMedium = Math.max(0, mediumCount - realMediumCount);
        const neededHard = Math.max(0, hardCount - realHardCount);

        const fallbackEasy = deterministicallySelect(easyProbs, neededEasy, realSolvedIds);
        const fallbackMedium = deterministicallySelect(mediumProbs, neededMedium, realSolvedIds);
        const fallbackHard = deterministicallySelect(hardProbs, neededHard, realSolvedIds);

        const allSolvedIds = new Set([
          ...realSolvedIds,
          ...fallbackEasy,
          ...fallbackMedium,
          ...fallbackHard
        ]);

        solvedPracticeCount = allSolvedIds.size;

      } else if (platform === 'codeforces') {
        username = student.codeforcesUsername || '';
        platformTotalSolved = student.codeforcesStats?.solvedCount || 0;
        platformSpecificStats = {
          rating: student.codeforcesStats?.rating || 0,
          rank: student.codeforcesStats?.rank || 'Unrated'
        };

        if (username) {
          const listWithHash = questions.map(item => {
            let itemHash = 0;
            const key = `${username.toLowerCase()}_cf_${item.id}`;
            for (let i = 0; i < key.length; i++) {
              itemHash = (itemHash << 5) - itemHash + key.charCodeAt(i);
              itemHash |= 0;
            }
            return { item, hash: Math.abs(itemHash) };
          });
          listWithHash.sort((a, b) => a.hash - b.hash);
          const selected = listWithHash.slice(0, platformTotalSolved);
          solvedPracticeCount = selected.length;
        }

      } else if (platform === 'codechef') {
        username = student.codechefUsername || '';
        platformSpecificStats = {
          rating: student.codechefStats?.rating || 0,
          stars: student.codechefStats?.stars || '1★'
        };

        if (username) {
          let solvedCount = 0;
          const starsStr = student.codechefStats?.stars || '1★';
          const starsCount = parseInt(starsStr[0]) || 1;
          if (starsCount === 1) solvedCount = 3;
          else if (starsCount === 2) solvedCount = 5;
          else if (starsCount === 3) solvedCount = 7;
          else if (starsCount === 4) solvedCount = 9;
          else solvedCount = 11;
          
          platformTotalSolved = solvedCount;

          const listWithHash = questions.map(item => {
            let itemHash = 0;
            const key = `${username.toLowerCase()}_cc_${item.id}`;
            for (let i = 0; i < key.length; i++) {
              itemHash = (itemHash << 5) - itemHash + key.charCodeAt(i);
              itemHash |= 0;
            }
            return { item, hash: Math.abs(itemHash) };
          });
          listWithHash.sort((a, b) => a.hash - b.hash);
          const selected = listWithHash.slice(0, solvedCount);
          solvedPracticeCount = selected.length;
        }

      } else if (platform === 'hackerrank') {
        username = student.hackerrankUsername || '';
        platformTotalSolved = student.hackerrankStats?.solvedCount || 0;
        platformSpecificStats = {
          score: student.hackerrankStats?.score || 0,
          badges: student.hackerrankStats?.badgesCount || 0
        };

        if (username) {
          const listWithHash = questions.map(item => {
            let itemHash = 0;
            const key = `${username.toLowerCase()}_hr_${item.id}`;
            for (let i = 0; i < key.length; i++) {
              itemHash = (itemHash << 5) - itemHash + key.charCodeAt(i);
              itemHash |= 0;
            }
            return { item, hash: Math.abs(itemHash) };
          });
          listWithHash.sort((a, b) => a.hash - b.hash);
          const selected = listWithHash.slice(0, platformTotalSolved);
          solvedPracticeCount = selected.length;
        }
      }

      return {
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber || 'N/A',
        branch: student.branch || 'N/A',
        username,
        platformTotalSolved,
        platformSpecificStats,
        solvedPracticeCount,
        totalPracticeCount: questionCount
      };
    });

    res.status(200).json({ success: true, data: reportData });
  } catch (err) {
    next(err);
  }
};
