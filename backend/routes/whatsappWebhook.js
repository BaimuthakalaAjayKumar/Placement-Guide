const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const WhatsAppNotificationLog = require('../models/WhatsAppNotificationLog');

/**
 * Timing-safe string comparison to protect against timing attacks.
 */
function timingSafeEqual(strA, strB) {
  if (typeof strA !== 'string' || typeof strB !== 'string') {
    return false;
  }
  const bufA = Buffer.from(strA, 'utf8');
  const bufB = Buffer.from(strB, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates Meta's X-Hub-Signature-256 header using the server's META_APP_SECRET.
 * Verifies against the exact raw request body buffer.
 */
function verifyMetaSignature(req) {
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!appSecret) {
    if (isProduction) {
      return {
        valid: false,
        statusCode: 500,
        error: 'META_APP_SECRET not configured on server (failing closed in production)'
      };
    }
    return {
      valid: false,
      statusCode: 401,
      error: 'META_APP_SECRET not configured on server'
    };
  }

  const signatureHeader = req.headers['x-hub-signature-256'] || req.headers['X-Hub-Signature-256'];
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return {
      valid: false,
      statusCode: 401,
      error: 'Missing X-Hub-Signature-256 header'
    };
  }

  // Raw body captured by express.json({ verify: ... })
  const rawBody = req.rawBody || Buffer.from('');
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(rawBody);
  const expectedSignature = 'sha256=' + hmac.digest('hex');

  const headerBuf = Buffer.from(signatureHeader.trim(), 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (headerBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(headerBuf, expectedBuf)) {
    return {
      valid: false,
      statusCode: 401,
      error: 'Invalid webhook signature'
    };
  }

  return { valid: true };
}

/**
 * Process an individual status object from entry[].changes[].value.statuses[]
 * Supports 'sent', 'delivered', 'read', 'failed'.
 * Enforces lifecycle progression (SENT -> DELIVERED -> READ), out-of-order protection,
 * duplicate deduplication, and safe error sanitization.
 */
async function processStatusItem(statusItem) {
  if (!statusItem || !statusItem.id) {
    return { processed: false, reason: 'MISSING_MESSAGE_ID' };
  }

  const messageId = String(statusItem.id).trim();
  const rawStatus = String(statusItem.status || '').toLowerCase().trim();

  // Find matching notification log record by top-level messageId or providerResponse.messageId
  const log = await WhatsAppNotificationLog.findOne({
    $or: [
      { messageId: messageId },
      { 'providerResponse.messageId': messageId }
    ]
  });

  if (!log) {
    return { processed: false, messageId, reason: 'LOG_NOT_FOUND' };
  }

  // Parse callback timestamp
  const eventTime = statusItem.timestamp
    ? new Date(Number(statusItem.timestamp) * 1000)
    : new Date();

  // Sanitize errors if present (strictly no secrets or private tokens)
  const sanitizedErrors = Array.isArray(statusItem.errors)
    ? statusItem.errors.map(err => ({
        code: String(err.code || ''),
        title: String(err.title || ''),
        message: String(err.message || '')
      }))
    : [];

  const currentStatus = log.status || 'PENDING';
  let nextStatus = currentStatus;

  // Status mapping & out-of-order handling
  if (rawStatus === 'failed') {
    // Only transition to FAILED if not already confirmed DELIVERED or READ
    if (currentStatus !== 'DELIVERED' && currentStatus !== 'READ') {
      nextStatus = 'FAILED';
      log.errorCode = sanitizedErrors[0]?.code || 'META_DELIVERY_FAILED';
      log.errorMessage = sanitizedErrors[0]?.title || sanitizedErrors[0]?.message || 'Message delivery failed';
    }
  } else if (rawStatus === 'read') {
    nextStatus = 'READ';
  } else if (rawStatus === 'delivered') {
    // Do not downgrade if already READ
    if (currentStatus !== 'READ') {
      nextStatus = 'DELIVERED';
    }
  } else if (rawStatus === 'sent') {
    // Do not downgrade if already DELIVERED or READ
    if (currentStatus !== 'DELIVERED' && currentStatus !== 'READ') {
      nextStatus = 'SENT';
    }
  }

  log.status = nextStatus;

  // Safely update providerResponse and receipt history
  const prevProvider = (log.providerResponse && typeof log.providerResponse === 'object')
    ? log.providerResponse
    : {};

  const deliveryHistory = Array.isArray(prevProvider.deliveryReceipts)
    ? [...prevProvider.deliveryReceipts]
    : [];

  // Deduplicate identical events in receipt history
  const isDuplicateReceipt = deliveryHistory.some(
    r => r.status === rawStatus && Math.abs(new Date(r.timestamp).getTime() - eventTime.getTime()) < 1000
  );

  if (!isDuplicateReceipt) {
    deliveryHistory.push({
      status: rawStatus,
      timestamp: eventTime,
      recipientId: statusItem.recipient_id || null,
      errors: sanitizedErrors.length > 0 ? sanitizedErrors : undefined
    });
  }

  log.providerResponse = {
    ...prevProvider,
    messageId: messageId,
    lastDeliveryStatus: rawStatus,
    lastStatusAt: eventTime,
    deliveryReceipts: deliveryHistory
  };

  // Ensure top-level messageId field is populated
  if (!log.messageId) {
    log.messageId = messageId;
  }

  await log.save();

  return {
    processed: true,
    messageId,
    previousStatus: currentStatus,
    updatedStatus: nextStatus,
    rawStatus
  };
}

// ============================================================
// 1. GET /api/whatsapp/webhook — Meta Verification Handshake
// ============================================================
const handleGetWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expectedToken) {
    console.warn('[META WEBHOOK GET] Verification failed: META_WHATSAPP_VERIFY_TOKEN not configured on server.');
    return res.status(403).json({ success: false, error: 'Webhook verification token not configured' });
  }

  if (mode === 'subscribe' && typeof token === 'string' && timingSafeEqual(token, expectedToken)) {
    console.log('[META WEBHOOK GET] Challenge accepted.');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(challenge || '');
  }

  console.warn('[META WEBHOOK GET] Verification rejected: Invalid mode or token mismatch.');
  return res.status(403).json({ success: false, error: 'Verification failed' });
};

