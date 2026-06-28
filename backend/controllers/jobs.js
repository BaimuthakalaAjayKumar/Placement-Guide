const Job = require('../models/Job');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Seed default jobs if database has none
const seedDefaultJobs = async () => {
  try {
    const count = await Job.countDocuments();
    if (count > 0) return;

    const defaultJobs = [
      {
        title: 'Frontend Developer',
        company: 'InnovateTech Solutions',
        description: 'We are looking for a passionate Frontend Developer to build next-generation user interfaces. You will collaborate with design teams and translate wireframes into interactive React components.',
        requirements: ['React', 'Redux', 'TypeScript', 'HTML', 'CSS', 'Tailwind'],
        location: 'Bangalore, India (Hybrid)',
        salary: '₹8,00,000 - ₹12,00,000 LPA',
        experienceLevel: 'Entry Level',
        applyLink: 'https://careers.innovatetech.com/jobs/frontend'
      },
      {
        title: 'Backend Developer',
        company: 'CloudSphere Systems',
        description: 'Join our infrastructure squad building microservices and managing cloud architectures. You will develop highly performant REST APIs, manage database scaling, and implement security tokens.',
        requirements: ['Node.js', 'Express', 'MongoDB', 'SQL', 'REST API', 'Docker', 'JWT'],
        location: 'Remote',
        salary: '₹9,00,000 - ₹14,00,000 LPA',
        experienceLevel: 'Associate',
        applyLink: 'https://careers.cloudspheresystems.com/jobs/backend'
      },
      {
        title: 'Full Stack Developer',
        company: 'AppForge Studio',
        description: 'Looking for a generalist engineer capable of owning feature deliveries end-to-end. You will work across React frontends, Node backends, and handle deployment pipelines.',
        requirements: ['React', 'Node.js', 'Express', 'MongoDB', 'Git', 'REST API', 'JavaScript', 'Tailwind'],
        location: 'Mumbai, India (On-site)',
        salary: '₹10,00,000 - ₹16,00,000 LPA',
        experienceLevel: 'Entry Level',
        applyLink: 'https://careers.appforgestudio.com/jobs/fullstack'
      },
      {
        title: 'Software Engineer - Intern',
        company: 'Global Software Labs',
        description: 'Great opportunity for freshers to kickstart their career. Work on product engineering, study production systems, write test cases, and learn under experienced mentors.',
        requirements: ['Data Structures', 'Algorithms', 'OOPs', 'Java', 'Python', 'Git', 'SQL'],
        location: 'Pune, India (Hybrid)',
        salary: '₹35,000 / month',
        experienceLevel: 'Internship',
        applyLink: 'https://careers.globalswlabs.com/intern'
      },
      {
        title: 'Junior Data Scientist',
        company: 'DataMetrics AI',
        description: 'Analyze user behavior, clean unstructured datasets, train regression/classification models, and generate product performance dashboards.',
        requirements: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'NumPy', 'Tableau', 'Statistics'],
        location: 'Remote',
        salary: '₹11,00,000 - ₹15,00,000 LPA',
        experienceLevel: 'Entry Level',
        applyLink: 'https://careers.datametrics.com/jobs/datascientist'
      }
    ];

    await Job.create(defaultJobs);
    console.log('Default job listings seeded successfully!');
  } catch (err) {
    console.error(`Job Seeding Error: ${err.message}`);
  }
};

// Call seeder on startup
seedDefaultJobs();

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Private
exports.getJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get personalized job recommendations based on user skills
// @route   GET /api/jobs/recommendations
// @access  Private
exports.getJobRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const userSkills = user.skills.map(s => s.toLowerCase());

    const jobs = await Job.find();

    const recommendedJobs = jobs.map(job => {
      const jobReqs = job.requirements.map(r => r.toLowerCase());
      
      // Calculate matching skills
      const matchedSkills = jobReqs.filter(reqSkill => 
        userSkills.some(userSkill => userSkill.includes(reqSkill) || reqSkill.includes(userSkill))
      );

      const matchPercent = jobReqs.length > 0 
        ? Math.round((matchedSkills.length / jobReqs.length) * 100)
        : 0;

      // Map display matched skills
      const matchedSkillsDisplay = job.requirements.filter(reqSkill =>
        userSkills.some(userSkill => userSkill.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(userSkill))
      );

      const missingSkills = job.requirements.filter(reqSkill =>
        !matchedSkillsDisplay.includes(reqSkill)
      );

      return {
        _id: job._id,
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        salary: job.salary,
        experienceLevel: job.experienceLevel,
        applyLink: job.applyLink,
        matchPercentage: matchPercent,
        matchedSkills: matchedSkillsDisplay,
        missingSkills
      };
    });

    // Sort by match percentage descending
    recommendedJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.status(200).json({
      success: true,
      count: recommendedJobs.length,
      data: recommendedJobs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a job posting (Admin only)
// @route   POST /api/jobs
// @access  Private/Admin
exports.createJob = async (req, res, next) => {
  try {
    const job = await Job.create(req.body);

    // Find all registered students to email notify them
    const students = await User.find({ role: 'student' });
    
    students.forEach(student => {
      sendEmail({
        to: student.email,
        subject: `New Job Opportunity: ${job.title} at ${job.company}`,
        text: `Hello ${student.name},\n\nA new job opportunity has been posted on PrepPortal!\n\nPosition: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nSalary: ${job.salary}\n\nRequirements: ${job.requirements.join(', ')}\n\nLog in to your PrepPortal dashboard (http://localhost:5173/jobs) to view your skill match percentage and apply!\n\nBest regards,\nPrepPortal Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 5px;">New Job Alert!</h2>
            <p style="font-size: 16px; color: #333;">Hello <strong>${student.name}</strong>,</p>
            <p style="font-size: 14px; color: #555;">A new job opportunity has been published on PrepPortal that matches your potential skill profile.</p>
            
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5;">
              <h3 style="margin: 0 0 10px 0; color: #111827;">${job.title}</h3>
              <p style="margin: 5px 0; font-size: 14px; color: #4b5563;"><strong>Company:</strong> ${job.company}</p>
              <p style="margin: 5px 0; font-size: 14px; color: #4b5563;"><strong>Location:</strong> ${job.location}</p>
              <p style="margin: 5px 0; font-size: 14px; color: #4b5563;"><strong>Salary:</strong> ${job.salary}</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Requirements:</strong></p>
              <p style="margin: 5px 0 0 0;">
                ${job.requirements.map(req => `<span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; margin-bottom: 5px;">${req}</span>`).join('')}
              </p>
            </div>

            <p style="font-size: 14px; color: #555;">Log in to your dashboard to analyze your resume against this job, check match ratings, and apply directly!</p>
            
            <div style="text-align: center; margin-top: 25px;">
              <a href="http://localhost:5173/jobs" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">View Job Board</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0 15px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">You are receiving this because you are registered as a student on PrepPortal.</p>
          </div>
        `
      }).catch(err => console.error(`Error sending job alert email to ${student.email}:`, err.message));
    });

    res.status(201).json({
      success: true,
      data: job
    });
  } catch (err) {
    next(err);
  }
};
