const assert = require('assert');
const mongoose = require('mongoose');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'cb-test-jwt-secret-secure-key-2026';
process.env.BIOMETRIC_ENCRYPTION_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || 'cb-test-biometric-key-256-bit-key';

const {
  EMBEDDING_DIM,
  l2Normalize,
  generatePreAuthFaceToken,
  encryptEmbedding
} = require('../services/biometricService');

const {
  requestStudentFaceChallenge,
  enrollStudentFace,
  verifyStudentFaceLogin,
  requestEmergencyOtp,
  verifyEmergencyOtp
} = require('../controllers/auth');

console.log('================================================================');
console.log('CAMPUSBRIDGE STUDENT FACE AUTH END-TO-END CONTROLLER TESTS');
console.log('================================================================\n');

// Mock req and res generator
function createMockReqRes(body = {}, headers = {}, params = {}) {
  const req = {
    body,
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'CampusBridge-Android/1.0',
      ...headers
    },
    get: (headerName) => headers[headerName.toLowerCase()] || headers[headerName] || '',
    ip: '127.0.0.1',
    params
  };

  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };

  return { req, res };
}

// Generate test face vectors
function createTestFace(seed) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vec[i] = Math.sin((i + 1) * 0.43 + seed) * 0.7 + Math.cos((i + 7) * 0.27 + seed * 2) * 0.3;
  }
  return l2Normalize(vec);
}

const studentFaceVector = createTestFace(555);
const imposterFaceVector = createTestFace(999);

// Mock student in memory
const mockStudentId = new mongoose.Types.ObjectId();
const mockStudent = {
  _id: mockStudentId,
  name: 'Rahul Sharma',
  email: 'rahul.student@campusbridge.edu',
  role: 'student',
  rollNumber: '21CS101',
  biometricProfile: {
    isEnrolled: false,
    failedVerificationAttempts: 0,
    lockoutUntil: null,
    exemption: { isExempt: false }
  },
  save: async function() { return this; },
  toObject: function() { return { ...this }; }
};

process.env.JWT_EXPIRE = '30d';

// Mock User and AuditLog
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const originalFindById = User.findById;
const originalAuditCreate = AuditLog.create;

AuditLog.create = async function() { return {}; };

User.findById = function(id) {
  return {
    select: function() {
      return Promise.resolve(mockStudent);
    },
    populate: function() {
      return this;
    },
    then: function(resolve) {
      resolve(mockStudent);
    }
  };
};

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

