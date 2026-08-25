const MockInterview = require('../models/MockInterview');
const User = require('../models/User');
const { InterviewRole, InterviewTechnology } = require('../models/InterviewMetadata');
const aiService = require('../services/aiService');

const questionBank = {
  'Software Engineer': {
    behavioral: [
      'Tell me about a time you had to resolve a complex bug or technical challenge. What was your process?',
      'Describe a scenario where you had to work with a teammate who had a very different perspective or work style.',
      'Tell me about a time you failed to meet a deadline. What did you do, and what did you learn from it?',
      'How do you balance writing high-quality code with the need to deliver features quickly?'
    ],
    technical: [
      'How do you ensure web application performance, and how do you optimize frontend rendering or backend queries?',
      'Explain the differences between SQL and NoSQL databases, and how you choose between them for a system.',
      'Describe the concept of object-oriented programming (OOP) and its key pillars: encapsulation, inheritance, polymorphism, and abstraction.',
      'Explain what Big O notation is and how you analyze the time and space complexity of an algorithm.'
    ],
    coding: [
      'Implement a function that reverses a string without using built-in reverse methods.',
      'Given an array of integers, write a function to find the two numbers that sum to a target value.',
      'Write a solution to detect whether a linked list contains a cycle.',
      'Design an efficient approach to find the first non-repeating character in a string.'
    ],
    technology: {
      JavaScript: {
        technical: [
          'How do event propagation and closures work in JavaScript?',
          'Explain the difference between var, let, and const in modern JavaScript.'
        ],
        coding: [
          'Given a string, write a JavaScript function that returns the first non-repeating character.',
          'Write a function that takes an array of numbers and returns a new array with duplicates removed.'
        ]
      },
      Python: {
        technical: [
          'How do Python comprehensions and generators improve code readability?',
          'Explain how Python memory management and garbage collection work.'
        ],
        coding: [
          'Write a Python function that counts the frequency of each word in a sentence.',
          'Given a list of integers, implement a Python function to return only the prime numbers.'
        ]
      },
      Java: {
        technical: [
          'How does Java handle multithreading and synchronization?',
          'Explain the difference between interface and abstract class in Java.'
        ],
        coding: [
          'Write a Java method that checks whether two strings are anagrams of each other.',
          'Implement a method that merges two sorted lists into a single sorted list.'
        ]
      },
      'C++': {
        technical: [
          'How do smart pointers improve memory safety in C++?',
          'Explain the difference between stack and heap memory in C++.'
        ],
        coding: [
          'Write a C++ function that reverses a singly linked list in place.',
          'Design a C++ function to count occurrences of each character in a string.'
        ]
      },
      General: {
        technical: [
          'How would you explain your recent project architecture in a concise interview answer?'
        ],
        coding: [
          'Describe a coding approach for validating user input before saving it to a database.'
        ]
      }
    }
  },
  'Frontend Developer': {
    behavioral: [
      'Tell me about a time you received critical feedback on your UI design choices.',
      'Describe a situation where you had to explain a complex frontend issue to a non-technical stakeholder.',
      'How do you prioritize between polish and shipping quickly?'
    ],
    technical: [
      'How does the React virtual DOM work under the hood, and how can you optimize React component re-rendering?',
      'Explain the difference between CSS Flexbox and Grid, and when you would prefer one over the other.',
      'What are Core Web Vitals, and what strategies do you employ to improve page speed and layout stability?',
      'What is single-page application (SPA) routing, and how do React Router or similar frameworks handle dynamic routes?'
    ],
    coding: [
      'Implement a reusable debounce hook in React.',
      'Write a function to flatten a nested array of objects into a single list.',
      'Create a component that filters a list based on a search term.'
    ],
    technology: {
      JavaScript: {
        technical: [
          'How do promises differ from async/await in JavaScript?',
          'Explain the event loop and how it affects UI performance.'
        ],
        coding: [
          'Implement a reusable debounce hook in React.',
          'Write a JavaScript function that filters and sorts a list of objects by a search term.'
        ]
      },
      Python: {
        technical: [
          'How would you build a lightweight web scraper in Python?'
        ],
        coding: [
          'Write a Python function that takes a list of dictionaries and returns only those that match a filter condition.'
        ]
      },
      Java: {
        technical: [
          'How would you style a desktop UI in Java?'
        ],
        coding: [
          'Design a Java Swing or JavaFX form validation method to check user input compliance.'
        ]
      },
      'C++': {
        technical: [
          'How would you structure a GUI application in C++?'
        ],
        coding: [
          'Write a C++ function that parses a comma-separated string into a vector of values.'
        ]
      },
      General: {
        technical: [
          'How would you measure frontend performance in a production application?'
        ],
        coding: [
          'Describe how you would build an accessible interactive component using modern frontend tools.'
        ]
      }
    }
  },
  'Backend Developer': {
    behavioral: [
      'Tell me about a time you had to troubleshoot a production issue under pressure.',
      'Describe a case where you improved an API that was slow or unreliable.',
      'How do you communicate tradeoffs between reliability and speed to your team?'
    ],
    technical: [
      'What is a RESTful API? Explain the key HTTP methods, status codes, and design best practices.',
      'How does JWT authentication work, and what are the security considerations for storing JWTs on the client side?',
      'Explain what database indexing is, how it improves read speeds, and what write penalties it introduces.',
      'How would you design a rate-limiting middleware for an API, and what technologies (like Redis) would you use?'
    ],
    coding: [
      'Write a function to check whether a string is a palindrome.',
      'Implement a cache with LRU eviction semantics.',
      'Design a solution to find the longest substring without repeating characters.'
    ],
    technology: {
      JavaScript: {
        technical: [
          'How would you build a Node.js middleware pipeline for request validation?'
        ],
        coding: [
          'Implement a Node.js function that validates request payloads and returns structured errors.'
        ]
      },
      Python: {
        technical: [
          'How would you build an async API endpoint in Python?'
        ],
        coding: [
          'Write a Python async function that fetches data from multiple APIs and combines the results.'
        ]
      },
      Java: {
        technical: [
          'How do Java streams simplify backend data transformation?'
        ],
        coding: [
          'Write a Java method that groups a list of orders by customer and calculates totals.'
        ]
      },
      'C++': {
        technical: [
          'How would you optimize a high-throughput server in C++?'
        ],
        coding: [
          'Design a C++ function that efficiently manages a connection pool using RAII principles.'
        ]
      },
      General: {
        technical: [
          'How would you design observability for a distributed backend service?'
        ],
        coding: [
          'Describe a coding strategy for handling paginated API responses in a backend service.'
        ]
      }
    }
  },
  'Full Stack Developer': {
    behavioral: [
      'Describe a time when you had to connect the frontend and backend teams around a shared technical decision.',
      'How do you handle disagreement about architecture during a delivery sprint?',
      'Tell me about a time you had to debug an issue across the full stack.'
    ],
    technical: [
      'Describe the end-to-end flow of what happens when a user types a URL in their browser and hits enter.',
      'How do you handle state synchronization between the frontend and the database? Describe a caching strategy.',
      'What is Serverless architecture, and what are the benefits and drawbacks of using functions like AWS Lambda?',
      'How do you establish secure communication between frontend and backend in a distributed system?'
    ],
    coding: [
      'Build a simple authentication flow with a login and logout route.',
      'Write a function that validates a form payload before submission.',
      'Design a small API endpoint that returns paginated results.'
    ],
    technology: {
      JavaScript: {
        technical: [
          'How do you structure a MERN stack project for long-term maintainability?'
        ],
        coding: [
          'Write a full-stack JavaScript function to validate form input and send it to an API endpoint.'
        ]
      },
      Python: {
        technical: [
          'How would you connect a Flask or Django app to a database securely?'
        ],
        coding: [
          'Write a Python function that serializes user data to JSON and validates required fields.'
        ]
      },
      Java: {
        technical: [
          'How would you build a full-stack app using Spring Boot?'
        ],
        coding: [
          'Design a Spring Boot controller method that accepts form data and returns validation feedback.'
        ]
      },
      'C++': {
        technical: [
          'How would you structure a full-stack app around a C++ backend?'
        ],
        coding: [
          'Describe how you would implement an HTTP service in C++ to receive and handle JSON data.'
        ]
      },
      General: {
        technical: [
          'How would you choose between REST and GraphQL for a new product?'
        ],
        coding: [
          'Explain how you would build a small data flow from client input through API to persistence.'
        ]
      }
    }
  },
  'Data Scientist': {
    behavioral: [
      'Tell me about a time you explained a model result to a non-technical audience.',
      'Describe a project where your analysis changed a business decision.',
      'How do you handle ambiguity when the data does not support a clear conclusion?'
    ],
    technical: [
      'Explain the bias-variance tradeoff in Machine Learning and how you can prevent overfitting in a model.',
      'What is the difference between supervised and unsupervised learning? Give examples of algorithms for both.',
      'How do you handle missing values or imbalanced classes in a dataset during preprocessing?',
      'What is gradient descent, and explain the role of learning rate in optimization algorithms?'
    ],
    coding: [
      'Write a Python function to compute the mean and median of a list of values.',
      'Implement a simple linear regression from scratch.',
      'Write code to remove duplicates from a dataset while preserving the order.'
    ],
    technology: {
      JavaScript: {
        technical: [
          'How would you visualize data in a browser-based dashboard?'
        ],
        coding: [
          'Write a JavaScript function that transforms raw analytics data into chart-ready series.'
        ]
      },
      Python: {
        technical: [
          'How do pandas and NumPy help with data preparation and analysis?'
        ],
        coding: [
          'Implement a Python function that normalizes a dataset and identifies missing values.'
        ]
      },
      Java: {
        technical: [
          'How would you build a data processing pipeline in Java?'
        ],
        coding: [
          'Write a Java program that reads CSV data and computes summary statistics.'
        ]
      },
      'C++': {
        technical: [
          'How would you optimize numerical operations in C++?'
        ],
        coding: [
          'Design a C++ function to compute rolling averages over a stream of numeric values.'
        ]
      },
      General: {
        technical: [
          'How would you evaluate whether a model is ready for production?'
        ],
        coding: [
          'Describe a process for validating model output and preparing results for stakeholder review.'
        ]
      }
    }
  }
};

