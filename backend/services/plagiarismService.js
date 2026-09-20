const Submission = require('../models/Submission');
const User = require('../models/User');

/**
 * Tokenize and normalize programming language structures.
 * Removes comments, strings, formatting, imports, and replaces identifiers/literals
 * with normalized tokens (e.g., ID, LIT, FUNC) to defend against renaming and formatting.
 */
function normalizeCode(code, language) {
  // 1. Remove comments
  let cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '')  // C-style block comments
    .replace(/\/\/.*/g, '')            // Line comments
    .replace(/#.*/g, '');              // Python-style comments

  // 2. Tokenize structure using regex rules
  // Replace string and char literals with generic literal token 'LIT_STR'
  cleanCode = cleanCode.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, 'LIT_STR');

  // Replace numeric literals with 'LIT_NUM'
  cleanCode = cleanCode.replace(/\b\d+(\.\d+)?\b/g, 'LIT_NUM');

  // Keywords across C/C++/Java/JS/Python
  const keywords = new Set([
    'function', 'let', 'const', 'var', 'if', 'else', 'for', 'while', 'do',
    'return', 'class', 'import', 'require', 'include', 'using', 'namespace',
    'int', 'float', 'double', 'char', 'void', 'public', 'private', 'protected',
    'static', 'def', 'import', 'from', 'as', 'try', 'except', 'catch', 'finally',
    'throw', 'new', 'true', 'false', 'null', 'undefined'
  ]);

  // Split by symbols but preserve structure
  const words = cleanCode.split(/([{}()\[\].,;+\-*\/&|%!=<>?:~\s])/);
  const tokens = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim();
    if (!word) continue;

    if (keywords.has(word)) {
      tokens.push(word.toUpperCase());
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(word)) {
      if (word === 'LIT_STR' || word === 'LIT_NUM') {
        tokens.push(word);
      } else {
        tokens.push('ID'); // Identifier token
      }
    } else if (['{', '}', '(', ')', '[', ']'].includes(word)) {
      tokens.push(word);
    } else if (['+', '-', '*', '/', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||'].includes(word)) {
      tokens.push('OP'); // Operator token
    } else {
      tokens.push(word); // Punctuation/symbols
    }
  }

  return {
    normalizedString: tokens.join(' '),
    tokenCount: tokens.length
  };
}

/**
 * Calculates Levenshtein Distance between two strings.
 */
function getLevenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1,   // insertion
            matrix[i - 1][j] + 1    // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates string similarity percentage (0 to 100) using Levenshtein distance.
 */
function calculateStringSimilarity(a, b) {
  const len = Math.max(a.length, b.length);
  if (len === 0) return 100;
  const dist = getLevenshteinDistance(a, b);
  return Math.round(((len - dist) / len) * 100);
}

/**
 * Calculates token-sequence jaccard similarity ratio.
 */
