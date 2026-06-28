const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // If SMTP configurations are not fully set in .env, log to console as a mock
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log('==================================================');
    console.log(`[MOCK EMAIL SENT]`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: \n${options.text}`);
    console.log('==================================================');
    return { success: true, mock: true };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  // Define message options
  const message = {
    from: `PrepPortal Admin <${process.env.SMTP_EMAIL}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  };

  const info = await transporter.sendMail(message);

  console.log(`Real email sent to ${options.to}: Message ID %s`, info.messageId);
  return { success: true, messageId: info.messageId };
};

module.exports = sendEmail;