const gradeInterviewAnswer = (question, answer, questionType = 'technical') => {
  const normAns = answer.toLowerCase();
  let score = 30;
  const feedbackPoints = [];

  if (answer.trim().length === 0) {
    return {
      score: 0,
      feedback: 'No answer provided. In a real interview, silence is a missed opportunity. Try to construct an answer even if you are unsure.'
    };
  }

  if (answer.length > 250) {
    score += 20;
    feedbackPoints.push('Excellent detail and depth in your answer.');
  } else if (answer.length > 100) {
    score += 12;
    feedbackPoints.push('Good response length, though adding specific project examples could strengthen it.');
  } else {
    score += 5;
    feedbackPoints.push('Your response is a bit brief. Expand on your points by describing specific scenarios or technical details.');
  }

  const starKeywords = ['situation', 'task', 'action', 'result', 'solved', 'achieved', 'because', 'impact', 'led to', 'first', 'then', 'finally'];
  let starCount = 0;
  starKeywords.forEach(k => {
    if (normAns.includes(k)) starCount++;
  });

  if (starCount >= 3) {
    score += 20;
    feedbackPoints.push('Good structured storytelling. You clearly outlined actions and outcomes.');
  } else if (starCount >= 1) {
    score += 10;
    feedbackPoints.push('You described some actions, but try to explicitly state the results and business impact of your work.');
  } else {
    feedbackPoints.push('Try using the STAR method (Situation, Task, Action, Result) to give your behavioral answers a solid narrative structure.');
  }

  const techKeywords = [
    'react', 'dom', 'rendering', 'optimize', 'index', 'performance', 'database', 'sql', 'nosql', 'query',
    'flexbox', 'grid', 'css', 'state', 'redux', 'context', 'http', 'rest', 'jwt', 'security', 'token',
    'auth', 'redis', 'rate limit', 'log', 'middleware', 'schema', 'relation', 'model', 'bias', 'variance',
    'overfitting', 'supervised', 'algorithm', 'decision tree', 'precision', 'recall', 'f1', 'accuracy',
    'project', 'experience', 'bug', 'fixed', 'testing', 'unit test', 'server', 'deploy', 'git', 'function',
    'loop', 'array', 'dictionary', 'class', 'complexity', 'space', 'time', 'return'
  ];

  let techCount = 0;
  techKeywords.forEach(kw => {
    if (normAns.includes(kw)) techCount++;
  });

  if (techCount >= 4) {
    score += 30;
    feedbackPoints.push('Excellent use of industry-standard technical terminology.');
  } else if (techCount >= 2) {
    score += 18;
    feedbackPoints.push('Good technical vocabulary. Try adding more specific toolnames or architectural design details.');
  } else {
    score += 8;
    feedbackPoints.push('Incorporate more technical keywords, frameworks, or database terms directly related to the question.');
  }

  if (questionType === 'coding') {
    feedbackPoints.push('For coding answers, include your approach, edge cases, and time complexity.');
  }

  score = Math.min(score, 100);

  return {
    score,
    feedback: feedbackPoints.join(' ')
  };
};