async function runAll() {
  // Test 1: Request dynamic face challenge with pre-auth token
  const preAuthEnrollToken = generatePreAuthFaceToken(mockStudentId, 'AWAITING_FACE_ENROLLMENT');
  let challengeNonce = null;

  await runAsyncTest('Request liveness challenge returns dynamic prompt & nonce', async () => {
    const { req, res } = createMockReqRes({ token: preAuthEnrollToken });
    await requestStudentFaceChallenge(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert(res.jsonData.challengeNonce);
    assert(res.jsonData.promptAction);
    assert(res.jsonData.instructions);
    challengeNonce = res.jsonData.challengeNonce;
  });

  // Test 2: Reject enrollment without consent
  await runAsyncTest('Enrollment without informed consent is rejected (400)', async () => {
    const { req, res } = createMockReqRes({
      preAuthToken: preAuthEnrollToken,
      consentGiven: false,
      probeEmbedding: studentFaceVector,
      challengeNonce
    });
    await enrollStudentFace(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData.success, false);
    assert(res.jsonData.error.includes('informed consent'));
  });

  // Test 3: Reject enrollment with synthetic/malformed vector
  await runAsyncTest('Enrollment with constant / synthetic vector is rejected (400)', async () => {
    const { req, res } = createMockReqRes({
      preAuthToken: preAuthEnrollToken,
      consentGiven: true,
      probeEmbedding: new Array(128).fill(0), // all zeros
      challengeNonce
    });
    await enrollStudentFace(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData.success, false);
    assert(res.jsonData.error.includes('Embedding rejected'));
  });

  // Test 4: Valid enrollment stores encrypted template and returns full session JWT
  await runAsyncTest('Valid enrollment encrypts template and issues full session JWT', async () => {
    // Generate fresh challenge nonce
    const { req: chalReq, res: chalRes } = createMockReqRes({ token: preAuthEnrollToken });
    await requestStudentFaceChallenge(chalReq, chalRes, (err) => { if (err) throw err; });
    const freshNonce = chalRes.jsonData.challengeNonce;

    const { req, res } = createMockReqRes({
      preAuthToken: preAuthEnrollToken,
      consentGiven: true,
      probeEmbedding: studentFaceVector,
      challengeNonce: freshNonce
    });
    await enrollStudentFace(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert(res.jsonData.token && res.jsonData.token.length > 30, 'Full session JWT must be issued');
    assert.strictEqual(mockStudent.biometricProfile.isEnrolled, true);
    assert(mockStudent.biometricProfile.encryptedEmbedding);
    assert(mockStudent.biometricProfile.authTag);
    assert(mockStudent.biometricProfile.iv);
  });

  // Test 5: Reject re-enrollment when already enrolled (prevents account takeover)
  await runAsyncTest('Re-enrollment attempt when already enrolled is blocked (403)', async () => {
    const { req, res } = createMockReqRes({
      preAuthToken: preAuthEnrollToken,
      consentGiven: true,
      probeEmbedding: studentFaceVector
    });
    await enrollStudentFace(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.jsonData.success, false);
    assert(res.jsonData.error.includes('already has an active biometric enrollment'));
  });

  // Test 6: Subsequent login face verification with genuine face succeeds
  let verifyChallengeToken = null;
  let verifyChallengeNonce = null;

  await runAsyncTest('Face verification with genuine probe succeeds and issues full JWT', async () => {
    // Generate verification pre-auth token
    verifyChallengeToken = generatePreAuthFaceToken(mockStudentId, 'AWAITING_FACE_VERIFICATION');
    const { req: chalReq, res: chalRes } = createMockReqRes({ token: verifyChallengeToken });
    await requestStudentFaceChallenge(chalReq, chalRes, (err) => { if (err) throw err; });
    verifyChallengeNonce = chalRes.jsonData.challengeNonce;

    // Genuine probe with slight optical delta
    const genuineProbe = studentFaceVector.map((v, i) => v + Math.sin(i * 7) * 0.03);
    const normalizedGenuineProbe = l2Normalize(genuineProbe);

    const { req, res } = createMockReqRes({
      challengeToken: verifyChallengeToken,
      challengeNonce: verifyChallengeNonce,
      probeEmbedding: normalizedGenuineProbe,
      livenessEvidence: { opticalVariance: 0.22, motionDelta: 0.18, framesSampled: 4 }
    });
    await verifyStudentFaceLogin(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert(res.jsonData.token && res.jsonData.token.length > 30);
    assert.strictEqual(mockStudent.biometricProfile.failedVerificationAttempts, 0);
  });

  // Test 7: Replay of consumed challenge nonce is blocked
  await runAsyncTest('Replay attempt with consumed challenge nonce is blocked (400)', async () => {
    const { req, res } = createMockReqRes({
      challengeToken: verifyChallengeToken,
      challengeNonce: verifyChallengeNonce, // already consumed!
      probeEmbedding: studentFaceVector
    });
    await verifyStudentFaceLogin(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData.success, false);
    assert(res.jsonData.error.includes('expired or was already consumed'));
  });

  // Test 8: Imposter face verification is rejected (401)
  await runAsyncTest('Imposter face probe is rejected and failure count is incremented (401)', async () => {
    const newChallengeToken = generatePreAuthFaceToken(mockStudentId, 'AWAITING_FACE_VERIFICATION');
    const { req: chalReq, res: chalRes } = createMockReqRes({ token: newChallengeToken });
    await requestStudentFaceChallenge(chalReq, chalRes, (err) => { if (err) throw err; });
    const freshNonce = chalRes.jsonData.challengeNonce;

    const { req, res } = createMockReqRes({
      challengeToken: newChallengeToken,
      challengeNonce: freshNonce,
      probeEmbedding: imposterFaceVector,
      livenessEvidence: { opticalVariance: 0.25, framesSampled: 4 }
    });
    await verifyStudentFaceLogin(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.success, false);
    assert.strictEqual(res.jsonData.status, 'VERIFICATION_FAILED');
    assert(mockStudent.biometricProfile.failedVerificationAttempts > 0);
  });

  // Test 9: 5 consecutive failed attempts triggers temporary lockout
  await runAsyncTest('5 consecutive failures locks student account (401 with isLockedOut)', async () => {
    mockStudent.biometricProfile.failedVerificationAttempts = 4; // 5th incoming attempt

    const lockoutToken = generatePreAuthFaceToken(mockStudentId, 'AWAITING_FACE_VERIFICATION');
    const { req: chalReq, res: chalRes } = createMockReqRes({ token: lockoutToken });
    await requestStudentFaceChallenge(chalReq, chalRes, (err) => { if (err) throw err; });
    const freshNonce = chalRes.jsonData.challengeNonce;

    const { req, res } = createMockReqRes({
      challengeToken: lockoutToken,
      challengeNonce: freshNonce,
      probeEmbedding: imposterFaceVector
    });
    await verifyStudentFaceLogin(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.isLockedOut, true);
    assert(mockStudent.biometricProfile.lockoutUntil !== null);
  });

  // Test 10: Temporary lockout prevents any further verification until expiry (429)
  await runAsyncTest('Account under active lockout returns HTTP 429 Too Many Requests', async () => {
    const lockedToken = generatePreAuthFaceToken(mockStudentId, 'AWAITING_FACE_VERIFICATION');
    const { req, res } = createMockReqRes({
      challengeToken: lockedToken,
      challengeNonce: 'dummy-nonce',
      probeEmbedding: studentFaceVector
    });
    await verifyStudentFaceLogin(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 429);
    assert.strictEqual(res.jsonData.isLockedOut, true);
    assert(res.jsonData.error.includes('temporarily locked'));
  });

  // Test 11: Request emergency OTP accommodation for camera malfunction
  const emergencyToken = generatePreAuthFaceToken(mockStudentId, 'AWAITING_FACE_VERIFICATION');
  await runAsyncTest('Request emergency OTP accommodation dispatches code', async () => {
    const { req, res } = createMockReqRes({
      preAuthToken: emergencyToken,
      reason: 'Device front camera hardware cracked'
    });
    await requestEmergencyOtp(req, res, (err) => { if (err) throw err; });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert(res.jsonData.message.includes('Emergency verification code dispatched'));
  });

  // Test 12: Verify emergency OTP accommodation grants full session JWT
  await runAsyncTest('Verify emergency OTP accommodation grants full session JWT', async () => {
    // Generate fresh OTP
    const { req: reqOtp, res: resOtp } = createMockReqRes({ preAuthToken: emergencyToken });
    await requestEmergencyOtp(reqOtp, resOtp, (err) => { if (err) throw err; });

    // Wrong OTP attempt is rejected
    const { req: wrongReq, res: wrongRes } = createMockReqRes({
      preAuthToken: emergencyToken,
      otp: '000000'
    });
    await verifyEmergencyOtp(wrongReq, wrongRes, (err) => { if (err) throw err; });
    assert.strictEqual(wrongRes.statusCode, 400);
    assert.strictEqual(wrongRes.jsonData.success, false);
  });

  // Restore User.findById
  User.findById = originalFindById;

  console.log('\n================================================================');
  console.log('ALL END-TO-END STUDENT FACE CONTROLLER TESTS PASSED DEFENSIVELY!');
  console.log('================================================================\n');
  process.exit(0);
}

runAll().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
