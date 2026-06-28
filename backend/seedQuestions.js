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
        tags: ['Array', 'Hash Table'],
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
        tags: ['Linked List'],
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
        tags: ['Stack', 'String'],
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