const shuffleArray = (array) => {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const buildInterviewQuestions = (role, technology, questionCount) => {
  const roleConfig = questionBank[role] || questionBank['Software Engineer'];
  const techConfig = roleConfig.technology[technology] || roleConfig.technology.General || { technical: [], coding: [] };
  const techTechnicalQuestions = Array.isArray(techConfig) ? techConfig : (techConfig.technical || []);
  const techCodingQuestions = Array.isArray(techConfig) ? [] : (techConfig.coding || []);

  const pool = [
    ...roleConfig.behavioral.map(q => ({ text: q, type: 'behavioral' })),
    ...roleConfig.technical.map(q => ({ text: q, type: 'technical' })),
    ...techTechnicalQuestions.map(q => ({ text: q, type: 'technical' })),
    ...roleConfig.coding.map(q => ({ text: q, type: 'coding' })),
    ...techCodingQuestions.map(q => ({ text: q, type: 'coding' }))
  ];

  const shuffled = shuffleArray(pool);
  const targetCount = Math.min(Math.max(6, questionCount || 10), 10);
  let selected = shuffled.slice(0, targetCount);

  if (!selected.some(q => q.type === 'coding')) {
    const codingPool = shuffleArray([...roleConfig.coding, ...techCodingQuestions]);
    if (codingPool.length > 0) {
      selected[targetCount - 1] = {
        text: codingPool[0],
        type: 'coding'
      };
    }
  }

  return selected.map(item => ({
    questionText: item.text,
    questionType: item.type,
    technology,
    userResponse: '',
    feedback: '',
    score: 0
  }));
};

exports.startInterview = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const targetRole = req.body.jobRole || user.targetRole || 'Software Engineer';
    const technology = req.body.technology || 'General';
    const questionCount = Number(req.body.questionCount) || 10;

    const formattedQuestions = buildInterviewQuestions(targetRole, technology, questionCount);

    const mockInterview = await MockInterview.create({
      user: req.user.id,
      jobRole: targetRole,
      technology,
      questionCount: formattedQuestions.length,
      questions: formattedQuestions,
      overallScore: 0,
      generalFeedback: 'Interview started.'
    });

    res.status(201).json({
      success: true,
      data: mockInterview
    });
  } catch (err) {
    next(err);
  }
};

