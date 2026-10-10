/**
 * CAMPUSBRIDGE MOBILE — ERROR SANITIZATION & NORMALIZATION UTILITIES
 * Hardens client-side error handling to prevent leakage of server internals,
 * connection string secrets, SQL/NoSQL stack traces, or auth tokens.
 */

export function formatApiErrorMessage(error: any): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // 1. Check for request timeout (Axios code ECONNABORTED)
  if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
    return 'Request timed out. Please verify your connection and try again.';
  }

  // 2. Check for offline / network failure
  if (
    error.message === 'Network Error' ||
    error.code === 'ERR_NETWORK' ||
    (!error.response && error.request)
  ) {
    return 'Unable to connect to CampusBridge server. Please check your internet connection.';
  }

  // 3. Inspect server response status and payload
  const status = error.response?.status;
  const rawMsg =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.message;

  if (typeof rawMsg === 'string' && rawMsg.trim().length > 0) {
    const trimmed = rawMsg.trim();

    // Guard against leaking internal stack traces or database errors
    const isSensitiveInternalError =
      /mongo|cast|syntaxerror|typeerror|jwt|bearer|econnrefused|at\s+\/app|internal server/i.test(trimmed);

    if (!isSensitiveInternalError) {
      return trimmed;
    }
  }

  // Fallbacks by HTTP Status Code
  if (status === 401) {
    return 'Session expired or invalid credentials. Please sign in again.';
  }
  if (status === 403) {
    return 'Access Denied: You do not have permission to access or modify this resource.';
  }
  if (status === 404) {
    return 'The requested resource was not found on the institutional server.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  if (status && status >= 500) {
    return 'CampusBridge server is temporarily unavailable. Please try again shortly.';
  }

  return 'Operation failed. Please verify your network and retry.';
}

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    Boolean(!error.response && error.request)
  );
}

export function isTimeoutError(error: any): boolean {
  if (!error) return false;
  return error.code === 'ECONNABORTED' || Boolean(error.message && error.message.toLowerCase().includes('timeout'));
}

export function isAuthSessionExpired(error: any): boolean {
  return error?.response?.status === 401;
}