function calculateTokenOverlap(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  if (union.size === 0) return 0;
  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Scans code line-by-line to extract matching fragments.
 */
function findMatchingFragments(codeA, codeB) {
  const linesA = codeA.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const linesB = codeB.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const matchedLines = [];

  for (let i = 0; i < linesA.length; i++) {
    const line = linesA[i];
    // Simple direct line match or high similarity line
    const matchFound = linesB.some(otherLine => {
      if (line === otherLine) return true;
      const sim = calculateStringSimilarity(line, otherLine);
      return sim > 85;
    });

    if (matchFound) {
      matchedLines.push({
        line: i + 1,
        matchedCode: line
      });
    }
  }

  return matchedLines.slice(0, 15); // Return top matches to save database space
}

/**
 * Runs Plagiarism Checker against all previous submissions for this question.
 */
async function checkPlagiarism(submissionId, questionId, code, language, currentUserId) {
  const currentNormalized = normalizeCode(code, language);
  
  const previousSubmissions = await Submission.find({
    question: questionId,
    _id: { $ne: submissionId },
    user: { $ne: currentUserId }
  }).populate('user', 'name email');

  let maxSimilarity = 0;
  const matchedSubmissions = [];
  let bestMatchSubmission = null;

  for (let sub of previousSubmissions) {
    const otherNormalized = normalizeCode(sub.code, sub.language);

    // 1. Calculate structural string similarity on normalized tokens
    const structSim = calculateStringSimilarity(currentNormalized.normalizedString, otherNormalized.normalizedString);

    // 2. Calculate token overlap
    const tokensA = currentNormalized.normalizedString.split(' ');
    const tokensB = otherNormalized.normalizedString.split(' ');
    const tokenSim = calculateTokenOverlap(tokensA, tokensB);

    // 3. Calculate text level similarity on cleaned code
    const rawCleanSim = calculateStringSimilarity(
      code.replace(/\s+/g, ''),
      sub.code.replace(/\s+/g, '')
    );

    // Combined weighted similarity (50% structural AST token similarity, 30% token overlap, 20% raw text similarity)
    const combinedSim = Math.round((structSim * 0.5) + (tokenSim * 0.3) + (rawCleanSim * 0.2));

    if (combinedSim > maxSimilarity) {
      maxSimilarity = combinedSim;
      bestMatchSubmission = sub;
    }

    if (combinedSim > 10) {
      matchedSubmissions.push({
        submission: sub._id,
        user: sub.user ? sub.user._id : null,
        percentage: combinedSim
      });
    }
  }

  // Classify plagiarism
  let status = 'Original';
  if (maxSimilarity > 60) {
    status = 'High Plagiarism';
  } else if (maxSimilarity > 30) {
    status = 'Moderate Similarity';
  } else if (maxSimilarity > 10) {
    status = 'Low Similarity';
  }

  // Find matching fragments against best match
  let matchedLines = [];
  if (bestMatchSubmission) {
    matchedLines = findMatchingFragments(code, bestMatchSubmission.code);
  }

  // Similarity Graph metadata (matched nodes)
  const similarityGraphData = {
    nodes: [
      { id: 'Current', label: 'Current Student', val: 10 },
      ...(bestMatchSubmission && bestMatchSubmission.user ? [
        { id: 'MatchSource', label: bestMatchSubmission.user.name, val: 8 }
      ] : [])
    ],
    links: bestMatchSubmission ? [
      { source: 'Current', target: 'MatchSource', similarity: maxSimilarity }
    ] : []
  };

  return {
    plagiarismPercentage: maxSimilarity,
    status,
    matchedSubmissions: matchedSubmissions.sort((a, b) => b.percentage - a.percentage).slice(0, 5),
    matchedLines,
    similarityGraphData
  };
}

/**
 * Runs Plagiarism Checker for Lab Tasks against all other student submissions for this specific LabTask.
 */
async function checkLabTaskPlagiarism(taskId, currentStudentId, code, language) {
  const LabPracticeAttempt = require('../models/LabPracticeAttempt');
  if (!code || code.trim().length < 15) {
    return {
      plagiarismPercentage: 0,
      status: 'Original',
      plagiarizedWith: null,
      matchedLines: []
    };
  }

  const currentNormalized = normalizeCode(code, language || 'cpp');

  const otherAttempts = await LabPracticeAttempt.find({
    task: taskId,
    student: { $ne: currentStudentId },
    $or: [
      { code: { $exists: true, $ne: '' } },
      { submission: { $exists: true, $ne: '' } }
    ]
  }).populate('student', 'name email rollNumber');

  let maxSimilarity = 0;
  let bestMatchAttempt = null;

  for (let other of otherAttempts) {
    const otherCode = other.code || other.submission || '';
    if (!otherCode || otherCode.trim().length < 15) continue;

    const otherNormalized = normalizeCode(otherCode, other.language || 'cpp');

    // 1. Structural AST token string similarity
    const structSim = calculateStringSimilarity(currentNormalized.normalizedString, otherNormalized.normalizedString);

    // 2. Token overlap
    const tokensA = currentNormalized.normalizedString.split(' ').filter(Boolean);
    const tokensB = otherNormalized.normalizedString.split(' ').filter(Boolean);
    const tokenSim = calculateTokenOverlap(tokensA, tokensB);

    // 3. Raw clean text similarity
    const rawCleanSim = calculateStringSimilarity(
      code.replace(/\s+/g, ''),
      otherCode.replace(/\s+/g, '')
    );

    const combinedSim = Math.round((structSim * 0.5) + (tokenSim * 0.3) + (rawCleanSim * 0.2));

    if (combinedSim > maxSimilarity) {
      maxSimilarity = combinedSim;
      bestMatchAttempt = other;
    }
  }

  let status = 'Original';
  if (maxSimilarity > 60) {
    status = 'High Plagiarism';
  } else if (maxSimilarity > 40) {
    status = 'Moderate Similarity';
  } else if (maxSimilarity > 15) {
    status = 'Low Similarity';
  }

  let matchedLines = [];
  if (bestMatchAttempt && maxSimilarity >= 25) {
    matchedLines = findMatchingFragments(code, bestMatchAttempt.code || bestMatchAttempt.submission || '');
  }

  return {
    plagiarismPercentage: maxSimilarity,
    status,
    plagiarizedWith: bestMatchAttempt ? {
      student: bestMatchAttempt.student?._id,
      studentName: bestMatchAttempt.student?.name || 'Peer Candidate',
      percentage: maxSimilarity
    } : null,
    matchedLines
  };
}

module.exports = {
  checkPlagiarism,
  checkLabTaskPlagiarism,
  normalizeCode
};
