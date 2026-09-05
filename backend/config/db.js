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

    // Seed Administrator Account
    const adminEmail = 'vaddeajaykumar2004@gmail.com';
    let admin = await User.findOne({ email: adminEmail });
    if (admin) {
      admin.name = 'Administrator';
      admin.password = 'Ajay@9182';
      admin.role = 'admin';
      await admin.save();
      console.log(`Admin account (${adminEmail}) updated/synced successfully!`);
    } else {
      await User.create({
        name: 'Administrator',
        email: adminEmail,
        password: 'Ajay@9182',
        role: 'admin'
      });
      console.log(`Admin account (${adminEmail}) created successfully!`);
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
    process.exit(1);
  }
};

module.exports = connectDB;
