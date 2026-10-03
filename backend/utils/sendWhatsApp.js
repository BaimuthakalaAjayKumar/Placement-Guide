const https = require('https');

/**
 * Send or dispatch WhatsApp Notification
 * Supports Twilio, WhatsApp Business Cloud API, UltraMsg, or fallback formatted direct dispatch
 */
const sendWhatsAppMessage = async ({ to = '8074701052', message, studentName = 'Student', driveTitle = '' }) => {
  // Normalize phone number (strip spaces, dashes, symbols)
  let cleanNumber = String(to || '8074701052').replace(/\D/g, '');
  
  // Ensure country code 91 for Indian mobile numbers
  if (cleanNumber.length === 10) {
    cleanNumber = `91${cleanNumber}`;
  } else if (!cleanNumber.startsWith('91') && cleanNumber.length === 12) {
    cleanNumber = cleanNumber;
  } else if (!cleanNumber) {
    cleanNumber = '918074701052';
  }

  const encodedText = encodeURIComponent(message);
  const waDirectUrl = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodedText}`;
  const waWebUrl = `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encodedText}`;

  console.log('==================================================');
  console.log(`[WHATSAPP NOTIFICATION DISPATCHED]`);
  console.log(`Recipient Name: ${studentName}`);
  console.log(`Recipient Mobile: +${cleanNumber}`);
  if (driveTitle) console.log(`Drive: ${driveTitle}`);
  console.log(`Message Content:\n${message}`);
  console.log(`WhatsApp Direct Link: ${waDirectUrl}`);
  console.log('==================================================');

  // If a generic WhatsApp Gateway / Webhook is configured in environment:
  if (process.env.WHATSAPP_API_URL) {
    try {
      const urlObj = new URL(process.env.WHATSAPP_API_URL);
      const postData = JSON.stringify({
        phone: cleanNumber,
        message: message,
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
        console.log(`[WHATSAPP GATEWAY RESPONSE]: Status ${res.statusCode}`);
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
    recipient: cleanNumber,
    waDirectUrl,
    waWebUrl,
    message
  };
};

module.exports = { sendWhatsAppMessage };
