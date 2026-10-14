const crypto = require('crypto');

/**
 * CAMPUSBRIDGE — PASS TOKEN & QR CRYPTOGRAPHY SERVICE
 * Generates and validates opaque, zero-PII tokens for visitor passes and digital guardian cards.
 * QR payloads contain strictly opaque identifiers, nonces, and HMAC signatures.
 */

const getSecret = () => process.env.JWT_SECRET || 'campusbridge_secure_gate_signing_key_2026';

/**
 * Generate a cryptographically secure random token nonce and its storage hash.
 */
const generateTokenNonce = () => {
  const nonce = crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(nonce).digest('hex');
  return { nonce, hash };
};

/**
 * Compute HMAC-SHA256 signature for a pass payload
 * @param {string} rawString 
 * @returns {string} 16-byte hex signature
 */
const signPayload = (rawString) => {
  return crypto.createHmac('sha256', getSecret()).update(rawString).digest('hex').substring(0, 32);
};

/**
 * Format an opaque QR payload with zero PII
 * Format: CB-PASS|v1|<campusCode>|<passType>|<identifier>|<nonce>|<sig>
 */
const createQrPayload = ({ campusCode, passType, identifier, nonce }) => {
  const base = `CB-PASS|v1|${(campusCode || 'CAMPUS').toUpperCase()}|${passType}|${identifier}|${nonce}`;
  const sig = signPayload(base);
  return `${base}|${sig}`;
};

/**
 * Parse and cryptographically verify a scanned QR text payload.
 * @param {string} qrText 
 * @returns {{ valid: boolean, error?: string, campusCode?: string, passType?: string, identifier?: string, nonce?: string }}
 */
const parseAndVerifyQrPayload = (qrText) => {
  if (!qrText || typeof qrText !== 'string') {
    return { valid: false, error: 'Empty or invalid QR code format' };
  }

  const parts = qrText.trim().split('|');
  if (parts.length !== 7 || parts[0] !== 'CB-PASS' || parts[1] !== 'v1') {
    return { valid: false, error: 'Invalid or unsupported CampusBridge QR format' };
  }

  const [, , campusCode, passType, identifier, nonce, signature] = parts;
  const base = `CB-PASS|v1|${campusCode}|${passType}|${identifier}|${nonce}`;
  const expectedSig = signPayload(base);

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Cryptographic signature mismatch. Possible counterfeit pass.' };
  }

  return {
    valid: true,
    campusCode,
    passType,
    identifier,
    nonce
  };
};

/**
 * Compute SHA256 hash of a nonce to compare with database hash
 */
const hashNonce = (nonce) => {
  return crypto.createHash('sha256').update(nonce).digest('hex');
};

module.exports = {
  generateTokenNonce,
  signPayload,
  createQrPayload,
  parseAndVerifyQrPayload,
  hashNonce
};
