const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Question = require('./models/Question');
const PracticeQuestion = require('./models/PracticeQuestion');
const AptitudeTest = require('./models/AptitudeTest');
const User = require('./models/User');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const seedCompanyQuestions = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database.');

    // Find an admin user to assign createdBy
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.findOne({});
    }
    if (!admin) {
      console.log('No user found to assign as creator. Please run backend server first to seed default admin.');
      process.exit(1);
    }

    const currentYear = new Date().getFullYear();

    console.log('Seeding company-specific coding questions...');
    const companyCodingQuestions = [
      {
        title: 'Google: Unique Paths III',
        difficulty: 'Hard',
        description: 'You are given an m x n integer array grid where grid[i][j] could be:\n- 1 representing the starting square.\n- 2 representing the ending square.\n- 0 representing empty squares we can walk over.\n- -1 representing obstacles that we cannot walk over.\n\nReturn the number of 4-directional walks from the starting square to the ending square, that walk over every non-obstacle square exactly once.',
        constraints: 'm == grid.length, n == grid[i].length\n1 <= m * n <= 20\ngrid[i][j] is -1, 0, 1, or 2.',
        inputFormat: 'm followed by n, then the grid rows.',
        outputFormat: 'Number of unique paths.',
        sampleInput: '3 4\n1 0 0 0\n0 0 0 0\n0 0 2 -1',
        sampleOutput: '2',
        explanation: 'There are two paths: walk over all empty cells exactly once.',
        tags: ['Array', 'Backtracking', 'Algorithms'],
        company: 'google',
        year: currentYear,
        createdBy: admin._id,
        visibleTestCases: [{ input: '3 4\n1 0 0 0\n0 0 0 0\n0 0 2 -1', output: '2' }],
        hiddenTestCases: [{ input: '2 2\n1 0\n0 2', output: '1' }]
      },
      {
        title: 'Amazon: Merge Intervals',
        difficulty: 'Medium',
        description: 'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
        constraints: '1 <= intervals.length <= 10^4\nintervals[i].length == 2',
        inputFormat: 'Number of intervals, followed by start and end for each interval.',
        outputFormat: 'Merged intervals list.',
        sampleInput: '4\n1 3\n2 6\n8 10\n15 18',
        sampleOutput: '[[1, 6], [8, 10], [15, 18]]',
        explanation: 'Since intervals [1,3] and [2,6] overlap, merge them into [1,6].',
        tags: ['Array', 'Sorting', 'Algorithms'],
        company: 'amazon',
        year: currentYear,
        createdBy: admin._id,
        visibleTestCases: [{ input: '4\n1 3\n2 6\n8 10\n15 18', output: '[[1, 6], [8, 10], [15, 18]]' }],
        hiddenTestCases: [{ input: '2\n1 4\n4 5', output: '[[1, 5]]' }]
      },
      {
        title: 'Microsoft: Valid Parentheses Matcher',
        difficulty: 'Easy',
        description: 'Determine if an input string of brackets is valid. Brackets must close in matching pairs.',
        constraints: 'Length of string <= 10^4',
        inputFormat: 'Brackets string.',
        outputFormat: 'true or false.',
        sampleInput: '()[]{}',
        sampleOutput: 'true',
        explanation: 'Brackets match correctly.',
        tags: ['Stack', 'Algorithms'],
        company: 'microsoft',
        year: currentYear,
        createdBy: admin._id,
        visibleTestCases: [{ input: '()[]{}', output: 'true' }],
        hiddenTestCases: [{ input: '(]', output: 'false' }]
      }
    ];

    for (const q of companyCodingQuestions) {
      await Question.updateOne({ title: q.title }, { $set: q }, { upsert: true });
    }
    console.log('Seeded coding questions.');

    console.log('Seeding company-specific practice questions (LeetCode links)...');
    const practiceQuestions = [
      {
        platform: 'leetcode',
        id: 9001,
        title: 'Google: K-th Largest Element in an Array',
        difficulty: 'Medium',
        acceptance: '66.4%',
        slug: 'kth-largest-element-in-an-array',
        solution: 'Use a min-heap of size K to track largest elements.',
        tags: ['Heap', 'Divide and Conquer'],
        company: 'google',
        year: currentYear
      },
      {
        platform: 'leetcode',
        id: 9002,
        title: 'Amazon: Longest Substring Without Repeating Characters',
        difficulty: 'Medium',
        acceptance: '34.8%',
        slug: 'longest-substring-without-repeating-characters',
        solution: 'Use sliding window with two pointers and a Hash Set.',
        tags: ['Sliding Window', 'Hash Table'],
        company: 'amazon',
        year: currentYear
      },
      {
        platform: 'codechef',
        id: 9003,
        title: 'TCS: Chef and Coupon',
        difficulty: 'Easy',
        acceptance: '53.2%',
        slug: 'chef-and-coupon',
        solution: 'Calculate total cost with and without discount coupons.',
        tags: ['Greedy', 'Algorithms'],
        company: 'tcs',
        year: currentYear
      },
      {
        platform: 'hackerrank',
        id: 9004,
        title: 'Infosys: Road Reconstruction Map',
        difficulty: 'Hard',
        acceptance: '41.1%',
        slug: 'road-reconstruction',
        solution: 'Use Kruskals Minimum Spanning Tree algorithm.',
        tags: ['Graph', 'Disjoint Set'],
        company: 'infosys',
        year: currentYear
      }
    ];

    for (const pq of practiceQuestions) {
      await PracticeQuestion.updateOne({ platform: pq.platform, id: pq.id }, { $set: pq }, { upsert: true });
    }
    console.log('Seeded practice questions.');

    console.log('Seeding company-specific aptitude and core subject MCQ tests...');
    const companyTests = [
      {
        title: 'Google: Advanced Algorithms & Logic Test',
        description: 'Past year assessment covering probability, combinatorics, and dynamic programming heuristics.',
        category: 'aptitude',
        difficulty: 'hard',
        duration: 20,
        company: 'google',
        year: currentYear,
        questions: [
          {
            questionText: 'What is the probability of rolling a sum of 9 with two fair six-sided dice?',
            options: ['1/9', '1/12', '5/36', '1/6'],
            correctOptionIndex: 0,
            difficulty: 'easy',
            explanation: 'Favorable outcomes are (3,6), (4,5), (5,4), (6,3), which is 4/36 = 1/9.'
          },
          {
            questionText: 'Which algorithm design technique is used to solve the 0/1 Knapsack problem optimally in pseudo-polynomial time?',
            options: ['Greedy Approach', 'Divide and Conquer', 'Dynamic Programming', 'Backtracking'],
            correctOptionIndex: 2,
            difficulty: 'medium',
            explanation: 'Dynamic Programming breaks the problem down into subproblems and stores intermediate state values.'
          }
        ]
      },
      {
        title: 'TCS: NQT Cognitive & Quantitative Aptitude Test',
        description: 'TCS National Qualifier Test quantitative preparation covering work-time, speed, and logical reasoning.',
        category: 'aptitude',
        difficulty: 'medium',
        duration: 20,
        company: 'tcs',
        year: currentYear,
        questions: [
          {
            questionText: 'A can do work in 10 days. B is 60% more efficient than A. How many days will B take alone?',
            options: ['6.25 days', '5.5 days', '7 days', '8.25 days'],
            correctOptionIndex: 0,
            difficulty: 'medium',
            explanation: 'Efficiency ratio is B:A = 1.6:1. B days = 10 / 1.6 = 6.25 days.'
          }
        ]
      },
      {
        title: 'Amazon: Systems & DBMS Technical Round Test',
        description: 'Core computer science MCQ test featuring transaction locking levels, virtual memory schemes, and protocol handshakes.',
        category: 'dbms',
        difficulty: 'hard',
        duration: 20,
        company: 'amazon',
        year: currentYear,
        questions: [
          {
            questionText: 'Which transaction isolation level provides full protection against phantom reads, dirty reads, and non-repeatable reads?',
            options: ['Serializable', 'Repeatable Read', 'Read Committed', 'Read Uncommitted'],
            correctOptionIndex: 0,
            difficulty: 'hard',
            explanation: 'Serializable provides the highest isolation level and fully prevents all read anomalies.'
          }
        ]
      }
    ];

    for (const test of companyTests) {
      await AptitudeTest.updateOne({ title: test.title }, { $set: test }, { upsert: true });
    }
    console.log('Seeded company-specific tests.');

    console.log('All company-specific questions seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding company questions:', err);
    process.exit(1);
  }
};

seedCompanyQuestions();
