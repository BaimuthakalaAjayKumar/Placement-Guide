const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedAllDatabases() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB cluster...');
    const conn = await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB cluster successfully.');

    const client = conn.connection.client;
    const admin = conn.connection.db.admin();
    const dbList = await admin.listDatabases();
    const dbsToSeed = ['placement_portal', 'test'];

    // Also include any other database in cluster that already has a 'users' collection
    for (const d of dbList.databases) {
      if (!dbsToSeed.includes(d.name) && d.name !== 'admin' && d.name !== 'local' && d.name !== 'sample_mflix') {
        dbsToSeed.push(d.name);
      }
    }

    console.log('Databases targeted for HOD seeding:', dbsToSeed);

    const email = 'ajaykumarbymuthakala@gmail.com';
    const plainPassword = 'HODIT@1234';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    for (const dbName of dbsToSeed) {
      const db = client.db(dbName);
      const usersCol = db.collection('users');

      const hodData = {
        name: 'Dr. Baimuthakala Ajay Kumar (HOD - IT)',
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'hod',
        branch: 'IT',
        department: 'IT',
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
        ],
        updatedAt: new Date()
      };

      const existing = await usersCol.findOne({ email });
      if (existing) {
        await usersCol.updateOne(
          { email },
          { $set: hodData }
        );
        console.log(`✓ [${dbName}] Updated HOD user: ${email}`);
      } else {
        hodData.createdAt = new Date();
        await usersCol.insertOne(hodData);
        console.log(`✓ [${dbName}] Inserted new HOD user: ${email}`);
      }

      // Verify password test
      const checkUser = await usersCol.findOne({ email });
      const isMatch = await bcrypt.compare(plainPassword, checkUser.password);
      console.log(`✓ [${dbName}] Password verification test: ${isMatch ? 'PASSED' : 'FAILED'}`);
    }

    await mongoose.disconnect();
    console.log('All databases successfully seeded and verified with HOD account.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedAllDatabases();
