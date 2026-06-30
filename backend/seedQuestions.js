const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Question = require('./models/Question');
const User = require('./models/User');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const seedQuestions = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // Find an admin user to assign createdBy
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      // Find any user as fallback
      admin = await User.findOne({});
    }

    if (!admin) {
      console.log('No user found to assign as creator. Please register a user first.');
      process.exit(1);
    }

    console.log('Clearing old questions...');
    await Question.deleteMany({});

    console.log('Inserting sample questions...');

    const questions = [
      {
        title: 'Two Sum',
        difficulty: 'Easy',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
        constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
        inputFormat: 'The first line contains space-separated integers representing the array nums.\nThe second line contains a single integer representing the target.',
        outputFormat: 'Return the indices of the two numbers as space-separated integers or a bracketed array.',
        sampleInput: '2 7 11 15\n9',
        sampleOutput: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
        timeLimit: 2000,
        memoryLimit: 256,
        tags: ['Array', 'Hash Table', 'Algorithms'],
        allowedLanguages: ['javascript', 'python', 'cpp', 'java', 'c'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [
          { input: '2 7 11 15\n9', output: '[0, 1]' }
        ],
        hiddenTestCases: [
          { input: '3 2 4\n6', output: '[1, 2]' },
          { input: '3 3\n6', output: '[0, 1]' }
        ]
      },
      {
        title: 'Reverse Linked List',
        difficulty: 'Medium',
        description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
        constraints: 'The number of nodes in the list is the range [0, 5000].\n-5000 <= Node.val <= 5000',
        inputFormat: 'A space-separated list of integers representing node values.',
        outputFormat: 'A space-separated list of integers representing node values of the reversed list.',
        sampleInput: '1 2 3 4 5',
        sampleOutput: '5 4 3 2 1',
        explanation: 'Reversing 1->2->3->4->5 gives 5->4->3->2->1.',
        timeLimit: 2000,
        memoryLimit: 256,
        tags: ['Linked List', 'Data Structures'],
        allowedLanguages: ['javascript', 'python', 'cpp', 'java', 'c'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [
          { input: '1 2 3 4 5', output: '5 4 3 2 1' }
        ],
        hiddenTestCases: [
          { input: '1 2', output: '2 1' },
          { input: '9', output: '9' }
        ]
      },
      {
        title: 'Valid Parentheses',
        difficulty: 'Easy',
        description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
        constraints: '1 <= s.length <= 10^4\ns consists of parentheses only \'()[]{}\'.',
        inputFormat: 'A single string s representing the parentheses.',
        outputFormat: 'Print true if the string is valid, else print false.',
        sampleInput: '()[]{}',
        sampleOutput: 'true',
        explanation: 'The brackets match in correct order.',
        timeLimit: 2000,
        memoryLimit: 256,
        tags: ['Stack', 'String', 'Algorithms'],
        allowedLanguages: ['javascript', 'python', 'cpp', 'java', 'c'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [
          { input: '()[]{}', output: 'true' }
        ],
        hiddenTestCases: [
          { input: '(]', output: 'false' },
          { input: '([)]', output: 'false' },
          { input: '{[]}', output: 'true' }
        ]
      },
      {
        title: 'Binary Search',
        difficulty: 'Easy',
        description: 'Given a sorted array of integers nums and an integer target, find the index of target. If target does not exist, return -1.',
        constraints: '1 <= nums.length <= 10^4\n-10^4 <= nums[i], target <= 10^4\nAll integers in nums are unique and sorted.',
        inputFormat: 'The first line contains space-separated integers representing the sorted array nums.\nThe second line contains a single target value.',
        outputFormat: 'Print index of the target integer, or -1 if not found.',
        sampleInput: '-1 0 3 5 9 12\n9',
        sampleOutput: '4',
        explanation: '9 exists in nums and its index is 4.',
        timeLimit: 2000,
        memoryLimit: 256,
        tags: ['Array', 'Binary Search', 'Algorithms'],
        allowedLanguages: ['javascript', 'python', 'cpp', 'java', 'c'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [{ input: '-1 0 3 5 9 12\n9', output: '4' }],
        hiddenTestCases: [
          { input: '-1 0 3 5 9 12\n2', output: '-1' },
          { input: '5\n5', output: '0' }
        ]
      },
      {
        title: 'Factorial Recovery',
        difficulty: 'Easy',
        description: 'Implement a function that takes an integer N and returns its factorial.',
        constraints: '0 <= N <= 12',
        inputFormat: 'A single integer N.',
        outputFormat: 'Print N! value.',
        sampleInput: '5',
        sampleOutput: '120',
        explanation: '5! = 5 * 4 * 3 * 2 * 1 = 120.',
        timeLimit: 1000,
        memoryLimit: 128,
        tags: ['Recursion', 'C', 'C++', 'Java', 'Python', 'JavaScript'],
        allowedLanguages: ['javascript', 'python', 'cpp', 'java', 'c'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [{ input: '5', output: '120' }],
        hiddenTestCases: [
          { input: '0', output: '1' },
          { input: '1', output: '1' },
          { input: '10', output: '3628800' }
        ]
      },
      {
        title: 'SQL Simulator: Senior Employees Check',
        difficulty: 'Medium',
        description: 'Simulate a query filter that takes employee objects containing {name, yearsOfExperience, department} and filters those belonging to specific departments with >= 5 years of experience.',
        constraints: 'Input format represents array objects parsed inside runtime logic.',
        inputFormat: 'Space-separated list of experience counts followed by department tags.',
        outputFormat: 'Filtered counts representing senior staff.',
        sampleInput: '3 5 8 2\nSales Sales Dev Dev',
        sampleOutput: '2',
        explanation: 'Only employees with experience 5 (Sales) and 8 (Dev) are >= 5 years.',
        timeLimit: 3000,
        memoryLimit: 256,
        tags: ['SQL', 'Database', 'Logic'],
        allowedLanguages: ['javascript', 'python'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [{ input: '3 5 8 2\nSales Sales Dev Dev', output: '2' }],
        hiddenTestCases: [
          { input: '1 2 3\nHR HR HR', output: '0' },
          { input: '9 10 5\nTech Tech Tech', output: '3' }
        ]
      },
      {
        title: 'Bubble Sort Verification',
        difficulty: 'Easy',
        description: 'Verify the states of Bubble Sort algorithm by performing a single outer swap loop on an integer array.',
        constraints: '1 <= N <= 1000',
        inputFormat: 'Space-separated list of unsorted numbers.',
        outputFormat: 'Array elements after the first pass of bubble sort swaps.',
        sampleInput: '5 1 4 2 8',
        sampleOutput: '1 4 2 5 8',
        explanation: 'Bubble sort swaps larger values to the right. 5 swaps with 1, 4, 2 until it pairs with 8.',
        timeLimit: 2000,
        memoryLimit: 256,
        tags: ['Sorting', 'Algorithms', 'DSA'],
        allowedLanguages: ['javascript', 'python', 'cpp', 'java', 'c'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [{ input: '5 1 4 2 8', output: '1 4 2 5 8' }],
        hiddenTestCases: [
          { input: '2 1', output: '1 2' },
          { input: '1 2 3', output: '1 2 3' }
        ]
      },
      {
        title: 'Class Inheritance Calculator (OOP)',
        difficulty: 'Medium',
        description: 'Create an OOP geometry model containing a Shape base class and inheritance models representing a Rectangle. Calculate area properties.',
        constraints: 'Object fields instantiated through parameter targets.',
        inputFormat: 'Two double values specifying length and width.',
        outputFormat: 'Calculated area values.',
        sampleInput: '4.5 10.0',
        sampleOutput: '45.0',
        explanation: 'Rectangle Area = Length * Width = 4.5 * 10 = 45.0.',
        timeLimit: 2000,
        memoryLimit: 256,
        tags: ['OOP', 'C++', 'Java', 'Python'],
        allowedLanguages: ['javascript', 'python', 'cpp', 'java'],
        isActive: true,
        createdBy: admin._id,
        visibleTestCases: [{ input: '4.5 10.0', output: '45.0' }],
        hiddenTestCases: [
          { input: '3.0 5.0', output: '15.0' },
          { input: '0.0 6.0', output: '0.0' }
        ]
      }
    ];

    await Question.insertMany(questions);
    console.log('Seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding questions:', err);
    process.exit(1);
  }
};

seedQuestions();
