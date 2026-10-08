const nodemailer = require('nodemailer');

/**
 * CAMPUSBRIDGE — CENTRALIZED TRANSACTIONAL EMAIL SERVICE
 * 
 * Primary Transport: Brevo (Sendinblue) HTTPS Transactional Email API (REST/v3)
 *   - Operates over standard HTTPS (port 443) to bypass Render Cloud SMTP egress restrictions.
 *   - Uses BREVO_API_KEY, BREVO_SENDER_EMAIL, and BREVO_SENDER_NAME from process.env.
 * 
 * Secondary Transport (Rollback Fallback): Gmail SMTP / Nodemailer
 *   - Operates over SMTP (port 587/465) when BREVO_API_KEY is not set.
 *   - Uses SMTP_HOST, SMTP_PORT, SMTP_EMAIL, and SMTP_PASSWORD.
 * 
 * Development Mock:
 *   - Logs outgoing message to console if neither provider is configured.
 */
const sendEmail = async (options) => {
  if (!options || !options.to) {
    throw new Error('Email recipient (options.to) is required');
  }

  // Normalize recipient list
  const recipientList = Array.isArray(options.to)
    ? options.to.map(e => ({ email: String(e).trim() })).filter(e => e.email)
    : String(options.to).split(',').map(e => ({ email: e.trim() })).filter(e => e.email);

  if (recipientList.length === 0) {
    throw new Error('No valid recipient email address provided');
  }

  const primaryRecipient = recipientList[0].email;

  // Resolve sender name and email
  let senderName = process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'CampusBridge';
  let senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_EMAIL || 'campusbridge.systems@gmail.com';

  if (options.from) {
    const match = String(options.from).match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      senderName = match[1].trim() || senderName;
      senderEmail = match[2].trim() || senderEmail;
    } else if (options.from.includes('@')) {
      senderEmail = options.from.trim();
    }
  }

  // =========================================================================
  // 1. PRIMARY TRANSPORT: BREVO HTTPS TRANSACTIONAL EMAIL API
  // =========================================================================
  if (process.env.BREVO_API_KEY) {
    const brevoPayload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: recipientList,
      subject: options.subject || '(No Subject)',
      htmlContent: options.html || (options.text ? options.text.replace(/\n/g, '<br/>') : '<p></p>')
    };

    if (options.text) {
      brevoPayload.textContent = options.text;
    }

    if (options.replyTo) {
      brevoPayload.replyTo = typeof options.replyTo === 'object'
        ? options.replyTo
        : { email: String(options.replyTo).trim() };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify(brevoPayload)
      });

      if (response.ok) {
        const responseData = await response.json().catch(() => ({}));
        const messageId = responseData.messageId || 'accepted';

        console.log('======================================');
        console.log('Email provider: Brevo');
        console.log('Email accepted successfully');
        console.log('Recipient:', primaryRecipient);
        console.log('Message ID:', messageId);
        console.log('======================================');

        return {
          success: true,
          messageId,
          provider: 'brevo'
        };
      }

      // Handle non-2xx error responses from Brevo safely
      const errorData = await response.json().catch(() => ({}));
      const errorCode = errorData.code || `HTTP_${response.status}`;
      const errorMessage = errorData.message || response.statusText || 'Brevo API rejected request';

      console.error('======================================');
      console.error('[BREVO API ERROR]');
      console.error('HTTP Status:', response.status);
      console.error('Recipient:', primaryRecipient);
      console.error('Error Code:', errorCode);
      console.error('Error Message:', errorMessage);
      console.error('======================================');

      throw new Error(`Brevo Email Delivery Failed (${response.status} - ${errorCode}): ${errorMessage}`);
    } catch (apiErr) {
      if (!apiErr.message.startsWith('Brevo Email Delivery Failed')) {
        console.error('======================================');
        console.error('[BREVO NETWORK ERROR]');
        console.error('Recipient:', primaryRecipient);
        console.error('Error Message:', apiErr.message);
        console.error('======================================');
      }
      throw apiErr;
    }
  }

  // =========================================================================
  // 2. SECONDARY TRANSPORT: SMTP FALLBACK (GMAIL / NODEMAILER)
  // =========================================================================
  if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const message = {
      from: options.from || `${senderName} <${senderEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };

    if (options.replyTo) {
      message.replyTo = options.replyTo;
    }

    try {
      const info = await transporter.sendMail(message);

      console.log('======================================');
      console.log('Email provider: SMTP (Fallback)');
      console.log('Email accepted successfully');
      console.log('Recipient:', primaryRecipient);
      console.log('Message ID:', info.messageId);
      console.log('======================================');

      return {
        success: true,
        messageId: info.messageId,
        provider: 'smtp'
      };
    } catch (smtpErr) {
      console.error('======================================');
      console.error('[SMTP ERROR]');
      console.error('Recipient:', primaryRecipient);
      console.error('Error Code:', smtpErr.code || 'UNKNOWN');
      console.error('Error Message:', smtpErr.message);
      console.error('======================================');
      throw smtpErr;
    }
  }

  // =========================================================================
  // 3. OFFLINE DEVELOPMENT MOCK (NO CREDENTIALS CONFIGURED)
  // =========================================================================
  console.log('==================================================');
  console.log('[MOCK EMAIL SENT - NO BREVO_API_KEY OR SMTP SET]');
  console.log(`To: ${primaryRecipient}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Message:\n${options.text || options.html || '(empty)'}`);
  console.log('==================================================');

  return {
    success: true,
    mock: true
  };
};

module.exports = sendEmail;
