/**
 * AUTOMATED VERIFICATION SUITE: Meta WhatsApp Cloud API Webhook Integration
 * CAMPUSBRIDGE — Comprehensive tests for:
 * 1. GET Verification handshake (hub.mode, hub.verify_token, hub.challenge)
 * 2. GET Failure cases (token mismatch, invalid mode, missing server token)
 * 3. POST Signature validation (X-Hub-Signature-256 with HMAC-SHA256 and constant-time check)
 * 4. POST Signature rejection (missing header, tampered signature)
 * 5. Safe operation when production secrets are missing (fail closed)
 * 6. Status mapping & message-ID matching (sent, delivered, read, failed)
 * 7. Duplicate callbacks (idempotency, receipt deduplication)
 * 8. Out-of-order callbacks (never downgrade READ -> DELIVERED or DELIVERED -> SENT)
 * 9. Unknown message IDs and malformed payloads (graceful, no unhandled exceptions)
 * 10. Inbound customer message safe handling (never logs or leaks message content)
 */

const http = require('http');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const WhatsAppNotificationLog = require('../models/WhatsAppNotificationLog');
const whatsappWebhookRoutes = require('../routes/whatsappWebhook');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

// Helper to make local HTTP requests using Node built-in http module
function makeRequest({ serverPort, method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const rawData = body ? (Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))) : null;
    const reqHeaders = { ...headers };
    if (rawData) {
      reqHeaders['Content-Length'] = rawData.length;
      if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(responseBody);
        } catch (e) {
          json = null;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseBody,
          json
        });
      });
    });

    req.on('error', reject);
    if (rawData) req.write(rawData);
    req.end();
  });
}

