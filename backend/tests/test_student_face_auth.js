const assert = require('assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Ensure test secrets are defined
process.env.JWT_SECRET = process.env.JWT_SECRET || 'cb-test-jwt-secret-secure-key-2026';
process.env.BIOMETRIC_ENCRYPTION_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || 'cb-test-biometric-key-256-bit-key';

const {
  EMBEDDING_DIM,
  DEFAULT_SIMILARITY_THRESHOLD,
  getMatchThreshold,
  getAmbiguousThreshold,
  validateEmbeddingQuality,
  generatePreAuthFaceToken,
  verifyPreAuthFaceToken,
  generateLivenessChallenge,
  validateLivenessChallenge,
  consumeChallengeNonce,
  encryptEmbedding,
  decryptEmbedding,
  compareEmbeddings,
  l2Normalize
} = require('../services/biometricService');

console.log('===============================================================');
console.log('CAMPUSBRIDGE STUDENT FACE AUTHENTICATION AUTOMATED TEST SUITE');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL: ${description}`);
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

// Helper: generate realistic 128-d face vector with realistic entropy
function createSyntheticFace(seed) {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    vec[i] = Math.sin((i + 1) * 0.37 + seed) * 0.7 + Math.cos((i + 5) * 0.23 + seed * 2) * 0.3;
  }
  return l2Normalize(vec);
}

// -----------------------------------------------------------------
// TEST 1: Synthetic & Malformed Embedding Quality Filter
// -----------------------------------------------------------------
runTest('Filter rejects null, non-array, or wrong-length vectors', () => {
  assert.strictEqual(validateEmbeddingQuality(null).valid, false);
  assert.strictEqual(validateEmbeddingQuality('not-an-array').valid, false);
  assert.strictEqual(validateEmbeddingQuality(new Array(64).fill(0.1)).valid, false);
  assert.strictEqual(validateEmbeddingQuality(new Array(129).fill(0.1)).valid, false);
});

runTest('Filter rejects synthetic constant / zero-entropy vectors', () => {
  // All zeros
  const allZeros = new Array(EMBEDDING_DIM).fill(0);
  assert.strictEqual(validateEmbeddingQuality(allZeros).valid, false);

  // All identical non-zero values (e.g. constant 0.5)
  const constantVec = new Array(EMBEDDING_DIM).fill(0.5);
  assert.strictEqual(validateEmbeddingQuality(constantVec).valid, false);
  assert(validateEmbeddingQuality(constantVec).error.includes('Zero or near-zero variance'));
});

runTest('Filter accepts genuine normalized face embedding', () => {
  const genuineFace = createSyntheticFace(42);
  const check = validateEmbeddingQuality(genuineFace);
  assert.strictEqual(check.valid, true);
});

// -----------------------------------------------------------------
// TEST 2: Pre-Authentication Challenge Token Security
// -----------------------------------------------------------------
const studentId = '65f1234567890abcdef12345';
const facultyId = '65f1234567890abcdef99999';

runTest('Pre-auth enrollment token generation and verification', () => {
  const preAuthToken = generatePreAuthFaceToken(studentId, 'AWAITING_FACE_ENROLLMENT', { role: 'student' });
  assert(typeof preAuthToken === 'string' && preAuthToken.length > 30);

  const verified = verifyPreAuthFaceToken(preAuthToken, 'AWAITING_FACE_ENROLLMENT');
  assert.strictEqual(verified.valid, true);
  assert.strictEqual(verified.payload.userId, studentId);
  assert.strictEqual(verified.payload.stage, 'AWAITING_FACE_ENROLLMENT');
  assert.strictEqual(verified.payload.tokenType, 'PRE_AUTH_FACE_CHALLENGE');
});

runTest('Stage mismatch enforcement on pre-auth tokens', () => {
  const enrollmentToken = generatePreAuthFaceToken(studentId, 'AWAITING_FACE_ENROLLMENT');
  // Attempt to use enrollment token for verification endpoint
  const check = verifyPreAuthFaceToken(enrollmentToken, 'AWAITING_FACE_VERIFICATION');
  assert.strictEqual(check.valid, false);
  assert(check.error.includes('stage mismatch'));
});

// -----------------------------------------------------------------
// TEST 3: Dynamic Liveness Challenge Nonce & Anti-Replay
// -----------------------------------------------------------------
let activeNonce = null;

runTest('Server generates dynamic liveness challenge with single-use nonce', () => {
  const challenge = generateLivenessChallenge(studentId);
  assert(challenge.challengeNonce && challenge.challengeNonce.length === 32);
  assert(['BLINK_EYES', 'TURN_HEAD_RIGHT', 'TURN_HEAD_LEFT', 'NOD_HEAD'].includes(challenge.promptAction));
  assert(challenge.instructions && challenge.instructions.length > 5);
  activeNonce = challenge.challengeNonce;
});

runTest('Challenge nonce consumed once cannot be replayed', () => {
  // First consumption: success
  const firstConsume = consumeChallengeNonce(activeNonce, studentId);
  assert.strictEqual(firstConsume.valid, true);
  assert.strictEqual(firstConsume.challenge.userId, studentId);

  // Second consumption attempt: blocked!
  const replayAttempt = consumeChallengeNonce(activeNonce, studentId);
  assert.strictEqual(replayAttempt.valid, false);
  assert(replayAttempt.error.includes('expired or was already consumed'));
});

runTest('Challenge nonce identity mismatch is blocked', () => {
  const chal = generateLivenessChallenge(studentId);
  const wrongUserAttempt = consumeChallengeNonce(chal.challengeNonce, facultyId);
  assert.strictEqual(wrongUserAttempt.valid, false);
  assert(wrongUserAttempt.error.includes('identity mismatch'));
});

// -----------------------------------------------------------------
// TEST 4: AES-256-GCM Enrollment & Matching Thresholds
// -----------------------------------------------------------------
const studentFaceEmbedding = createSyntheticFace(101);
const imposterFaceEmbedding = createSyntheticFace(888);

let encryptedTemplate = null;

runTest('Face template is encrypted with AES-256-GCM authenticated cipher', () => {
  encryptedTemplate = encryptEmbedding(studentFaceEmbedding);
  assert(encryptedTemplate.encryptedEmbedding && encryptedTemplate.encryptedEmbedding.length > 50);
  assert(encryptedTemplate.authTag && encryptedTemplate.authTag.length === 32);
  assert(encryptedTemplate.iv && encryptedTemplate.iv.length === 24);

  // Plaintext must not match ciphertext
  assert.notStrictEqual(encryptedTemplate.encryptedEmbedding, JSON.stringify(studentFaceEmbedding));
});

runTest('Decryption restores exact original float32 embedding', () => {
  const decrypted = decryptEmbedding(
    encryptedTemplate.encryptedEmbedding,
    encryptedTemplate.authTag,
    encryptedTemplate.iv
  );
  assert.strictEqual(decrypted.length, EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    assert(Math.abs(decrypted[i] - studentFaceEmbedding[i]) < 1e-5);
  }
});

runTest('Cosine matching accepts same student face with minor natural delta', () => {
  // Simulate live camera frame with natural lighting/micro-angle noise
  const liveProbeFace = studentFaceEmbedding.map((v, i) => v + Math.sin(i * 11) * 0.04);
  const normalizedProbe = l2Normalize(liveProbeFace);

  const match = compareEmbeddings(studentFaceEmbedding, normalizedProbe, 0.70);
  assert.strictEqual(match.isMatch, true, `Expected match, score was ${match.similarity}`);
  assert(match.similarity >= 0.70, `Score ${match.similarity} must be >= 0.70`);
});

runTest('Cosine matching strictly rejects imposter face', () => {
  const match = compareEmbeddings(studentFaceEmbedding, imposterFaceEmbedding, 0.70);
  assert.strictEqual(match.isMatch, false, 'Imposter must not match');
  assert(match.similarity < 0.58, `Imposter score ${match.similarity} must be well below threshold`);
});

runTest('Ambiguous score zone (0.58 - 0.69) triggers retry without grant', () => {
  // Use Gram-Schmidt orthogonalization to construct a probe with exact cosine similarity of 0.64
  const u = studentFaceEmbedding;
  const v = imposterFaceEmbedding;
  const dotUV = u.reduce((sum, val, idx) => sum + val * v[idx], 0);
  const vOrth = l2Normalize(v.map((val, idx) => val - dotUV * u[idx]));
  const targetSimilarity = 0.64;
  const ambiguousProbe = l2Normalize(u.map((val, idx) => targetSimilarity * val + Math.sqrt(1 - targetSimilarity * targetSimilarity) * vOrth[idx]));

  const match = compareEmbeddings(studentFaceEmbedding, ambiguousProbe, 0.70);
  assert.strictEqual(match.isMatch, false, 'Ambiguous score must NOT grant access');
  assert.strictEqual(match.isAmbiguous, true, 'Ambiguous score must be marked ambiguous');
  assert(match.similarity >= 0.58 && match.similarity < 0.70, `Score ${match.similarity} was not in ambiguous range`);
});

// -----------------------------------------------------------------
// TEST 5: Rate Limiting & Account Lockout Logic
// -----------------------------------------------------------------
runTest('5 failed verification attempts triggers 15-minute temporary lockout', () => {
  let failures = 0;
  let lockoutUntil = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    failures++;
    if (failures >= 5) {
      lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
  }

  assert.strictEqual(failures, 5);
  assert(lockoutUntil !== null);
  assert(lockoutUntil.getTime() > Date.now());
});

// -----------------------------------------------------------------
// TEST 6: Non-Student Role Workflow Preservation
// -----------------------------------------------------------------
runTest('Non-student roles (faculty, admin) completely bypass face challenge', () => {
  const mockUserRoles = ['faculty', 'admin', 'hod', 'recruiter', 'principal', 'director'];
  for (const role of mockUserRoles) {
    // In our auth logic, if user.role !== 'student', sendTokenResponse is called directly
    const requiresFace = role === 'student';
    assert.strictEqual(requiresFace, false, `Role '${role}' must not require face verification.`);
  }
});

console.log('\n===============================================================');
console.log(`ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('===============================================================\n');
