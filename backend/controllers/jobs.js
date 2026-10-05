const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { sendWhatsAppMessage } = require('../utils/sendWhatsApp');
const { logActivity } = require('../utils/auditLogger');

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
    const userSkills = (user.skills || []).map(s => s.toLowerCase());
    const userBranch = (user.branch || '').toLowerCase();
    const userCgpa = Number(user.cgpa) || 0;
    const userProjects = user.projects || [];
    const hasResume = Boolean(user.resume || (user.placementReadinessIndex && user.placementReadinessIndex > 20));

    const jobs = await Job.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    });

    const recommendedJobs = jobs.map(job => {
      const jobReqs = (job.requirements || []).map(r => r.toLowerCase());
      const whyYouMatch = [];
      const whatYouAreMissing = [];

      // 1. Skills Evaluation (Weight: 35%)
      const matchedSkills = jobReqs.filter(reqSkill =>
        userSkills.some(userSkill => userSkill.includes(reqSkill) || reqSkill.includes(userSkill))
      );
      const matchedSkillsDisplay = (job.requirements || []).filter(reqSkill =>
        userSkills.some(userSkill => userSkill.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(userSkill))
      );
      const missingSkills = (job.requirements || []).filter(reqSkill =>
        !matchedSkillsDisplay.includes(reqSkill)
      );
      const skillsScore = jobReqs.length > 0
        ? Math.round((matchedSkills.length / jobReqs.length) * 35)
        : 35;

      if (matchedSkills.length > 0) {
        whyYouMatch.push(`🎯 Matched ${matchedSkills.length}/${jobReqs.length} core required skills: ${matchedSkillsDisplay.slice(0, 4).join(', ')}`);
      }
      if (missingSkills.length > 0) {
        whatYouAreMissing.push(`⚠️ Missing skill requirements: ${missingSkills.slice(0, 3).join(', ')}`);
      }

      // 2. CGPA Evaluation (Weight: 25%)
      const minCgpa = Number(job.minCgpa) || 6.5;
      let cgpaScore = 0;
      if (userCgpa >= minCgpa) {
        cgpaScore = 25;
        whyYouMatch.push(`🎓 Academic CGPA (${userCgpa.toFixed(2)}) meets or exceeds requirement (>= ${minCgpa})`);
      } else if (userCgpa > 0) {
        cgpaScore = Math.round((userCgpa / minCgpa) * 20);
        whatYouAreMissing.push(`⚠️ CGPA (${userCgpa.toFixed(2)}) is below preferred cutoff of ${minCgpa}`);
      } else {
        cgpaScore = 15;
      }

      // 3. Branch / Department Evaluation (Weight: 20%)
      const targetBranches = (job.targetBranches || []).map(b => b.toLowerCase());
      let branchScore = 20;
      if (targetBranches.length > 0) {
        const isBranchMatch = targetBranches.some(b => b.includes(userBranch) || userBranch.includes(b) || b === 'all');
        if (isBranchMatch) {
          branchScore = 20;
          whyYouMatch.push(`🏛️ Branch eligibility satisfied: ${user.branch || 'General'} is directly eligible`);
        } else {
          branchScore = 5;
          whatYouAreMissing.push(`⚠️ Priority branch preference for: ${job.targetBranches.join(', ')}`);
        }
      } else {
        whyYouMatch.push(`🏛️ Open to all institutional branches and streams`);
      }

      // 4. Projects Alignment (Weight: 10%)
      let projectsScore = 5;
      if (userProjects.length >= 2) {
        projectsScore = 10;
        whyYouMatch.push(`📁 Portfolio contains ${userProjects.length} completed projects demonstrating practical implementation`);
      } else if (userProjects.length === 1) {
        projectsScore = 8;
        whyYouMatch.push(`📁 1 practical project documented on candidate profile`);
      } else {
        whatYouAreMissing.push(`⚠️ Minimal project portfolio. Adding 1-2 domain projects increases placement call probability.`);
      }

      // 5. Resume Verification (Weight: 10%)
      let resumeScore = 0;
      if (hasResume) {
        resumeScore = 10;
        whyYouMatch.push(`📄 Candidate resume is verified and structured with ATS keywords`);
      } else {
        resumeScore = 2;
        whatYouAreMissing.push(`⚠️ Incomplete resume on file. Complete AI Resume Builder to boost ATS screening.`);
      }

      const totalMatch = Math.min(100, Math.max(15, skillsScore + cgpaScore + branchScore + projectsScore + resumeScore));

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
        targetBatch: job.targetBatch,
        targetBatches: job.targetBatches || [],
        targetBranches: job.targetBranches || [],
        targetRoles: job.targetRoles || [],
        expiresAt: job.expiresAt,
        matchPercentage: totalMatch,
        matchedSkills: matchedSkillsDisplay,
        missingSkills,
        matchAnalysis: {
          whyYouMatch,
          whatYouAreMissing,
          breakdown: {
            skills: skillsScore,
            cgpa: cgpaScore,
            branch: branchScore,
            projects: projectsScore,
            resume: resumeScore
          }
        }
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

// @desc    Extend or set a job deadline (Admin only)
// @route   PUT /api/jobs/:id/expiry
// @access  Private/Admin
exports.updateJobExpiry = async (req, res, next) => {
  try {
    const { expiresAt } = req.body;
    const expiryDate = new Date(expiresAt);

    if (!expiresAt || Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Please provide a valid expiry date.' });
    }

    if (expiryDate <= new Date()) {
      return res.status(400).json({ success: false, error: 'Expiry date must be in the future.' });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { expiresAt: expiryDate },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const studentQuery = { role: 'student' };
    if (job.targetBatch && job.targetBatch !== 'All') {
      studentQuery.year = job.targetBatch.trim();
    }
    const students = await User.find(studentQuery).select('_id name email phone mobileNumber branch academicYear year');
    const formattedExpiry = expiryDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // In-app notifications
    await Notification.insertMany(students.map(student => ({
      user: student._id,
      type: 'job_update',
      message: `Application deadline extended for ${job.title} at ${job.company}. Apply by ${formattedExpiry}.`,
      metadata: { jobId: job._id, expiresAt: expiryDate }
    })));

    // Formatted WhatsApp message for extended deadline
    const waText = 
`⏰ *CAMPUS BRIDGE PLACEMENT ALERT: JOB DEADLINE EXTENDED*
----------------------------------------
Hello! The application deadline for the following campus placement opportunity has been extended:

🏢 *Company:* ${job.company}
💼 *Role:* ${job.title}
💰 *Package:* ${job.salary || 'Competitive CTC'}
⏰ *New Extended Deadline:* ${formattedExpiry}
📍 *Location:* ${job.location || 'Hyderabad / Pan-India'}
🎯 *Target Batch:* ${job.targetBatch || 'All Batches'}

⚠️ If you have not applied yet, please log in and submit your application before the extended deadline expires!

🔗 View & Apply on Placement Portal:
https://placement-guide-nu.vercel.app/jobs

Best regards,
Placement & Training Directorate, Campus Bridge`;

    // 1. Immediate WhatsApp notification to designated coordinator
    sendWhatsAppMessage({
      to: '8074701052',
      studentName: 'Placement Coordinator',
      driveTitle: `${job.company} - ${job.title}`,
      message: waText
    }).catch(err => console.warn('WhatsApp error for coordinator on job extension:', err.message));

    // 2. Optimized asynchronous WhatsApp batch dispatch to eligible students
    setImmediate(async () => {
      try {
        const studentsWithPhone = students.filter(s => {
          const ph = (s.mobileNumber || s.phone || '').replace(/\D/g, '');
          return ph.length >= 10;
        });

        const chunkSize = 8;
        for (let i = 0; i < studentsWithPhone.length; i += chunkSize) {
          const chunk = studentsWithPhone.slice(i, i + chunkSize);
          await Promise.allSettled(chunk.map(student => {
            const phone = student.mobileNumber || student.phone;
            return sendWhatsAppMessage({
              to: phone,
              studentName: student.name,
              driveTitle: `${job.company} - ${job.title}`,
              message: waText
            });
          }));
        }
        console.log(`[WHATSAPP EXTENSION NOTIFICATION]: Dispatched to ${studentsWithPhone.length} students.`);
      } catch (waErr) {
        console.warn('[WHATSAPP EXTENSION ERROR]:', waErr.message);
      }
    });

    // 3. Email notifications
    students.forEach(student => {
      sendEmail({
        to: student.email,
        subject: `Application deadline extended: ${job.title} at ${job.company}`,
        text: `Hello ${student.name},\n\nThe application deadline for ${job.title} at ${job.company} has been extended to ${formattedExpiry}. Log in to PrepPortal to view the job and apply.\n\nBest regards,\nPrepPortal Team`
      }).catch(err => console.error(`Error sending job deadline update to ${student.email}:`, err.message));
    });

    // 4. Audit Log
    try {
      await logActivity({
        user: req.user,
        action: 'JOB_DEADLINE_EXTENDED',
        category: 'Placement Operations',
        description: `Admin extended application deadline for ${job.company} (${job.title}) to ${formattedExpiry}`,
        details: { jobId: job._id, expiresAt: expiryDate, notifiedStudentsCount: students.length },
        req
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Job deadline extended to ${formattedExpiry}. WhatsApp alerts and ${students.length} student notification(s) dispatched successfully.`,
      data: job,
      whatsAppAlertSent: true
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
    const jobData = { ...req.body };

    // Format targetBatches if provided
    if (typeof jobData.targetBatches === 'string') {
      jobData.targetBatches = jobData.targetBatches.split(',').map(s => s.trim()).filter(Boolean);
    }
    // Format targetBranches if provided
    if (typeof jobData.targetBranches === 'string') {
      jobData.targetBranches = jobData.targetBranches.split(',').map(s => s.trim()).filter(Boolean);
    }
    // Format targetRoles if provided
    if (typeof jobData.targetRoles === 'string') {
      jobData.targetRoles = jobData.targetRoles.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (Array.isArray(jobData.targetBatches) && jobData.targetBatches.length > 0) {
      jobData.targetBatch = jobData.targetBatches.join(', ');
    }

    const job = await Job.create(jobData);

    // Filter students by graduation/batch year and branches if specified
    const query = { role: 'student' };

    const batchFilters = Array.isArray(job.targetBatches) && job.targetBatches.length > 0 && !job.targetBatches.includes('All')
      ? job.targetBatches
      : (job.targetBatch && job.targetBatch !== 'All' ? [job.targetBatch.trim()] : []);

    if (batchFilters.length > 0) {
      query.$or = [
        { year: { $in: batchFilters } },
        { academicYear: { $in: batchFilters } }
      ];
    }

    if (Array.isArray(job.targetBranches) && job.targetBranches.length > 0 && !job.targetBranches.includes('All')) {
      query.branch = { $in: job.targetBranches };
    }

    const students = await User.find(query);

    console.log("==================================");
    console.log(`Students Found for Batch (${job.targetBatch || 'All'}) & Branches (${(job.targetBranches || []).join(', ') || 'All'}):`, students.length);
    console.log(
      students.map(student => ({
        name: student.name,
        email: student.email,
        role: student.role,
        branch: student.branch,
        year: student.year
      }))
    );
    console.log("==================================");

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

// @desc    Delete a job listing (Admin only)
// @route   DELETE /api/jobs/:id
// @access  Private/Admin
exports.deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    await Job.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Job deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk create job postings (Admin only)
// @route   POST /api/jobs/bulk
// @access  Private/Admin
exports.bulkCreateJobs = async (req, res, next) => {
  try {
    const { jobs } = req.body;
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide an array of jobs' });
    }

    // Prepare jobs: trim requirements if passed as comma separated strings or arrays
    const formattedJobs = jobs.map(job => {
      let requirements = [];
      if (Array.isArray(job.requirements)) {
        requirements = job.requirements.map(r => r.trim()).filter(r => r.length > 0);
      } else if (typeof job.requirements === 'string') {
        requirements = job.requirements.split(',').map(r => r.trim()).filter(r => r.length > 0);
      }

      return {
        title: job.title,
        company: job.company,
        description: job.description || 'No description provided.',
        requirements: requirements,
        location: job.location || 'Remote',
        salary: job.salary || 'Not Specified',
        experienceLevel: job.experienceLevel || 'Entry Level',
        applyLink: job.applyLink || '',
        targetBatch: job.targetBatch || 'All'
      };
    });

    const createdJobs = await Job.insertMany(formattedJobs);

    // Dynamic notifications: group jobs by target batch and notify students with a single digest email!
    const students = await User.find({ role: 'student' });

    students.forEach(student => {
      // Find jobs relevant to this student
      const studentJobs = createdJobs.filter(job => {
        return !job.targetBatch || job.targetBatch === 'All' || job.targetBatch.trim() === student.year;
      });

      if (studentJobs.length > 0) {
        // Send a single digest email containing all relevant jobs
        const jobListText = studentJobs.map(job =>
          `- ${job.title} at ${job.company} (${job.location}) - Req: ${job.requirements.join(', ')}`
        ).join('\n');

        const jobListHtml = studentJobs.map(job => `
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #4f46e5;">
            <h3 style="margin: 0 0 10px 0; color: #111827;">${job.title} (Bulk Alert)</h3>
            <p style="margin: 5px 0; font-size: 14px; color: #4b5563;"><strong>Company:</strong> ${job.company}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #4b5563;"><strong>Location:</strong> ${job.location}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #4b5563;"><strong>Salary:</strong> ${job.salary}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Requirements:</strong></p>
            <p style="margin: 5px 0 0 0;">
              ${job.requirements.map(req => `<span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; margin-bottom: 5px;">${req}</span>`).join('')}
            </p>
          </div>
        `).join('');

        sendEmail({
          to: student.email,
          subject: `${studentJobs.length} New Job Opportunities on PrepPortal!`,
          text: `Hello ${student.name},\n\nMultiple new job opportunities have been posted on PrepPortal that match your profile:\n\n${jobListText}\n\nLog in to your PrepPortal dashboard (http://localhost:5173/jobs) to view and apply!\n\nBest regards,\nPrepPortal Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #4f46e5; margin-bottom: 5px;">New Job Openings!</h2>
              <p style="font-size: 16px; color: #333;">Hello <strong>${student.name}</strong>,</p>
              <p style="font-size: 14px; color: #555;">New job opportunities matching your graduation batch have been published on PrepPortal:</p>
              
              ${jobListHtml}

              <p style="font-size: 14px; color: #555;">Log in to your dashboard to analyze your resume against these jobs, check match ratings, and apply directly!</p>
              
              <div style="text-align: center; margin-top: 25px;">
                <a href="http://localhost:5173/jobs" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">View Job Board</a>
              </div>
              
              <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 30px 0 15px 0;" />
              <p style="font-size: 12px; color: #9ca3af; text-align: center;">You are receiving this because you are registered as a student on PrepPortal.</p>
            </div>
          `
        }).catch(err => console.error(`Error sending digest email to ${student.email}:`, err.message));
      }
    });

    res.status(201).json({
      success: true,
      count: createdJobs.length,
      data: createdJobs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle saving a job listing
// @route   POST /api/jobs/:id/save
// @access  Private
exports.toggleSaveJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const user = await User.findById(req.user.id);
    const index = user.savedJobs.indexOf(job._id);

    if (index >= 0) {
      // Unsave
      user.savedJobs.splice(index, 1);
      await user.save();
      return res.status(200).json({ success: true, message: 'Job removed from saved list', isSaved: false });
    } else {
      // Save
      user.savedJobs.push(job._id);
      await user.save();
      return res.status(200).json({ success: true, message: 'Job added to saved list', isSaved: true });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get all saved jobs for user
// @route   GET /api/jobs/saved
// @access  Private
exports.getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('savedJobs');
    res.status(200).json({
      success: true,
      count: user.savedJobs.length,
      data: user.savedJobs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Apply for a job listing
// @route   POST /api/jobs/:id/apply
// @access  Private
exports.applyJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const user = await User.findById(req.user.id);
    const alreadyApplied = user.appliedJobs.some(app => app.job.toString() === job._id.toString());
    if (alreadyApplied) {
      return res.status(400).json({ success: false, error: 'Already applied for this job' });
    }

    user.appliedJobs.push({ job: job._id, status: 'applied', appliedAt: new Date() });
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Successfully applied for job',
      data: user.appliedJobs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all applied jobs for user
// @route   GET /api/jobs/applied
// @access  Private
exports.getAppliedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('appliedJobs.job');
    res.status(200).json({
      success: true,
      count: user.appliedJobs.length,
      data: user.appliedJobs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update application status (Admin/Faculty, or Student updating own application)
// @route   PUT /api/jobs/:id/status
// @access  Private
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    let { studentId, status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Please provide status' });
    }

    // Role check: if student, they can only update their own status
    if (req.user.role === 'student') {
      studentId = req.user.id;
    } else if (!studentId) {
      return res.status(400).json({ success: false, error: 'Please provide studentId' });
    }

    // Normalize status: replace spaces with underscores and lowercase
    let normalizedStatus = status.toLowerCase().trim().replace(/\s+/g, '_');
    const validStatuses = ['applied', 'under_review', 'interviewing', 'offered', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const application = student.appliedJobs.find(app => app.job.toString() === req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    application.status = normalizedStatus;
    await student.save();

    // If updated by Admin/Faculty, notify the student
    if (req.user.role !== 'student') {
      try {
        const job = await Job.findById(req.params.id);
        const jobTitle = job ? `${job.title} at ${job.company}` : 'Job Application';
        const displayStatus = normalizedStatus.replace('_', ' ').toUpperCase();
        await Notification.create({
          user: student._id,
          title: `Job Application Status: ${displayStatus}`,
          message: `Your application for ${jobTitle} has been updated to "${displayStatus}". Check your dashboard for details.`,
          type: 'job',
          link: '/jobs'
        });
      } catch (notifErr) {
        console.warn('Could not dispatch notification for job status update:', notifErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Application status updated to "${normalizedStatus.replace('_', ' ').toUpperCase()}" successfully`,
      data: student.appliedJobs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all students' applied jobs report (Admin/Faculty)
// @route   GET /api/jobs/admin/applications-report
// @access  Private/Admin,Faculty
exports.getAppliedJobsReport = async (req, res, next) => {
  try {
    const { status, jobId, branch, academicYear, search } = req.query;

    const query = {
      'appliedJobs.0': { $exists: true }
    };

    if (branch && branch !== 'all') {
      query.branch = branch;
    }
    if (academicYear && academicYear !== 'all') {
      query.academicYear = academicYear;
    }

    const students = await User.find(query)
      .select('name email rollNumber branch section year academicYear readinessScore appliedJobs')
      .populate('appliedJobs.job');

    const applications = [];

    students.forEach((student) => {
      if (!Array.isArray(student.appliedJobs)) return;
      student.appliedJobs.forEach((app) => {
        if (!app || !app.job) return;

        // Filter by jobId
        if (jobId && jobId !== 'all' && app.job._id.toString() !== jobId.toString()) {
          return;
        }

        // Normalize status
        const appStatus = (app.status || 'applied').toLowerCase().trim().replace(/\s+/g, '_');

        // Filter by status
        if (status && status !== 'all') {
          const filterStatus = status.toLowerCase().trim().replace(/\s+/g, '_');
          if (appStatus !== filterStatus) {
            return;
          }
        }

        // Search filter
        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          const matchStudent =
            (student.name && student.name.toLowerCase().includes(s)) ||
            (student.email && student.email.toLowerCase().includes(s)) ||
            (student.rollNumber && student.rollNumber.toLowerCase().includes(s)) ||
            (student.branch && student.branch.toLowerCase().includes(s));
          const matchJob =
            (app.job.title && app.job.title.toLowerCase().includes(s)) ||
            (app.job.company && app.job.company.toLowerCase().includes(s)) ||
            (app.job.location && app.job.location.toLowerCase().includes(s));
          if (!matchStudent && !matchJob) return;
        }

        applications.push({
          applicationId: `${student._id}_${app.job._id}`,
          studentId: student._id,
          studentName: student.name,
          studentEmail: student.email,
          studentRollNumber: student.rollNumber || 'N/A',
          studentBranch: student.branch || 'N/A',
          studentSection: student.section || 'N/A',
          studentAcademicYear: student.academicYear || student.year || 'N/A',
          studentReadiness: student.readinessScore || 0,
          jobId: app.job._id,
          jobTitle: app.job.title,
          jobCompany: app.job.company,
          jobLocation: app.job.location || 'Remote',
          jobSalary: app.job.salary || 'Not Specified',
          jobTargetBatch: app.job.targetBatch || 'All',
          jobApplyLink: app.job.applyLink || '',
          status: appStatus,
          appliedAt: app.appliedAt || new Date()
        });
      });
    });

    // Sort by appliedAt descending
    applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    const totalApplications = applications.length;
    const uniqueStudents = new Set(applications.map((a) => a.studentId.toString())).size;
    const appliedCount = applications.filter((a) => a.status === 'applied').length;
    const underReviewCount = applications.filter((a) => a.status === 'under_review').length;
    const interviewingCount = applications.filter((a) => a.status === 'interviewing').length;
    const offeredCount = applications.filter((a) => a.status === 'offered').length;
    const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
    const withdrawnCount = applications.filter((a) => a.status === 'withdrawn').length;

    res.status(200).json({
      success: true,
      count: applications.length,
      stats: {
        totalApplications,
        uniqueStudents,
        appliedCount,
        underReviewCount,
        interviewingCount,
        offeredCount,
        rejectedCount,
        withdrawnCount
      },
      data: applications
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export applied jobs report as CSV (Admin/Faculty)
// @route   GET /api/jobs/admin/applications-report/export-csv
// @access  Private/Admin,Faculty
exports.exportAppliedJobsCsv = async (req, res, next) => {
  try {
    const { status, jobId, branch, academicYear, search } = req.query;

    const query = {
      'appliedJobs.0': { $exists: true }
    };
    if (branch && branch !== 'all') query.branch = branch;
    if (academicYear && academicYear !== 'all') query.academicYear = academicYear;

    const students = await User.find(query)
      .select('name email rollNumber branch section year academicYear readinessScore appliedJobs')
      .populate('appliedJobs.job');

    const rows = [];
    students.forEach((student) => {
      if (!Array.isArray(student.appliedJobs)) return;
      student.appliedJobs.forEach((app) => {
        if (!app || !app.job) return;
        if (jobId && jobId !== 'all' && app.job._id.toString() !== jobId.toString()) return;
        const appStatus = (app.status || 'applied').toLowerCase().trim().replace(/\s+/g, '_');
        if (status && status !== 'all') {
          const filterStatus = status.toLowerCase().trim().replace(/\s+/g, '_');
          if (appStatus !== filterStatus) return;
        }

        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          const matchStudent =
            (student.name && student.name.toLowerCase().includes(s)) ||
            (student.email && student.email.toLowerCase().includes(s)) ||
            (student.rollNumber && student.rollNumber.toLowerCase().includes(s));
          const matchJob =
            (app.job.title && app.job.title.toLowerCase().includes(s)) ||
            (app.job.company && app.job.company.toLowerCase().includes(s));
          if (!matchStudent && !matchJob) return;
        }

        rows.push({
          studentName: student.name,
          rollNumber: student.rollNumber || 'N/A',
          email: student.email,
          branch: student.branch || 'N/A',
          section: student.section || 'N/A',
          academicYear: student.academicYear || student.year || 'N/A',
          readiness: student.readinessScore || 0,
          jobTitle: app.job.title,
          company: app.job.company,
          location: app.job.location || 'Remote',
          salary: app.job.salary || 'Not Specified',
          targetBatch: app.job.targetBatch || 'All',
          status: appStatus.toUpperCase(),
          appliedDate: app.appliedAt ? new Date(app.appliedAt).toLocaleString() : 'N/A'
        });
      });
    });

    rows.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));

    // Build CSV
    const headers = [
      'Student Name',
      'Roll Number',
      'Email',
      'Branch',
      'Section',
      'Academic Year',
      'Readiness Score (%)',
      'Job Title',
      'Company',
      'Location',
      'Salary / Package',
      'Target Batch',
      'Application Status',
      'Applied Date'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) =>
        [
          escapeCsv(r.studentName),
          escapeCsv(r.rollNumber),
          escapeCsv(r.email),
          escapeCsv(r.branch),
          escapeCsv(r.section),
          escapeCsv(r.academicYear),
          escapeCsv(r.readiness),
          escapeCsv(r.jobTitle),
          escapeCsv(r.company),
          escapeCsv(r.location),
          escapeCsv(r.salary),
          escapeCsv(r.targetBatch),
          escapeCsv(r.status),
          escapeCsv(r.appliedDate)
        ].join(',')
      )
    ].join('\r\n');

    const filename = `campus_bridge_applied_jobs_report_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

