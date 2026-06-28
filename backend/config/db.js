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
    const conn = await mongoose.connect(process.env.MONGODB_URI);
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

  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
