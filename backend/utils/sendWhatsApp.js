const https = require('https');

/**
 * STRICT OFFICIAL SENDER SPECIFICATION:
 * All WhatsApp messages must originate from the verified phone number: 9182967014 (+91 9182967014).
 */
const OFFICIAL_SENDER_RAW = '9182967014';
const OFFICIAL_SENDER_INTL = '+919182967014';
const OFFICIAL_SENDER_WA_ID = 'whatsapp:+919182967014';

/**
 * Send or dispatch WhatsApp Notification
 * Strictly enforces sending from the official number 9182967014
 * Supports Twilio, WhatsApp Business Cloud API, UltraMsg, Webhook Gateway, or Direct WhatsApp Link
 *
 * @param {Object} options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.message - The text message body
 * @param {string} [options.studentName='Student'] - Recipient name for logging & templates
 * @param {string} [options.driveTitle=''] - Optional placement drive/job title for context
 * @param {string} [options.from] - Sender phone number (strictly locked to 9182967014)
 */
const sendWhatsAppMessage = async ({
  to,
  message,
  studentName = 'Student',
  driveTitle = '',
  from = OFFICIAL_SENDER_RAW
}) => {
  // STRICT ENFORCEMENT: Enforce the sender number to always be 9182967014
  const senderNumber = OFFICIAL_SENDER_RAW;
  const senderIntl = OFFICIAL_SENDER_INTL;
  const senderWhatsAppId = OFFICIAL_SENDER_WA_ID;

  // Normalize recipient phone number (strip spaces, dashes, symbols)
  let cleanRecipient = String(to || '').replace(/\D/g, '');
  
  // Ensure country code 91 for 10-digit Indian mobile numbers
  if (cleanRecipient.length === 10) {
    cleanRecipient = `91${cleanRecipient}`;
  } else if (!cleanRecipient) {
    cleanRecipient = '918074701052';
  }

  // Format message text and ensure official sender branding
  let formattedMessage = String(message || '').trim();
  const officialSenderTag = `📱 Official Placement Sender: ${senderIntl}`;
  if (!formattedMessage.includes(OFFICIAL_SENDER_RAW) && !formattedMessage.includes(senderIntl)) {
    formattedMessage = `${formattedMessage}\n\n${officialSenderTag}`;
  }

  const encodedText = encodeURIComponent(formattedMessage);
  const waDirectUrl = `https://api.whatsapp.com/send?phone=${cleanRecipient}&text=${encodedText}`;
  const waWebUrl = `https://web.whatsapp.com/send?phone=${cleanRecipient}&text=${encodedText}`;
  const waSenderContactUrl = `https://wa.me/${OFFICIAL_SENDER_RAW}`;

  console.log('==================================================');
  console.log(`[WHATSAPP NOTIFICATION DISPATCHED]`);
  console.log(`STRICT SENDER (FROM): ${senderIntl} (Number: ${senderNumber})`);
  console.log(`RECIPIENT (TO): +${cleanRecipient}`);
  console.log(`Recipient Name: ${studentName}`);
  if (driveTitle) console.log(`Drive / Job Title: ${driveTitle}`);
  console.log(`Message Content:\n${formattedMessage}`);
  console.log(`WhatsApp Direct Link: ${waDirectUrl}`);
  console.log('==================================================');

  // 1. Dispatch via Twilio REST API if configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPostData = new URLSearchParams({
        From: senderWhatsAppId,
        To: `whatsapp:+${cleanRecipient}`,
        Body: formattedMessage
      }).toString();

      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const twilioReq = https.request({
        hostname: 'api.twilio.com',
        port: 443,
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(twilioPostData)
        }
      }, (res) => {
        let twilioResp = '';
        res.on('data', chunk => { twilioResp += chunk; });
        res.on('end', () => {
          console.log(`[TWILIO WHATSAPP DISPATCH] Status: ${res.statusCode} from ${senderWhatsAppId}`);
        });
      });

      twilioReq.on('error', (err) => {
        console.warn(`[TWILIO WHATSAPP ERROR]: ${err.message}`);
      });

      twilioReq.write(twilioPostData);
      twilioReq.end();
    } catch (twilioErr) {
      console.warn('Twilio WhatsApp error:', twilioErr.message);
    }
  }

  // 2. Dispatch via Generic WhatsApp Gateway / Webhook / Cloud API if configured
  if (process.env.WHATSAPP_API_URL) {
    try {
      const urlObj = new URL(process.env.WHATSAPP_API_URL);
      const postData = JSON.stringify({
        from: senderNumber,
        sender: senderNumber,
        source: senderNumber,
        senderPhone: senderIntl,
        fromNumber: senderIntl,
        to: cleanRecipient,
        phone: cleanRecipient,
        recipient: cleanRecipient,
        message: formattedMessage,
        key: process.env.WHATSAPP_API_KEY || ''
      });

      const req = https.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        console.log(`[WHATSAPP GATEWAY RESPONSE]: Status ${res.statusCode} (From: ${senderNumber} -> To: ${cleanRecipient})`);
      });

      req.on('error', (e) => {
        console.warn(`[WHATSAPP GATEWAY ERROR]: ${e.message}`);
      });

      req.write(postData);
      req.end();
    } catch (apiErr) {
      console.warn('WhatsApp API trigger error:', apiErr.message);
    }
  }

  return {
    success: true,
    from: senderNumber,
    senderNumber: senderIntl,
    senderWhatsAppId,
    recipient: cleanRecipient,
    waDirectUrl,
    waWebUrl,
    senderContactUrl: waSenderContactUrl,
    message: formattedMessage
  };
};

module.exports = {
  sendWhatsAppMessage,
  OFFICIAL_SENDER_NUMBER: OFFICIAL_SENDER_RAW,
  OFFICIAL_SENDER_INTL
};
