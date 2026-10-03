const sendEmail = require('./sendEmail');
const { sendWhatsAppMessage } = require('./sendWhatsApp');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Dispatches Email, WhatsApp, and In-App notifications to students matching a drive
 * Explicitly notifies WhatsApp recipient at 8074701052 as specified
 */
const notifyStudentsOnDrivePost = async (drive, specificTargetNumber = '8074701052') => {
  try {
    const minCgpa = drive.eligibility?.minCgpa || 6.5;
    const allowedBranches = drive.eligibility?.allowedBranches || [];
    const allowedBatches = drive.eligibility?.allowedBatches || [];

    // Query eligible students
    const query = { role: 'student' };
    if (allowedBranches.length > 0 && !allowedBranches.includes('ALL') && !allowedBranches.includes('All')) {
      query.branch = { $in: allowedBranches.map(b => new RegExp(`^${b}$`, 'i')) };
    }

    const students = await User.find(query)
      .select('name email phone rollNumber branch cgpa academicDetails')
      .lean();

    // Filter by CGPA
    const eligibleStudents = students.filter(s => {
      const cgpa = s.cgpa || s.academicDetails?.cgpa || 7.5;
      return cgpa >= minCgpa;
    });

    const company = drive.companyName || 'Campus Recruiter';
    const role = drive.role || drive.title || 'Software Engineer';
    const pkg = drive.packageDetails || 'Competitive Package';
    const driveDate = drive.dates?.driveDate ? new Date(drive.dates.driveDate).toLocaleDateString() : 'Announced Soon';
    const deadline = drive.dates?.registrationDeadline ? new Date(drive.dates.registrationDeadline).toLocaleDateString() : 'TBA';
    const location = drive.location || 'College Placement Cell';

    // 1. WhatsApp Message text
    const waText = 
`🎓 *GRIET PLACEMENT DRIVE NOTIFICATION*
----------------------------------------
Hello! You have been selected & shortlisted for an On-Campus Placement Drive:

🏢 *Company:* ${company}
💼 *Role:* ${role}
💰 *Package (CTC):* ${pkg}
📅 *Drive Date:* ${driveDate}
⏰ *Registration Deadline:* ${deadline}
📍 *Venue / Mode:* ${location}
🎯 *Eligibility Cutoff:* Min ${minCgpa} CGPA

Please log in to your Placement Portal to review the drive schedule, practice mock tests, and confirm your registration:
🔗 https://placement-guide-nu.vercel.app/login

Best of luck!
- Placement & Training Officer, GRIET`;

    // 2. Email HTML template
    const emailSubject = `🎓 Campus Placement Drive Alert: ${company} is Hiring for ${role} (${pkg})`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 28px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #334155;">
        <div style="border-bottom: 2px solid #a855f7; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #c084fc; margin: 0; font-size: 22px;">🎓 GRIET Campus Recruitment Drive</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Official Placement & Training Cell Notification</p>
        </div>

        <p style="font-size: 15px; line-height: 1.5; color: #e2e8f0;">
          Dear Candidate,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          You meet the eligibility criteria for the upcoming on-campus recruitment drive conducted by <strong>${company}</strong>. Below are the key drive highlights:
        </p>

        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; width: 40%;">Company Name:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: bold;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Job Designation:</td>
              <td style="padding: 6px 0; color: #38bdf8; font-weight: bold;">${role}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Compensation (CTC):</td>
              <td style="padding: 6px 0; color: #34d399; font-weight: bold;">${pkg}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Drive Date:</td>
              <td style="padding: 6px 0; color: #fbbf24; font-weight: 600;">${driveDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Application Deadline:</td>
              <td style="padding: 6px 0; color: #f87171; font-weight: 600;">${deadline}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Drive Location:</td>
              <td style="padding: 6px 0; color: #f1f5f9;">${location}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Minimum CGPA:</td>
              <td style="padding: 6px 0; color: #c084fc; font-weight: 600;">${minCgpa} CGPA</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0 16px 0;">
          <a href="https://placement-guide-nu.vercel.app/login" style="background: linear-gradient(135deg, #a855f7, #6366f1); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            🚀 Open Placement Portal &amp; Apply
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 14px; margin-top: 24px; text-align: center;">
          This is an automated notification from the GRIET Placement Portal. Contact Placement Office for assistance.
        </p>
      </div>
    `;

    // 3. Always send WhatsApp message to the dedicated phone number 8074701052
    await sendWhatsAppMessage({
      to: specificTargetNumber,
      message: waText,
      studentName: 'Designated Placement Coordinator / Candidate',
      driveTitle: `${company} - ${role}`
    });

    // 4. Send emails & in-app notifications to eligible students
    for (const student of eligibleStudents) {
      // Send Email
      if (student.email) {
        sendEmail({
          to: student.email,
          subject: emailSubject,
          text: `Campus Placement Drive Alert: ${company} is hiring for ${role} (${pkg}). Drive Date: ${driveDate}. Log in to https://placement-guide-nu.vercel.app/login`,
          html: emailHtml
        }).catch(err => {
          console.warn(`Could not email student ${student.email}:`, err.message);
        });
      }

      // If student has a mobile number registered, send WhatsApp as well
      if (student.phone && student.phone !== specificTargetNumber) {
        sendWhatsAppMessage({
          to: student.phone,
          message: waText,
          studentName: student.name,
          driveTitle: `${company} - ${role}`
        }).catch(() => {});
      }

      // In-app Notification
      Notification.create({
        user: student._id,
        type: 'job_update',
        message: `📢 New Campus Drive: ${company} is hiring for ${role} (${pkg})! Check details and register before ${deadline}.`,
        metadata: {
          driveId: drive._id,
          company,
          role,
          packageDetails: pkg,
          whatsappTarget: specificTargetNumber
        }
      }).catch(() => {});
    }

    return {
      success: true,
      eligibleCount: eligibleStudents.length,
      specificWhatsAppSentTo: specificTargetNumber
    };
  } catch (error) {
    console.error('Error in notifyStudentsOnDrivePost:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { notifyStudentsOnDrivePost };
