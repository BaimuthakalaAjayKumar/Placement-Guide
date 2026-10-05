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
      .select('name email phone mobileNumber rollNumber branch cgpa academicDetails')
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
`🎓 *CAMPUS BRIDGE PLACEMENT DRIVE NOTIFICATION*
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
- Placement & Training Officer, Campus Bridge
📱 Official WhatsApp Sender: +91 9182967014`;

    // 2. Email HTML template
    const emailSubject = `🎓 Campus Placement Drive Alert: ${company} is Hiring for ${role} (${pkg})`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 28px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #334155;">
        <div style="border-bottom: 2px solid #a855f7; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #c084fc; margin: 0; font-size: 22px;">🎓 Campus Bridge Recruitment Drive</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Official Placement &amp; Training Cell Notification</p>
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
          This is an automated notification from Campus Bridge. Official WhatsApp Sender: <strong>+91 9182967014</strong>. Contact Placement Office for assistance.
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

    // 4. Send emails & in-app notifications & WhatsApp to eligible students
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
      const studentPhone = student.mobileNumber || student.phone;
      if (studentPhone && String(studentPhone).replace(/\D/g, '') !== String(specificTargetNumber).replace(/\D/g, '')) {
        sendWhatsAppMessage({
          to: studentPhone,
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

/**
 * Dispatches WhatsApp, Email, and In-App notifications when a drive's registration deadline is extended
 */
const notifyStudentsOnDriveDeadlineExtension = async (drive, oldDeadline, newDeadline, notes = '', specificTargetNumber = '8074701052') => {
  try {
    const minCgpa = drive.eligibility?.minCgpa || 6.0;
    const allowedBranches = drive.eligibility?.allowedBranches || [];
    const company = drive.companyName || 'Campus Recruiter';
    const role = drive.role || drive.title || 'Software Engineer';
    const pkg = drive.packageDetails || 'Competitive Package';
    const portalUrl = process.env.FRONTEND_URL || 'https://placement-guide-nu.vercel.app';

    const oldDeadlineFormatted = oldDeadline ? new Date(oldDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Previous Deadline';
    const newDeadlineFormatted = new Date(newDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // WhatsApp Message Content
    const waText = 
`⏰ *CAMPUS BRIDGE PLACEMENT ALERT - DEADLINE EXTENDED!*
----------------------------------------
Dear Candidate,

Good news! The registration deadline for the on-campus recruitment drive by *${company}* has been *EXTENDED*.

🏢 *Company:* ${company}
💼 *Role:* ${role}
💰 *Package (CTC):* ${pkg}
📅 *Previous Deadline:* ${oldDeadlineFormatted}
⏳ *NEW EXTENDED DEADLINE:* *${newDeadlineFormatted}*
🎯 *Eligibility:* Min ${minCgpa} CGPA | Branches: ${allowedBranches.length > 0 ? allowedBranches.join(', ') : 'All Eligible'}
${notes ? `📝 *Note from T&P:* ${notes}\n` : ''}
If you haven't registered yet, please log in and apply immediately before this extended window closes:
🔗 ${portalUrl}/job-board

Best regards,
Training & Placement Cell, Campus Bridge
📱 Official WhatsApp Sender: +91 9182967014`;

    // 1. Dispatch WhatsApp message to the dedicated phone number (8074701052)
    await sendWhatsAppMessage({
      to: specificTargetNumber,
      message: waText,
      studentName: 'Placement Coordinator / Student',
      driveTitle: `${company} - ${role} (Deadline Extended)`
    });

    // 2. Query eligible students
    const query = { role: 'student' };
    if (allowedBranches.length > 0 && !allowedBranches.includes('ALL') && !allowedBranches.includes('All')) {
      query.branch = { $in: allowedBranches.map(b => new RegExp(`^${b}$`, 'i')) };
    }

    const students = await User.find(query)
      .select('name email phone mobileNumber rollNumber branch cgpa academicDetails')
      .lean();

    const eligibleStudents = students.filter(s => {
      const cgpa = s.cgpa || s.academicDetails?.cgpa || 7.5;
      return cgpa >= minCgpa;
    });

    const emailSubject = `⏰ DEADLINE EXTENDED: ${company} Campus Drive (${role}) — Apply before ${newDeadlineFormatted}`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 28px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #334155;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 18px 24px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 22px;">⏰ REGISTRATION DEADLINE EXTENDED</h2>
          <p style="color: #fef3c7; font-size: 13px; margin: 4px 0 0 0;">Campus Bridge Recruitment Drive Alert</p>
        </div>

        <p style="font-size: 15px; color: #e2e8f0;">Dear Candidate,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          The registration deadline for <strong>${company}</strong> has been officially <strong>extended</strong> by the Placement Cell.
        </p>

        <div style="background: #1e293b; border-left: 4px solid #f59e0b; padding: 16px; margin: 18px 0; border-radius: 6px;">
          <table style="width: 100%; font-size: 13.5px; border-collapse: collapse;">
            <tr>
              <td style="color: #94a3b8; padding: 5px 0; width: 45%;">Company:</td>
              <td style="color: #ffffff; font-weight: bold; padding: 5px 0;">${company}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 5px 0;">Designation:</td>
              <td style="color: #38bdf8; font-weight: bold; padding: 5px 0;">${role}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 5px 0;">Package (CTC):</td>
              <td style="color: #34d399; font-weight: bold; padding: 5px 0;">${pkg}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; padding: 5px 0;">Previous Deadline:</td>
              <td style="color: #ef4444; text-decoration: line-through; padding: 5px 0;">${oldDeadlineFormatted}</td>
            </tr>
            <tr>
              <td style="color: #fbbf24; font-weight: bold; padding: 5px 0;">NEW Extended Deadline:</td>
              <td style="color: #fbbf24; font-weight: 800; font-size: 15px; padding: 5px 0;">${newDeadlineFormatted}</td>
            </tr>
          </table>
          ${notes ? `<p style="margin: 10px 0 0 0; font-size: 12.5px; color: #cbd5e1;"><strong>Note:</strong> ${notes}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 24px 0 14px 0;">
          <a href="${portalUrl}/job-board" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            🚀 Open Job Board &amp; Apply Now
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; border-top: 1px solid #334155; padding-top: 14px; margin-top: 24px; text-align: center;">
          Campus Bridge Training &amp; Placement Cell &bull; Official WhatsApp Sender: <strong>+91 9182967014</strong>
        </p>
      </div>
    `;

    // 3. Dispatch to all eligible students
    for (const student of eligibleStudents) {
      if (student.email) {
        sendEmail({
          to: student.email,
          subject: emailSubject,
          text: `Deadline Extended for ${company} (${role}). New Deadline: ${newDeadlineFormatted}. Apply: ${portalUrl}/job-board`,
          html: emailHtml
        }).catch(() => {});
      }

      const studentPhone = student.mobileNumber || student.phone;
      if (studentPhone && String(studentPhone).replace(/\D/g, '') !== String(specificTargetNumber).replace(/\D/g, '')) {
        sendWhatsAppMessage({
          to: studentPhone,
          message: waText,
          studentName: student.name,
          driveTitle: `${company} - ${role}`
        }).catch(() => {});
      }

      Notification.create({
        user: student._id,
        type: 'job_update',
        message: `⏰ Deadline Extended: The registration deadline for ${company} (${role}) has been extended to ${newDeadlineFormatted}!`,
        metadata: {
          driveId: drive._id,
          company,
          role,
          newDeadline
        }
      }).catch(() => {});
    }

    return {
      success: true,
      eligibleCount: eligibleStudents.length,
      specificWhatsAppSentTo: specificTargetNumber
    };
  } catch (error) {
    console.error('Error in notifyStudentsOnDriveDeadlineExtension:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { notifyStudentsOnDrivePost, notifyStudentsOnDriveDeadlineExtension };
