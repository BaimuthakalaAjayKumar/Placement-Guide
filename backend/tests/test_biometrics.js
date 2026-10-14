const assert = require('assert');
const {
  EMBEDDING_DIM,
  SIMILARITY_THRESHOLD,
  AMBIGUOUS_THRESHOLD,
  extractNormalizedEmbedding,
  encryptEmbedding,
  decryptEmbedding,
  compareEmbeddings,
  generateLivenessChallenge,
  validateLivenessChallenge,
  generateFaceVerificationToken,
  verifyAndConsumeFaceToken
} = require('../services/biometricService');

console.log('--- RUNNING BIOMETRIC SERVICE UNIT TESTS ---');

// Test 1: Normalization and Embedding extraction
const rawVector = new Array(EMBEDDING_DIM).fill(0).map((_, i) => Math.sin(i));
const normalized = extractNormalizedEmbedding(rawVector);
assert.strictEqual(normalized.length, EMBEDDING_DIM, 'Embedding length must be 128');
const norm = Math.sqrt(normalized.reduce((sum, v) => sum + v * v, 0));
assert(Math.abs(norm - 1.0) < 1e-4, 'L2 norm must equal 1.0');
console.log('✓ Test 1 Passed: Normalized 128-dimensional embedding generation');

// Test 2: AES-256-GCM Encryption & Decryption roundtrip
const encrypted = encryptEmbedding(normalized);
assert(encrypted.encryptedEmbedding, 'Encrypted ciphertext must exist');
assert(encrypted.authTag, 'Auth tag must exist');
assert(encrypted.iv, 'IV must exist');
// Ensure encrypted string is not plaintext
assert.notStrictEqual(encrypted.encryptedEmbedding, JSON.stringify(normalized));

const decrypted = decryptEmbedding(encrypted.encryptedEmbedding, encrypted.authTag, encrypted.iv);
assert.strictEqual(decrypted.length, EMBEDDING_DIM);
for (let i = 0; i < EMBEDDING_DIM; i++) {
  assert(Math.abs(decrypted[i] - normalized[i]) < 1e-5, `Decrypted element ${i} must match original`);
}
console.log('✓ Test 2 Passed: AES-256-GCM Encryption at rest roundtrip');

// Test 3: Cosine Similarity matching & Defensible threshold
// Same vector -> similarity 1.0
const matchResult = compareEmbeddings(normalized, normalized);
assert.strictEqual(matchResult.similarity, 1.0);
assert.strictEqual(matchResult.isMatch, true, 'Self-match must be confirmed');
assert.strictEqual(matchResult.isAmbiguous, false);

// Perturbed vector with slight variation (~0.85 similarity)
const slightlyPerturbed = normalized.map((v, i) => v + (Math.sin(i * 13) * 0.1));
const perturbedNormalized = extractNormalizedEmbedding(slightlyPerturbed);
const perturbedMatch = compareEmbeddings(normalized, perturbedNormalized);
assert(perturbedMatch.similarity >= SIMILARITY_THRESHOLD, `Similarity ${perturbedMatch.similarity} should meet threshold 0.75`);
assert.strictEqual(perturbedMatch.isMatch, true);

// Inverted or orthogonal vector -> mismatch
const invertedVector = normalized.map(v => -v);
const mismatchResult = compareEmbeddings(normalized, invertedVector);
assert.strictEqual(mismatchResult.isMatch, false, 'Inverted vector must be rejected');
assert.strictEqual(mismatchResult.isAmbiguous, false);

// Different face random vector
const differentFace = new Array(EMBEDDING_DIM).fill(0).map((_, i) => Math.cos(i * 97 + 13));
const diffNormalized = extractNormalizedEmbedding(differentFace);
const diffMatch = compareEmbeddings(normalized, diffNormalized);
assert(diffMatch.similarity < SIMILARITY_THRESHOLD, 'Different face must not meet threshold');
console.log(`✓ Test 3 Passed: Cosine Similarity matching (Self: ${matchResult.similarity}, Perturbed: ${perturbedMatch.similarity}, Different: ${diffMatch.similarity})`);

// Test 4: Liveness Challenge Generation & Validation
const userId = '507f1f77bcf86cd799439011';
const challenge = generateLivenessChallenge(userId);
assert(challenge.challengeNonce, 'Nonce must be generated');
assert(challenge.promptAction, 'Prompt action must be assigned');

// Nonce consumption & anti-replay
const validLiveness = validateLivenessChallenge(userId, challenge.challengeNonce, {
  opticalVariance: 0.25,
  framesSampled: 5
});
assert.strictEqual(validLiveness.success, true, 'Valid liveness challenge should pass');

// Second attempt with same nonce must fail (anti-replay)
const replayLiveness = validateLivenessChallenge(userId, challenge.challengeNonce, {
  opticalVariance: 0.25,
  framesSampled: 5
});
assert.strictEqual(replayLiveness.success, false, 'Replayed challenge nonce must be rejected');

// Static presentation attack detection (low variance)
const challenge2 = generateLivenessChallenge(userId);
const staticAttack = validateLivenessChallenge(userId, challenge2.challengeNonce, {
  opticalVariance: 0.02, // Near-zero variance indicates static photo or printed paper
  framesSampled: 4
});
assert.strictEqual(staticAttack.success, false, 'Static photo presentation attack must be detected and rejected');
console.log('✓ Test 4 Passed: Liveness challenge protocol and anti-spoofing detection');

// Test 5: Signed Face Verification Token, Purpose Scoping & Anti-Replay
process.env.JWT_SECRET = 'test-biometric-jwt-secret-xyz';
const token = generateFaceVerificationToken(userId, 'student', 'ATTENDANCE_CHECKIN', 0.88);
assert(typeof token === 'string' && token.length > 20, 'JWT token must be generated');

// Verify token with correct user and purpose
const verifyOk = verifyAndConsumeFaceToken(token, userId, 'ATTENDANCE_CHECKIN');
assert.strictEqual(verifyOk.valid, true, 'Token verification should succeed');
assert.strictEqual(verifyOk.payload.userId, userId);
assert.strictEqual(verifyOk.payload.purpose, 'ATTENDANCE_CHECKIN');

// Attempt to replay the consumed token
const replayAttempt = verifyAndConsumeFaceToken(token, userId, 'ATTENDANCE_CHECKIN');
assert.strictEqual(replayAttempt.valid, false, 'Replaying consumed verification token must be blocked');

// Purpose mismatch rejection
const token2 = generateFaceVerificationToken(userId, 'student', 'CAMPUS_ARRIVAL', 0.91);
const purposeMismatch = verifyAndConsumeFaceToken(token2, userId, 'ATTENDANCE_CHECKIN');
assert.strictEqual(purposeMismatch.valid, false, 'Purpose mismatch must be rejected');

// User mismatch rejection
const otherUserId = '607f1f77bcf86cd799439022';
const token3 = generateFaceVerificationToken(userId, 'student', 'ATTENDANCE_CHECKIN', 0.89);
const userMismatch = verifyAndConsumeFaceToken(token3, otherUserId, 'ATTENDANCE_CHECKIN');
assert.strictEqual(userMismatch.valid, false, 'User identity mismatch must be rejected');

console.log('✓ Test 5 Passed: Signed Face Verification Token with Anti-Replay and Scoping');
console.log('ALL BIOMETRIC SERVICE UNIT TESTS COMPLETED SUCCESSFULLY!\n');