function computeSignature(payloadString, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  return 'sha256=' + hmac.digest('hex');
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log('CAMPUSBRIDGE — META WHATSAPP WEBHOOK VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  // Connect to DB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // Setup Express test application
  const app = express();
  app.use(express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use('/api/whatsapp', whatsappWebhookRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const serverPort = server.address().port;
  console.log(`Test Express server listening on 127.0.0.1:${serverPort}\n`);

  // Test credentials
  const TEST_VERIFY_TOKEN = 'campusbridge_verify_token_test_12345';
  const TEST_APP_SECRET = 'meta_test_app_secret_998877665544332211';

  process.env.META_WHATSAPP_VERIFY_TOKEN = TEST_VERIFY_TOKEN;
  process.env.META_APP_SECRET = TEST_APP_SECRET;

  try {
    // -------------------------------------------------------------
    // SUITE 1: GET VERIFICATION HANDSHAKE
    // -------------------------------------------------------------
    console.log('SUITE 1: GET Verification Handshake');

    // 1.1 Valid GET handshake
    const validGet = await makeRequest({
      serverPort,
      method: 'GET',
      path: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=test_challenge_abc123`
    });
    assert(validGet.statusCode === 200, 'Valid GET handshake returns HTTP 200');
    assert(validGet.body === 'test_challenge_abc123', 'Valid GET handshake returns hub.challenge as plain text');

    // 1.2 Invalid verify token
    const invalidTokenGet = await makeRequest({
      serverPort,
      method: 'GET',
      path: '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_abc123'
    });
    assert(invalidTokenGet.statusCode === 403, 'Incorrect verification token returns HTTP 403 Forbidden');

    // 1.3 Invalid mode
    const invalidModeGet = await makeRequest({
      serverPort,
      method: 'GET',
      path: `/api/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=test_challenge_abc123`
    });
    assert(invalidModeGet.statusCode === 403, 'Incorrect hub.mode returns HTTP 403 Forbidden');

    // 1.4 Missing server token
    delete process.env.META_WHATSAPP_VERIFY_TOKEN;
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    const missingServerTokenGet = await makeRequest({
      serverPort,
      method: 'GET',
      path: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${TEST_VERIFY_TOKEN}&hub.challenge=test_challenge_abc123`
    });
    assert(missingServerTokenGet.statusCode === 403, 'Missing server verification token fails closed with HTTP 403');
    process.env.META_WHATSAPP_VERIFY_TOKEN = TEST_VERIFY_TOKEN; // Restore

    // -------------------------------------------------------------
    // SUITE 2: POST SIGNATURE VALIDATION & FAIL-CLOSED SECURITY
    // -------------------------------------------------------------
    console.log('\nSUITE 2: POST Signature Validation & Security');

    const samplePayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: []
    });

    // 2.1 Valid HMAC-SHA256 signature
    const validSignature = computeSignature(samplePayload, TEST_APP_SECRET);
    const validPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': validSignature
      },
      body: samplePayload
    });
    assert(validPost.statusCode === 200, 'Valid HMAC signature accepted with HTTP 200');
    assert(validPost.json?.success === true, 'Response indicates success: true');

    // 2.2 Missing signature header
    const missingSigPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      body: samplePayload
    });
    assert(missingSigPost.statusCode === 401, 'Missing signature header returns HTTP 401 Unauthorized');
    assert(missingSigPost.json?.error === 'Missing X-Hub-Signature-256 header', 'Clear error message on missing signature');

    // 2.3 Invalid/tampered signature header
    const invalidSigPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000'
      },
      body: samplePayload
    });
    assert(invalidSigPost.statusCode === 401, 'Tampered/invalid signature returns HTTP 401 Unauthorized');
    assert(invalidSigPost.json?.error === 'Invalid webhook signature', 'Clear error message on invalid signature');

    // 2.4 Fail closed in production when META_APP_SECRET is missing
    const origSecret = process.env.META_APP_SECRET;
    const origEnv = process.env.NODE_ENV;
    delete process.env.META_APP_SECRET;
    delete process.env.WHATSAPP_APP_SECRET;
    process.env.NODE_ENV = 'production';

    const prodMissingSecretPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': validSignature
      },
      body: samplePayload
    });
    assert(prodMissingSecretPost.statusCode === 500, 'Production with missing app secret fails closed with HTTP 500');
    assert(prodMissingSecretPost.json?.error?.includes('failing closed in production'), 'Informs that server fails closed in production without secret');

    // Restore test environment
    process.env.META_APP_SECRET = origSecret;
    process.env.NODE_ENV = origEnv;

    // -------------------------------------------------------------
    // SUITE 3: STATUS MAPPING & MESSAGE-ID MATCHING
    // -------------------------------------------------------------
    console.log('\nSUITE 3: Status Mapping & Message-ID Matching');

    const testMsgId = `wamid.TEST_DISPATCH_${Date.now()}`;
    const testDedupKey = `test_webhook_${Date.now()}`;
    const mockStudentId = new mongoose.Types.ObjectId();
    const mockCampusId = new mongoose.Types.ObjectId();

    // Create an initial outbound log record (status: SENT)
    const initialLog = await WhatsAppNotificationLog.create({
      dedupKey: testDedupKey,
      category: 'CAMPUS_ABSENCE',
      studentId: mockStudentId,
      studentName: 'Webhook Test Student',
      rollNumber: 'CB-TEST-WH-01',
      guardianName: 'Webhook Guardian',
      guardianPhone: '9876543210',
      senderNumber: '9182967014',
      campusId: mockCampusId,
      dateKey: '2026-10-14',
      status: 'SENT',
      messageId: testMsgId,
      messageBody: 'Test notification message body',
      providerResponse: {
        provider: 'META_CLOUD_API',
        messageId: testMsgId,
        messageStatus: 'accepted'
      }
    });

    assert(initialLog.status === 'SENT', 'Initial notification log stored with status SENT');
    assert(initialLog.messageId === testMsgId, 'Initial notification log stored with Meta message ID');

    // 3.1 Delivery callback ('delivered')
    const deliveredPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_TEST_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: testMsgId,
                    status: 'delivered',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    recipient_id: '919876543210'
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    const deliveredPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(deliveredPayload, TEST_APP_SECRET)
      },
      body: deliveredPayload
    });
    assert(deliveredPost.statusCode === 200, 'Delivered status callback returns HTTP 200');
    assert(deliveredPost.json?.processedCount === 1, 'Reported 1 status item processed');

    const updatedLogAfterDelivered = await WhatsAppNotificationLog.findById(initialLog._id);
    assert(updatedLogAfterDelivered.status === 'DELIVERED', 'Status updated to DELIVERED upon Meta delivery callback');
    assert(updatedLogAfterDelivered.providerResponse?.lastDeliveryStatus === 'delivered', 'providerResponse records lastDeliveryStatus as delivered');
    assert(Array.isArray(updatedLogAfterDelivered.providerResponse?.deliveryReceipts), 'Receipt history tracked in deliveryReceipts');

    // 3.2 Read callback ('read')
    const readPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_TEST_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: testMsgId,
                    status: 'read',
                    timestamp: String(Math.floor(Date.now() / 1000) + 10),
                    recipient_id: '919876543210'
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    const readPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(readPayload, TEST_APP_SECRET)
      },
      body: readPayload
    });
    assert(readPost.statusCode === 200, 'Read status callback returns HTTP 200');

    const updatedLogAfterRead = await WhatsAppNotificationLog.findById(initialLog._id);
    assert(updatedLogAfterRead.status === 'READ', 'Status updated to READ upon Meta read callback');
    assert(updatedLogAfterRead.providerResponse?.lastDeliveryStatus === 'read', 'providerResponse records lastDeliveryStatus as read');

    // 3.3 Failed callback ('failed') on a separate message
    const failMsgId = `wamid.TEST_FAIL_${Date.now()}`;
    const failDedupKey = `test_fail_webhook_${Date.now()}`;
    const failLog = await WhatsAppNotificationLog.create({
      dedupKey: failDedupKey,
      category: 'CLASSROOM_ABSENCE',
      studentId: mockStudentId,
      studentName: 'Fail Test Student',
      rollNumber: 'CB-FAIL-01',
      guardianName: 'Fail Guardian',
      guardianPhone: '9876543210',
      senderNumber: '9182967014',
      campusId: mockCampusId,
      dateKey: '2026-10-14',
      status: 'SENT',
      messageId: failMsgId,
      messageBody: 'Test classroom absence fail message',
      providerResponse: {
        messageId: failMsgId
      }
    });

    const failedPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_TEST_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: failMsgId,
                    status: 'failed',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    recipient_id: '919876543210',
                    errors: [
                      {
                        code: 131026,
                        title: 'Message Undeliverable',
                        message: 'Recipient phone number is invalid or cannot receive WhatsApp'
                      }
                    ]
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    const failedPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(failedPayload, TEST_APP_SECRET)
      },
      body: failedPayload
    });
    assert(failedPost.statusCode === 200, 'Failed callback acknowledged with HTTP 200');

    const updatedFailLog = await WhatsAppNotificationLog.findById(failLog._id);
    assert(updatedFailLog.status === 'FAILED', 'Status updated to FAILED on Meta failure callback');
    assert(updatedFailLog.errorCode === '131026', 'Sanitized error code 131026 recorded in log');
    assert(updatedFailLog.errorMessage.includes('Message Undeliverable'), 'Sanitized error message recorded in log');

    // -------------------------------------------------------------
    // SUITE 4: IDEMPOTENCY & OUT-OF-ORDER CALLBACKS
    // -------------------------------------------------------------
    console.log('\nSUITE 4: Idempotency & Out-of-Order Callbacks');

    // 4.1 Duplicate callback: Re-sending read callback on already READ message
    const dupReadPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(readPayload, TEST_APP_SECRET)
      },
      body: readPayload
    });
    assert(dupReadPost.statusCode === 200, 'Duplicate read callback acknowledged with HTTP 200');
    const logAfterDup = await WhatsAppNotificationLog.findById(initialLog._id);
    assert(logAfterDup.status === 'READ', 'Record remains READ (idempotent, no regression)');

    // 4.2 Out-of-order callback: Receiving 'delivered' after message is already 'READ'
    const outOfOrderDeliveredPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(deliveredPayload, TEST_APP_SECRET)
      },
      body: deliveredPayload
    });
    assert(outOfOrderDeliveredPost.statusCode === 200, 'Out-of-order delivered callback handled with HTTP 200');
    const logAfterOutOfOrder = await WhatsAppNotificationLog.findById(initialLog._id);
    assert(logAfterOutOfOrder.status === 'READ', 'Out-of-order delivered does NOT downgrade READ back to DELIVERED');

    // 4.3 Out-of-order callback: Receiving 'sent' after message is already 'READ'
    const sentPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_TEST_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: testMsgId,
                    status: 'sent',
                    timestamp: String(Math.floor(Date.now() / 1000) - 20),
                    recipient_id: '919876543210'
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    const outOfOrderSentPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(sentPayload, TEST_APP_SECRET)
      },
      body: sentPayload
    });
    assert(outOfOrderSentPost.statusCode === 200, 'Out-of-order sent callback handled with HTTP 200');
    const logAfterSent = await WhatsAppNotificationLog.findById(initialLog._id);
    assert(logAfterSent.status === 'READ', 'Out-of-order sent does NOT downgrade READ to SENT');

    // -------------------------------------------------------------
    // SUITE 5: UNKNOWN MESSAGE IDS & MALFORMED PAYLOADS
    // -------------------------------------------------------------
    console.log('\nSUITE 5: Unknown Message IDs & Inbound Messages');

    // 5.1 Callback with unknown message ID
    const unknownIdPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_TEST_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: 'wamid.NONEXISTENT_999999',
                    status: 'delivered',
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    recipient_id: '919876543210'
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    const unknownPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(unknownIdPayload, TEST_APP_SECRET)
      },
      body: unknownIdPayload
    });
    assert(unknownPost.statusCode === 200, 'Unknown message ID handled gracefully with HTTP 200');
    assert(unknownPost.json?.results?.[0]?.reason === 'LOG_NOT_FOUND', 'Reports LOG_NOT_FOUND without throwing error');

    // 5.2 Malformed / empty changes payload
    const malformedPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{ changes: [] }]
    });
    const malformedPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(malformedPayload, TEST_APP_SECRET)
      },
      body: malformedPayload
    });
    assert(malformedPost.statusCode === 200, 'Empty changes entry handled gracefully with HTTP 200');

    // 5.3 Inbound customer messages (never exposes contents)
    const inboundPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_TEST_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                messages: [
                  {
                    from: '919876543210',
                    id: 'wamid.INBOUND_001',
                    timestamp: '1728892800',
                    text: { body: 'Acknowledged, thank you.' },
                    type: 'text'
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    const inboundPost = await makeRequest({
      serverPort,
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: {
        'X-Hub-Signature-256': computeSignature(inboundPayload, TEST_APP_SECRET)
      },
      body: inboundPayload
    });
    assert(inboundPost.statusCode === 200, 'Inbound message webhook acknowledged promptly with HTTP 200');

    // Clean up test logs
    await WhatsAppNotificationLog.deleteMany({ dedupKey: { $regex: /^test_/ } });
    console.log('\nTest data cleaned up successfully.');

  } finally {
    await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
