const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

async function seedHod() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    const email = 'ajaykumarbymuthakala@gmail.com';
    const plainPassword = 'HODIT@1234';

    let user = await User.findOne({ email }).select('+password');
    if (user) {
      console.log(`User ${email} found with current role: ${user.role}`);
      user.role = 'hod';
      user.branch = 'IT';
      user.name = 'Dr. Baimuthakala Ajay Kumar (HOD - IT)';
      user.targetRole = 'Head of Department (IT)';
      user.mobileNumber = '8074701052';
      user.phone = '8074701052';
      user.password = plainPassword; // Will be hashed by pre('save')
      user.mustChangePassword = false;
      user.managedAcademicYears = ['2026', '2027', '2028', '4th Year'];
      user.managedScopes = [
        { academicYear: '2026', branch: 'IT', section: 'A' },
        { academicYear: '2026', branch: 'IT', section: 'B' },
        { academicYear: '2027', branch: 'IT', section: 'A' },
        { academicYear: '2027', branch: 'IT', section: 'B' },
        { academicYear: '2028', branch: 'IT', section: 'A' },
        { academicYear: '2028', branch: 'IT', section: 'B' },
        { academicYear: '4th Year', branch: 'IT', section: 'A' }
      ];
      await user.save();
      console.log(`✓ Updated HOD user ${email} successfully with role: hod, branch: IT, and password set.`);
    } else {
      user = await User.create({
        name: 'Dr. Baimuthakala Ajay Kumar (HOD - IT)',
        email,
        password: plainPassword,
        role: 'hod',
        branch: 'IT',
        targetRole: 'Head of Department (IT)',
        mobileNumber: '8074701052',
        phone: '8074701052',
        mustChangePassword: false,
        managedAcademicYears: ['2026', '2027', '2028', '4th Year'],
        managedScopes: [
          { academicYear: '2026', branch: 'IT', section: 'A' },
          { academicYear: '2026', branch: 'IT', section: 'B' },
          { academicYear: '2027', branch: 'IT', section: 'A' },
          { academicYear: '2027', branch: 'IT', section: 'B' },
          { academicYear: '2028', branch: 'IT', section: 'A' },
          { academicYear: '2028', branch: 'IT', section: 'B' },
          { academicYear: '4th Year', branch: 'IT', section: 'A' }
        ]
      });
      console.log(`✓ Created new HOD account for ${email} with role: hod, branch: IT`);
    }

    // Verify authentication match
    const checkUser = await User.findOne({ email }).select('+password');
    const isMatch = await checkUser.matchPassword(plainPassword);
    console.log(`✓ Password verification test for ${email}: ${isMatch ? 'PASSED' : 'FAILED'}`);

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seed HOD error:', err);
    process.exit(1);
  }
}

seedHod();
