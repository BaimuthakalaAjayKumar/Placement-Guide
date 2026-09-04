const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Resume = require('../models/Resume');
const User = require('../models/User');
const aiService = require('../services/aiService');

// Configure Multer storage
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// File filter (allow PDFs only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF resumes are supported!'), false);
  }
};

exports.upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('resume');

// Helper to analyze resume text
const analyzeResumeText = (text, targetRole = 'Software Engineer') => {
  const normalizedText = text.toLowerCase();
  
  // List of standard skills to search for
  const skillsList = [
    'javascript', 'python', 'react', 'node', 'express', 'mongodb', 'sql', 'postgres', 
    'java', 'c\\+\\+', 'c#', 'ruby', 'php', 'html', 'css', 'git', 'docker', 'kubernetes',
    'aws', 'gcp', 'azure', 'typescript', 'redux', 'angular', 'vue', 'django', 'flask', 
    'spring boot', 'machine learning', 'data structures', 'algorithms', 'oops', 'linux',
    'rest api', 'graphql', 'tailwind', 'bootstrap', 'next.js', 'nest.js', 'react native'
  ];

  // Match skills in resume
  const foundSkills = [];
  skillsList.forEach(skillPattern => {
    const regex = new RegExp(`\\b${skillPattern}\\b`, 'gi');
    if (regex.test(normalizedText)) {
      // Clean display name
      let displayName = skillPattern.replace('\\+', '+');
      displayName = displayName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (displayName.toLowerCase() === 'html' || displayName.toLowerCase() === 'css' || displayName.toLowerCase() === 'aws' || displayName.toLowerCase() === 'gcp') {
        displayName = displayName.toUpperCase();
      }
      if (displayName.toLowerCase() === 'oops') {
        displayName = 'OOPs';
      }
      if (!foundSkills.includes(displayName)) {
        foundSkills.push(displayName);
      }
    }
  });

  // Extract contact info
  const emailRegex = /[\w.-]+@[\w.-]+\.[\w.-]+/gi;
  const emails = text.match(emailRegex) || [];
  const phoneRegex = /(\+?\d{1,3}[- ]?)?\d{10}/g;
  const phones = text.match(phoneRegex) || [];
  const hasGithub = normalizedText.includes('github.com');
  const hasLinkedin = normalizedText.includes('linkedin.com');

  // Check section headings
  const hasExperience = /work\s+experience|experience|employment|professional\s+background/i.test(normalizedText);
  const hasEducation = /education|academic|studies|qualification/i.test(normalizedText);
  const hasProjects = /projects|personal\s+projects|academic\s+projects|key\s+projects/i.test(normalizedText);
  const hasSkillsSec = /skills|technical\s+skills|core\s+competencies|technologies/i.test(normalizedText);

  // ATS scoring calculation
  let score = 20; // Base score
  const suggestions = [];

  // 1. Section Checks (Max 40 points)
  if (hasExperience) score += 10;
  else suggestions.push('Add an "Experience" or "Work Experience" section to outline professional activities.');

  if (hasEducation) score += 10;
  else suggestions.push('Include an "Education" section outlining your academic credentials and graduation year.');

  if (hasProjects) score += 10;
  else suggestions.push('Create a "Projects" section detailing 2-3 technical projects you have built.');

  if (hasSkillsSec) score += 10;
  else suggestions.push('Create a dedicated "Skills" section to list your programming languages and technologies.');

  // 2. Skills Check (Max 25 points)
  const skillsCount = foundSkills.length;
  if (skillsCount >= 8) score += 25;
  else if (skillsCount >= 5) score += 15;
  else {
    score += 5;
    suggestions.push('Add more technical skills (languages, frameworks, databases) that match your target role.');
  }

  // 3. Contact details (Max 15 points)
  if (emails.length > 0) score += 5;
  if (phones.length > 0) score += 5;
  if (hasGithub || hasLinkedin) score += 5;
  else suggestions.push('Include links to GitHub and LinkedIn profiles to make it easy for recruiters to review your profile.');

  // 4. Content Formatting & Action Verbs (Max 20 points)
  const actionVerbs = ['developed', 'designed', 'implemented', 'created', 'built', 'optimized', 'integrated', 'architected', 'led', 'managed'];
  let verbCount = 0;
  actionVerbs.forEach(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'gi');
    if (regex.test(normalizedText)) verbCount++;
  });
  if (verbCount >= 4) score += 20;
  else if (verbCount >= 2) {
    score += 10;
    suggestions.push('Incorporate stronger action verbs (e.g., Optimized, Implemented, Designed) to describe your project and work contributions.');
  } else {
    suggestions.push('Rewrite bullet points using action verbs (e.g. Developed, Orchestrated, Solved) instead of passive descriptions.');
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Role keyword matching (checks target role and returns missing keywords)
  const roleKeywords = {
    'Frontend Developer': ['React', 'Redux', 'TypeScript', 'HTML', 'CSS', 'Tailwind', 'Responsive Design', 'Vite', 'Next.js'],
    'Backend Developer': ['Node.js', 'Express', 'MongoDB', 'SQL', 'REST API', 'Docker', 'JWT', 'PostgreSQL', 'Redis'],
    'Full Stack Developer': ['React', 'Node.js', 'Express', 'MongoDB', 'Git', 'REST API', 'JavaScript', 'Tailwind', 'Deployment'],
    'Software Engineer': ['Data Structures', 'Algorithms', 'OOPs', 'Java', 'Python', 'C++', 'Git', 'SQL'],
    'Data Scientist': ['Python', 'SQL', 'Machine Learning', 'Pandas', 'NumPy', 'Tableau', 'Statistics', 'R']
  };

  const currentRoleKeywords = roleKeywords[targetRole] || roleKeywords['Software Engineer'];
  const keywordsMissing = [];
  
  currentRoleKeywords.forEach(keyword => {
    // Escape special characters for regex
    const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
    if (!regex.test(normalizedText)) {
      keywordsMissing.push(keyword);
    }
  });

  if (keywordsMissing.length > 0) {
    suggestions.push(`Include target role keywords missing for a ${targetRole}: ${keywordsMissing.slice(0, 3).join(', ')}.`);
  }

  return {
    score,
    foundSkills,
    suggestions,
    keywordsMissing,
    contactInfo: {
      email: emails[0] || '',
      phone: phones[0] || '',
      github: hasGithub,
      linkedin: hasLinkedin
    }
  };
};