// ============================================================
// 2. POST /api/whatsapp/webhook — Status Callbacks & Inbound Events
// ============================================================
const handlePostWebhook = async (req, res) => {
  // 1. Signature validation
  const sigValidation = verifyMetaSignature(req);
  if (!sigValidation.valid) {
    return res.status(sigValidation.statusCode).json({
      success: false,
      error: sigValidation.error
    });
  }

  const payload = req.body;

  // 2. Acknowledge valid Meta WhatsApp payload structure
  if (!payload || typeof payload !== 'object') {
    return res.status(200).json({ success: true, processed: 0 });
  }

  let totalProcessed = 0;
  const results = [];

  try {
    const entries = Array.isArray(payload.entry) ? payload.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // Process message delivery status callbacks
        if (Array.isArray(value.statuses)) {
          for (const statusItem of value.statuses) {
            try {
              const result = await processStatusItem(statusItem);
              results.push(result);
              if (result.processed) {
                totalProcessed++;
              }
            } catch (itemErr) {
              console.error('[META WEBHOOK POST] Error processing status item:', itemErr.message);
            }
          }
        }

        // Handle inbound messages (never log secrets or private message contents)
        if (Array.isArray(value.messages)) {
          console.log(`[META WEBHOOK POST] Inbound message batch received: ${value.messages.length} item(s).`);
        }
      }
    }

    // Acknowledge promptly with HTTP 200
    return res.status(200).json({
      success: true,
      processedCount: totalProcessed,
      results
    });
  } catch (err) {
    console.error('[META WEBHOOK POST] Unexpected error processing webhook:', err.message);
    // Return HTTP 200 to prevent Meta retry loops on malformed items
    return res.status(200).json({
      success: false,
      error: 'Error processing webhook batch'
    });
  }
};

// Routes
router.get('/webhook', handleGetWebhook);
router.post('/webhook', handlePostWebhook);

// Also handle root if hit directly
router.get('/', handleGetWebhook);
router.post('/', handlePostWebhook);

module.exports = router;