exports.submitInterview = async (req, res, next) => {
  try {
    const { responses } = req.body;
    const interviewId = req.params.id;

    const interview = await MockInterview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, error: 'Interview not found' });
    }

    let totalScore = 0;
    const questionsCount = interview.questions.length;

    for (let idx = 0; idx < questionsCount; idx++) {
      const q = interview.questions[idx];
      const userRes = responses.find(r => r.questionId === q._id.toString()) || responses[idx];
      const answerText = userRes ? userRes.answer : '';

      let evaluation = await aiService.gradeInterviewAnswerWithAI(q.questionText, answerText, q.questionType || 'technical');
      if (!evaluation) {
        evaluation = gradeInterviewAnswer(q.questionText, answerText, q.questionType || 'technical');
      }

      q.userResponse = answerText;
      q.score = evaluation.score;
      q.feedback = evaluation.feedback;

      totalScore += evaluation.score;
    }

    const overallScore = Math.round(totalScore / questionsCount);

    let generalFeedback = '';
    let strengths = [];
    let weaknesses = [];
    let improvementSuggestions = [];
    let interviewReadiness = 'Needs Practice';

    const aiReport = await aiService.generateInterviewOverallReportWithAI(interview.jobRole, interview.technology, interview.questions);
    if (aiReport) {
      generalFeedback = aiReport.generalFeedback;
      strengths = aiReport.strengths || [];
      weaknesses = aiReport.weaknesses || [];
      improvementSuggestions = aiReport.improvementSuggestions || [];
      interviewReadiness = aiReport.interviewReadiness || 'Needs Practice';
    } else {
      if (overallScore >= 80) {
        generalFeedback = 'Excellent performance! You expressed technical terms clearly, structured your answers with strong story flow, and included specific examples. You are interview-ready.';
        strengths = ['Clear technical vocabulary', 'Structured answers', 'Provided relevant details'];
        weaknesses = ['Could add more time-complexity context for coding sections'];
        improvementSuggestions = ['Practice deep-diving into system design concepts to elevate responses further.'];
        interviewReadiness = 'Highly Placement Ready';
      } else if (overallScore >= 60) {
        generalFeedback = 'Good effort. Your technical insights are solid, but you should practice explaining your project outcomes and approach with more specificity. Try applying the STAR method throughout.';
        strengths = ['Demonstrates foundational domain knowledge', 'Adequate length of responses'];
        weaknesses = ['Needs more project metrics or concrete examples', 'Missed opportunities to apply STAR structure'];
        improvementSuggestions = ['Structure behavioral answers with Situation, Task, Action, and Result explicitly.'];
        interviewReadiness = 'Needs Practice';
      } else {
        generalFeedback = 'Requires improvement. Focus on providing longer, more explanatory answers. Use precise technical terminology and structure your responses around a problem-action-resolution framework.';
        strengths = ['Basic comprehension of interview topics'];
        weaknesses = ['Answers are too short', 'Lack of technical terminology and depth'];
        improvementSuggestions = ['Expand responses to at least 3-4 full sentences and explicitly describe past projects.'];
        interviewReadiness = 'Requires Significant Work';
      }
    }

    interview.overallScore = overallScore;
    interview.generalFeedback = generalFeedback;
    interview.strengths = strengths;
    interview.weaknesses = weaknesses;
    interview.improvementSuggestions = improvementSuggestions;
    interview.interviewReadiness = interviewReadiness;
    interview.status = 'completed';
    interview.completedAt = new Date();
    await interview.save();

    res.status(200).json({
      success: true,
      data: interview
    });
  } catch (err) {
    next(err);
  }
};

