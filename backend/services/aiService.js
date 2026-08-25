const User = require('../models/User');

/**
 * Analyzes resume text using Google Gemini API if configured, otherwise falls back to rule-based parsing.
 * @param {string} text - The extracted plain text from PDF.
 * @param {string} targetRole - The target job role (e.g. Software Engineer).
 * @returns {Promise<object>}
 */
exports.analyzeResumeWithAI = async (text, targetRole) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null; 
  }

  try {
    const prompt = `
      You are an expert ATS (Applicant Tracking System) parser and career coach.
      Analyze the following resume text for a candidate targeting the role of "${targetRole}".
      Evaluate it on:
      1. Score (0 to 100) based on formatting, technical depth, section presence, and relevance.
      2. Found Skills (relevant technical skills found in the text).
      3. Missing Skills (crucial skills for the target role that are missing).
      4. Suggestions (specific, actionable ATS-oriented suggestions).
      5. Keywords Missing (important industry keywords missing).
      6. Contact Info (extract email, phone, whether LinkedIn link exists, whether GitHub link exists).

      Resume Text:
      """
      ${text}
      """

      Return ONLY a valid JSON object matching this schema. Do not output any markdown formatting, backticks, or other wrapper text.
      JSON Schema:
      {
        "score": number,
        "foundSkills": ["skill1", "skill2"],
        "suggestions": ["suggestion1", "suggestion2"],
        "keywordsMissing": ["keyword1", "keyword2"],
        "contactInfo": {
          "email": "string",
          "phone": "string",
          "github": boolean,
          "linkedin": boolean
        }
      }
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    return JSON.parse(resultText.trim());
  } catch (err) {
    console.error('Gemini Resume Analysis failed, falling back:', err);
    return null;
  }
};

/**
 * Grades a single mock interview response.
 * @param {string} question - The question asked.
 * @param {string} answer - The user's answer.
 * @param {string} questionType - 'technical', 'behavioral', or 'coding'.
 * @returns {Promise<object>}
 */
exports.gradeInterviewAnswerWithAI = async (question, answer, questionType = 'technical') => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const prompt = `
      You are an elite technical interviewer. Evaluate the candidate's answer for the following question.
      Question: "${question}" (Type: ${questionType})
      Candidate's Answer: "${answer}"

      Evaluate it on:
      1. Score (0 to 100) based on accuracy, depth, structure (e.g. STAR method for behavioral), and completeness.
      2. Critique / Feedback (constructive review highlighting what they did well and how they can improve).

      Return ONLY a valid JSON object matching this schema. Do not output any markdown formatting, backticks, or other wrapper text.
      JSON Schema:
      {
        "score": number,
        "feedback": "string"
      }
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    return JSON.parse(resultText.trim());
  } catch (err) {
    console.error('Gemini Answer Grading failed, falling back:', err);
    return null;
  }
};

/**
 * Generates overall interview analysis (strengths, weaknesses, suggestions, readiness).
 * @param {string} jobRole
 * @param {string} technology
 * @param {Array} qaList - Array of { questionText, questionType, userResponse, score, feedback }
 * @returns {Promise<object>}
 */
exports.generateInterviewOverallReportWithAI = async (jobRole, technology, qaList) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const prompt = `
      You are a senior recruitment director. Analyze the overall mock interview performance of a candidate targeting the role "${jobRole}" (focusing on "${technology}").
      Below is the list of questions asked, candidate's responses, scores, and individual feedback:
      ${JSON.stringify(qaList, null, 2)}

      Generate a comprehensive evaluation including:
      1. General Feedback summary.
      2. Strengths (at least 2 key strong points observed).
      3. Weaknesses (at least 2 key weak areas or knowledge gaps).
      4. Improvement Suggestions (specific actions they can take to prepare).
      5. Interview Readiness (choose one of: "Highly Placement Ready", "Needs Practice", "Requires Significant Work").

      Return ONLY a valid JSON object matching this schema. Do not output any markdown formatting, backticks, or other wrapper text.
      JSON Schema:
      {
        "generalFeedback": "string",
        "strengths": ["string"],
        "weaknesses": ["string"],
        "improvementSuggestions": ["string"],
        "interviewReadiness": "string"
      }
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    return JSON.parse(resultText.trim());
  } catch (err) {
    console.error('Gemini Interview Summary failed, falling back:', err);
    return null;
  }
};

/**
 * Generates a personalized learning roadmap using Gemini AI.
 * @param {object} user - User document
 * @param {object} stats - Dashboard statistics
 * @returns {Promise<object>}
 */
exports.generateRoadmapWithAI = async (user, stats) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const prompt = `
      You are an elite career development advisor. Create a personalized placement preparation roadmap for a student.
      Student Info:
      - Target Role: "${user.targetRole || 'Software Engineer'}"
      - Skills: [${(user.skills || []).join(', ')}]
      - Resume Score: ${stats.resumeScore}/100
      - Aptitude Avg: ${stats.aptitudeAvg}%
      - Coding solved count: ${stats.totalSolved}
      - Mock Interview score: ${stats.interviewAvg}%

      Formulate:
      1. Career Interest target
      2. Strengths (at least 2 specific points)
      3. Weaknesses (at least 2 areas that need attention)
      4. Steps (a sequence of 4-6 specific actionable tasks to address weaknesses, prepare for target role, study specific subjects, take tests, etc.)
         For each step, specify:
         - title
         - description
         - type ('resume', 'aptitude', 'coding', 'interview', 'general')
         - resourceLink (e.g. '/resume-analyzer', '/aptitude-tests', '/question-bank', '/mock-interviews')
         - status ('todo')

      Return ONLY a valid JSON object matching this schema. Do not output any markdown formatting, backticks, or other wrapper text.
      JSON Schema:
      {
        "careerInterest": "string",
        "strengths": ["string"],
        "weaknesses": ["string"],
        "steps": [
          {
            "title": "string",
            "description": "string",
            "type": "string",
            "resourceLink": "string",
            "status": "todo"
          }
        ]
      }
    `;

    const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${apiKey}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(\`Gemini API returned status \${response.status}\`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    return JSON.parse(resultText.trim());
  } catch (err) {
    console.error('Gemini Roadmap Generation failed, falling back:', err);
    return null;
  }
};
