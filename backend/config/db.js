const mongoose = require('mongoose');
const User = require('../models/User');
const { InterviewRole, InterviewTechnology } = require('../models/InterviewMetadata');

const DEFAULT_ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'DevOps Engineer',
  'Cloud Engineer', 'Mobile Developer', 'Android Developer', 'iOS Developer',
  'React Native Developer', 'QA Engineer', 'Automation Tester', 'Security Engineer',
  'Cybersecurity Analyst', 'Database Administrator', 'Embedded Systems Engineer',
  'Game Developer', 'AR/VR Developer', 'Blockchain Developer', 'AI Engineer',
  'UI/UX Designer', 'Product Manager', 'Scrum Master', 'Solutions Architect', 'Site Reliability Engineer'
];

const DEFAULT_TECHNOLOGIES = [
  'General', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C',
  'Go', 'Rust', 'Kotlin', 'Swift', 'PHP', 'Ruby', 'Scala', 'R',
  'React', 'Angular', 'Vue.js', 'Next.js', 'Svelte', 'Node.js', 'Express.js',
  'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', 'Ruby on Rails',
  'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud (GCP)', 'Terraform',
  'Git', 'GraphQL', 'REST API', 'gRPC', 'Microservices', 'TensorFlow',
  'PyTorch', 'NumPy', 'Pandas', 'Spark', 'Hadoop', 'Kafka', 'RabbitMQ'
];

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI || '';
    if (mongoUri.includes('<') && mongoUri.includes('>')) {
      mongoUri = mongoUri.replace(/<([^>]+)>/g, '$1');
    }
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed Default Administrator & Faculty Accounts
    const defaultAccounts = [
      {
        name: 'Administrator',
        email: 'vpraveen88105@gmail.com',
        password: 'Praveen@1234',
        role: 'admin',
        mustChangePassword: false
      },
      {
        name: 'Dr. Madhuri (Faculty Coordinator)',
        email: 'madhuri845@grietcollege.com',
        password: 'TNPMadhuri@845',
        role: 'faculty',
        mustChangePassword: false,
        managedScopes: [],
        managedAcademicYears: []
      },
      {
        name: 'Faculty Coordinator',
        email: 'theaibulletin.media@gmail.com',
        password: 'Ajay@1234',
        role: 'faculty',
        mustChangePassword: false,
        managedScopes: [
          { academicYear: '2026', branch: 'CSE', section: 'A' },
          { academicYear: '2026', branch: 'CSE', section: 'B' },
          { academicYear: '2026', branch: 'IT', section: 'A' },
          { academicYear: '2026', branch: 'AIML', section: 'A' },
          { academicYear: '2026', branch: 'ECE', section: 'A' },
          { academicYear: '2027', branch: 'CSE', section: 'A' },
          { academicYear: '2027', branch: 'CSE', section: 'C' },
          { academicYear: '2027', branch: 'IT', section: 'A' },
          { academicYear: '2028', branch: 'CSE', section: 'A' },
          { academicYear: '2028', branch: 'IT', section: 'A' },
          { academicYear: '2028', branch: 'ECE', section: 'A' },
          { academicYear: '4th Year', branch: 'CSE', section: 'C' }
        ],
        managedAcademicYears: ['2026', '2027', '2028', '4th Year']
      },
      {
        name: 'Super Administrator',
        email: 'vaddeajaykumar2004@gmail.com',
        password: 'Ajay@9182',
        role: 'admin',
        mustChangePassword: false
      },
      {
        name: 'Dr. Baimuthakala Ajay Kumar (HOD - IT)',
        email: 'ajaykumarbymuthakala@gmail.com',
        password: 'HODIT@1234',
        role: 'hod',
        branch: 'IT',
        targetRole: 'Head of Department (IT)',
        mobileNumber: '8074701052',
        phone: '8074701052',
        mustChangePassword: false,
        managedScopes: [
          { academicYear: '2026', branch: 'IT', section: 'A' },
          { academicYear: '2026', branch: 'IT', section: 'B' },
          { academicYear: '2027', branch: 'IT', section: 'A' },
          { academicYear: '2027', branch: 'IT', section: 'B' },
          { academicYear: '2028', branch: 'IT', section: 'A' },
          { academicYear: '2028', branch: 'IT', section: 'B' },
          { academicYear: '4th Year', branch: 'IT', section: 'A' }
        ],
        managedAcademicYears: ['2026', '2027', '2028', '4th Year']
      }
    ];

    for (const acc of defaultAccounts) {
      let existingUser = await User.findOne({ email: acc.email }).select('+password');
      if (existingUser) {
        let modified = false;
        // Preserve user's configured role - only set if missing
        if (!existingUser.role && acc.role) {
          existingUser.role = acc.role;
          modified = true;
        }
        if (acc.branch && !existingUser.branch) {
          existingUser.branch = acc.branch;
          modified = true;
        }
        if (acc.mobileNumber && !existingUser.mobileNumber) {
          existingUser.mobileNumber = acc.mobileNumber;
          existingUser.phone = acc.phone || acc.mobileNumber;
          modified = true;
        }
        if (acc.targetRole && !existingUser.targetRole) {
          existingUser.targetRole = acc.targetRole;
          modified = true;
        }
        if (acc.managedScopes && acc.managedScopes.length > 0 && (!existingUser.managedScopes || existingUser.managedScopes.length === 0)) {
          existingUser.managedScopes = acc.managedScopes;
          modified = true;
        }
        if (acc.managedAcademicYears && acc.managedAcademicYears.length > 0 && (!existingUser.managedAcademicYears || existingUser.managedAcademicYears.length === 0)) {
          existingUser.managedAcademicYears = acc.managedAcademicYears;
          modified = true;
        }
        if (modified) {
          await existingUser.save();
        }
        console.log(`Account (${acc.email}) verified.`);
      } else {
        await User.create({
          name: acc.name,
          email: acc.email,
          password: acc.password,
          role: acc.role,
          branch: acc.branch || '',
          targetRole: acc.targetRole || '',
          mobileNumber: acc.mobileNumber || '',
          phone: acc.phone || '',
          mustChangePassword: false,
          managedScopes: acc.managedScopes || [],
          managedAcademicYears: acc.managedAcademicYears || []
        });
        console.log(`Default ${acc.role} account (${acc.email}) created.`);
      }
    }

    // Seed Interview Roles if collection is empty
    const roleCount = await InterviewRole.countDocuments();
    if (roleCount === 0) {
      await InterviewRole.insertMany(DEFAULT_ROLES.map(name => ({ name })));
      console.log(`Seeded ${DEFAULT_ROLES.length} interview roles.`);
    }

    // Seed Interview Technologies if collection is empty
    const techCount = await InterviewTechnology.countDocuments();
    if (techCount === 0) {
      await InterviewTechnology.insertMany(DEFAULT_TECHNOLOGIES.map(name => ({ name })));
      console.log(`Seeded ${DEFAULT_TECHNOLOGIES.length} interview technologies.`);
    }

    // Start automated annual rollover check
    const rollForwardQuestionYears = async () => {
      try {
        const Question = require('../models/Question');
        const PracticeQuestion = require('../models/PracticeQuestion');
        const AptitudeTest = require('../models/AptitudeTest');

        const currentYear = new Date().getFullYear();

        // Find the maximum year currently present across collections
        const maxQ = await Question.findOne().sort({ year: -1 }).select('year');
        const maxPractice = await PracticeQuestion.findOne().sort({ year: -1 }).select('year');
        const maxTest = await AptitudeTest.findOne().sort({ year: -1 }).select('year');

        const maxYear = Math.max(
          maxQ?.year || 2025,
          maxPractice?.year || 2025,
          maxTest?.year || 2025
        );

        if (currentYear > maxYear) {
          const diff = currentYear - maxYear;
          console.log(`[Auto-Rollover] New year detected (${currentYear} > ${maxYear}). Rolling forward question years by +${diff}...`);
          
          await Question.updateMany({ year: { $exists: true } }, { $inc: { year: diff } });
          await PracticeQuestion.updateMany({ year: { $exists: true } }, { $inc: { year: diff } });
          await AptitudeTest.updateMany({ year: { $exists: true } }, { $inc: { year: diff } });
          
          console.log('[Auto-Rollover] Roll forward completed successfully!');
        } else {
          console.log(`[Auto-Rollover] Question years are up to date (Max year: ${maxYear}, Current year: ${currentYear}).`);
        }
      } catch (rollErr) {
        console.error(`[Auto-Rollover Error] Failed to execute rollover: ${rollErr.message}`);
      }
    };

    // Run rollover immediately on DB connection
    await rollForwardQuestionYears();

    // Setup periodic check every 24 hours
    setInterval(rollForwardQuestionYears, 24 * 60 * 60 * 1000);

  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
