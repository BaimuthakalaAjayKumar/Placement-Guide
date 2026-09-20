const { normalizeCode } = require('./plagiarismService');

/**
 * Calculates Levenshtein Distance between two strings.
 */
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateStringSimilarity(a, b) {
  const len = Math.max(a.length, b.length);
  if (len === 0) return 100;
  const dist = getLevenshteinDistance(a, b);
  return Math.max(0, Math.round(((len - dist) / len) * 100));
}

function calculateTokenOverlap(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Extracts high-level algorithmic logic signatures (loops, conditionals, functions, SQL clauses).
 */
function extractLogicSignature(code, language) {
  const lower = (code || '').toLowerCase();
  const signature = {
    hasLoops: /\b(for|while|do|loop)\b/.test(lower),
    hasConditionals: /\b(if|else|switch|case|when)\b/.test(lower),
    hasFunction: /\b(def|function|void|int|double|public|private|func)\b/.test(lower),
    hasReturn: /\b(return|yield)\b/.test(lower),
    isSQL: language === 'sql' || /\b(select|insert|update|delete|create table|alter table)\b/.test(lower),
    sqlClauses: {
      select: /\bselect\b/.test(lower),
      from: /\bfrom\b/.test(lower),
      where: /\bwhere\b/.test(lower),
      join: /\b(join|inner join|left join|right join)\b/.test(lower),
      groupBy: /\bgroup\s+by\b/.test(lower),
      orderBy: /\border\s+by\b/.test(lower),
      constraints: /\b(primary\s+key|foreign\s+key|not\s+null|unique|check)\b/.test(lower)
    },
    lineCount: code.split('\n').filter(l => l.trim().length > 0).length
  };
  return signature;
}

function detectLanguage(code, declaredLang) {
  const clean = (code || '').trim();
  const lower = clean.toLowerCase();
  if (/\b(create\s+(table|database)|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|alter\s+table|use\s+[a-zA-Z0-9_]+;?)\b/i.test(lower)) {
    return 'sql';
  }
  if (/^\s*(import\s+(sys|os|numpy|math|pandas)|def\s+[a-zA-Z_]\w*\(|print\(|elif\s+)/m.test(clean)) {
    return 'python';
  }
  if (/^\s*(#include\s*<|using\s+namespace\s+std;|int\s+main\s*\()/m.test(clean)) {
    return 'cpp';
  }
  if (/^\s*(import\s+java\.|public\s+class\s+|System\.out\.println)/m.test(clean)) {
    return 'java';
  }
  return (declaredLang || 'cpp').toLowerCase();
}

/**
 * Evaluates student's code against the faculty reference solution.
 * Handles different variable names via AST/identifier tokenization.
 * Supports cross-language evaluations (e.g. Python vs C++).
 */
function evaluateLabSubmission(studentCode, studentLanguage, referenceSolution, referenceLanguage, maxScore = 100) {
  const cleanStudentCode = (studentCode || '').trim();
  const cleanRefCode = (referenceSolution || '').trim();

  // If student submitted no code
  if (!cleanStudentCode) {
    return {
      score: 0,
      logicMatchPercentage: 0,
      structuralMatch: 0,
      isCorrect: false,
      remarks: 'No code submitted for evaluation.'
    };
  }

  // If faculty did not provide a reference solution, grade based on non-empty execution & syntax presence
  if (!cleanRefCode) {
    const lines = cleanStudentCode.split('\n').filter(l => l.trim().length > 0).length;
    const baseScore = lines >= 5 ? maxScore : Math.round(maxScore * 0.8);
    return {
      score: baseScore,
      logicMatchPercentage: 100,
      structuralMatch: 100,
      isCorrect: true,
      remarks: 'Lab submission accepted and recorded. (No faculty reference answer configured for this task).'
    };
  }

  const sLang = detectLanguage(cleanStudentCode, studentLanguage);
  const rLang = detectLanguage(cleanRefCode, referenceLanguage);

  // 1. Normalize code: replaces variable and function identifiers with 'ID', strips comments & literals
  const normStudent = normalizeCode(cleanStudentCode, sLang);
  const normRef = normalizeCode(cleanRefCode, rLang);

  const studentTokens = normStudent.normalizedString.split(' ').filter(Boolean);
  const refTokens = normRef.normalizedString.split(' ').filter(Boolean);

  let structuralMatch = 0;
  let logicMatch = 0;

  // Case A: SQL matching (query structure and clause presence)
  if (sLang === 'sql' && rLang === 'sql') {
    const sigStudent = extractLogicSignature(cleanStudentCode, 'sql');
    const sigRef = extractLogicSignature(cleanRefCode, 'sql');
    let matchedClauses = 0;
    let totalClauses = 0;
    for (const key of Object.keys(sigRef.sqlClauses)) {
      if (sigRef.sqlClauses[key]) {
        totalClauses++;
        if (sigStudent.sqlClauses[key]) matchedClauses++;
      }
    }
    const clauseSim = totalClauses > 0 ? Math.round((matchedClauses / totalClauses) * 100) : 100;
    const strSim = calculateStringSimilarity(normStudent.normalizedString, normRef.normalizedString);
    const tokenSim = calculateTokenOverlap(studentTokens, refTokens);
    structuralMatch = Math.max(clauseSim, Math.round((strSim * 0.4) + (tokenSim * 0.6)));
    logicMatch = Math.max(structuralMatch, clauseSim);
  } else if (sLang === rLang) {
    // Case B: Same programming language
    const strSim = calculateStringSimilarity(normStudent.normalizedString, normRef.normalizedString);
    const tokenSim = calculateTokenOverlap(studentTokens, refTokens);
    structuralMatch = Math.round((strSim * 0.6) + (tokenSim * 0.4));
    logicMatch = structuralMatch;
  } else {
    // Case C: Cross-language logic match (e.g. C++ vs Python or Java)
    const sigStudent = extractLogicSignature(cleanStudentCode, sLang);
    const sigRef = extractLogicSignature(cleanRefCode, rLang);

    let logicPoints = 0;
    let maxPoints = 0;

    // Check control flow alignment
    if (sigRef.hasLoops) {
      maxPoints += 25;
      if (sigStudent.hasLoops) logicPoints += 25;
    }
    if (sigRef.hasConditionals) {
      maxPoints += 25;
      if (sigStudent.hasConditionals) logicPoints += 25;
    }
    if (sigRef.hasFunction) {
      maxPoints += 20;
      if (sigStudent.hasFunction) logicPoints += 20;
    }
    if (sigRef.hasReturn) {
      maxPoints += 15;
      if (sigStudent.hasReturn) logicPoints += 15;
    }

    // Token count ratio (checking complexity scale)
    maxPoints += 15;
    const ratio = Math.min(studentTokens.length, refTokens.length) / Math.max(studentTokens.length, refTokens.length || 1);
    logicPoints += Math.round(ratio * 15);

    const crossSim = maxPoints > 0 ? Math.round((logicPoints / maxPoints) * 100) : 75;
    logicMatch = crossSim;
    structuralMatch = crossSim;
  }

  // Determine pass status & score
  const isCorrect = logicMatch >= 50;
  let finalScore = 0;

  if (logicMatch >= 85) {
    finalScore = maxScore;
  } else if (logicMatch >= 70) {
    finalScore = Math.round(maxScore * 0.9);
  } else if (logicMatch >= 50) {
    finalScore = Math.round(maxScore * 0.75);
  } else if (logicMatch >= 30) {
    finalScore = Math.round(maxScore * 0.5);
  } else {
    finalScore = Math.max(10, Math.round(maxScore * 0.25));
  }

  // Construct remarks
  let remarks = '';
  if (isCorrect) {
    if (sLang === rLang) {
      remarks = `Logic matches faculty solution (${logicMatch}% structural match, variable names normalized). High conformance to reference criteria.`;
    } else {
      remarks = `Algorithmic logic verified across languages (${studentLanguage.toUpperCase()} vs ${referenceLanguage.toUpperCase()} reference, ${logicMatch}% logic match).`;
    }
  } else {
    remarks = `Partial logic match (${logicMatch}% match with faculty reference solution). Review control structures and algorithm requirements.`;
  }

  return {
    score: finalScore,
    logicMatchPercentage: logicMatch,
    structuralMatch,
    isCorrect,
    remarks
  };
}

module.exports = {
  evaluateLabSubmission,
  extractLogicSignature
};
