/**
 * CampusBridge Turnstile Verification Service
 * Verifies Cloudflare Turnstile CAPTCHA tokens server-side.
 */

const CLOUDFLARE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Verify a Turnstile CAPTCHA token
 * @param {string} token - The client-supplied captchaToken
 * @param {string} [remoteIp] - Optional client IP address
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function verifyTurnstileToken(token, remoteIp) {
  // Fail-closed if token is missing or invalid type
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return {
      success: false,
      error: 'CAPTCHA token is required'
    };
  }

  // Read secret ONLY from environment variable - NEVER hardcode or fallback
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey || typeof secretKey !== 'string' || secretKey.trim().length === 0) {
    console.error('[TurnstileService] Server error: TURNSTILE_SECRET_KEY is not configured');
    return {
      success: false,
      error: 'CAPTCHA service configuration missing'
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey.trim());
    formData.append('response', token.trim());
    if (remoteIp && typeof remoteIp === 'string') {
      formData.append('remoteip', remoteIp.trim());
    }

    const response = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      console.error(`[TurnstileService] Verification endpoint returned HTTP status ${response.status}`);
      return {
        success: false,
        error: 'CAPTCHA verification service unavailable'
      };
    }

    const result = await response.json();

    if (result && result.success === true) {
      return { success: true };
    }

    // Do NOT log the token, secret, or full payload
    const errorCodes = Array.isArray(result?.['error-codes']) ? result['error-codes'].join(', ') : 'unknown';
    console.warn(`[TurnstileService] Verification rejected by Cloudflare: ${errorCodes}`);

    return {
      success: false,
      error: 'CAPTCHA verification failed'
    };
  } catch (err) {
    // Handle timeout, network, or DNS errors cleanly
    if (err.name === 'TimeoutError' || err.code === 'ABORT_ERR') {
      console.error('[TurnstileService] Verification request timed out');
      return {
        success: false,
        error: 'CAPTCHA verification timed out'
      };
    }

    console.error(`[TurnstileService] Network/system error during verification: ${err.message || 'unknown error'}`);
    return {
      success: false,
      error: 'CAPTCHA verification network error'
    };
  }
}

module.exports = {
  verifyTurnstileToken
};