// @desc    Upload and Analyze Resume
// @route   POST /api/resumes/upload
// @access  Private
exports.analyzeResume = async (req, res, next) => {
  exports.upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF file' });
    }

    try {
      // 1. Read PDF Text
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      const extractedText = pdfData.text;

      // 2. Fetch User to get target role
      const user = await User.findById(req.user.id);
      const targetRole = user.targetRole || 'Software Engineer';

      // 3. Analyze Text
      let analysis = await aiService.analyzeResumeWithAI(extractedText, targetRole);
      if (!analysis) {
        analysis = analyzeResumeText(extractedText, targetRole);
      }

      // 4. Save to Database
      const resume = await Resume.create({
        user: req.user.id,
        filePath: `uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        parsedText: extractedText,
        skills: analysis.foundSkills,
        score: analysis.score,
        suggestions: analysis.suggestions,
        keywordsMissing: analysis.keywordsMissing
      });

      // 5. Update User's skills list and readiness score based on resume upload
      await User.findByIdAndUpdate(req.user.id, {
        skills: Array.from(new Set([...user.skills, ...analysis.foundSkills]))
      });

      res.status(201).json({
        success: true,
        data: resume
      });
    } catch (parseErr) {
      // Clean up uploaded file if parsing fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(parseErr);
    }
  });
};

// @desc    Get Latest Resume Analysis
// @route   GET /api/resumes/latest
// @access  Private
exports.getLatestResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    
    if (!resume) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (err) {
    next(err);
  }
};