exports.getInterviewHistory = async (req, res, next) => {
  try {
    const interviews = await MockInterview.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: interviews.length,
      data: interviews
    });
  } catch (err) {
    next(err);
  }
};

exports.getAdminInterviewReports = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can access interview reports' });
    }

    const interviews = await MockInterview.find()
      .populate('user', 'name email targetRole role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: interviews.length,
      data: interviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get available interview roles and technologies
// @route   GET /api/interviews/metadata
// @access  Private
exports.getMetadata = async (req, res, next) => {
  try {
    const [roles, technologies] = await Promise.all([
      InterviewRole.find().sort({ name: 1 }),
      InterviewTechnology.find().sort({ name: 1 })
    ]);
    res.status(200).json({
      success: true,
      data: {
        roles: roles.map(r => r.name),
        technologies: technologies.map(t => t.name)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a new interview role (Admin only)
// @route   POST /api/interviews/roles
// @access  Private/Admin
exports.addRole = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Role name is required.' });
    }
    const existing = await InterviewRole.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'This role already exists.' });
    }
    const newRole = await InterviewRole.create({ name: name.trim(), isCustom: true });
    res.status(201).json({ success: true, data: newRole });
  } catch (err) {
    next(err);
  }
};

// @desc    Add a new interview technology (Admin only)
// @route   POST /api/interviews/technologies
// @access  Private/Admin
exports.addTechnology = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Technology name is required.' });
    }
    const existing = await InterviewTechnology.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'This technology already exists.' });
    }
    const newTech = await InterviewTechnology.create({ name: name.trim(), isCustom: true });
    res.status(201).json({ success: true, data: newTech });
  } catch (err) {
    next(err);
  }
};

