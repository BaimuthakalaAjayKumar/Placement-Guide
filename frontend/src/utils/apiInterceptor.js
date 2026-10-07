/**
 * CAMPUSBRIDGE — GLOBAL AUTH ERROR & PERMISSION INTERCEPTOR
 * Centralized handling for 401 (Unauthorized / Stale Session) and 403 (Forbidden / Scope Restriction).
 *
 * Guarantees:
 * - 401: Clears stale token, redirects to /login preserving intended destination
 * - 403: Displays/dispatches sanitized permission warning, hides internal traces
 * - Zero JWT exposure
 * - Zero breakage of existing fetch/axios API calls
 */

import axios from 'axios';

let isInterceptorInitialized = false;

export const initAuthInterceptors = () => {
  if (isInterceptorInitialized) return;
  isInterceptorInitialized = true;

  // 1. Axios Response Interceptor
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status } = error.response;
        const requestUrl = error.config?.url || '';

        // 401: Unauthorized / Session Expired
        if (status === 401) {
          const isAuthEndpoint =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/register') ||
            requestUrl.includes('/auth/resetpassword');

          if (!isAuthEndpoint && typeof window !== 'undefined') {
            const hadToken = !!localStorage.getItem('token');
            if (hadToken) {
              localStorage.removeItem('token');
              if (window.location.pathname !== '/login') {
                const target = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login?redirect=${target}`;
              }
            }
          }
        }

        // 403: Forbidden / Permission Denied
        if (status === 403) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('auth:forbidden', {
                detail: {
                  message: 'You do not have permission to perform this action.',
                  endpoint: requestUrl.split('?')[0]
                }
              })
            );
          }
        }
      }
      return Promise.reject(error);
    }
  );

  // 2. Window.fetch Monkey-Patch (Centralized Fallback)
  if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response && response.status === 401) {
        const requestUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const isAuthEndpoint =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/register') ||
          requestUrl.includes('/auth/resetpassword');

        if (!isAuthEndpoint) {
          const hadToken = !!localStorage.getItem('token');
          if (hadToken) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
              const target = encodeURIComponent(window.location.pathname + window.location.search);
              window.location.href = `/login?redirect=${target}`;
            }
          }
        }
      } else if (response && response.status === 403) {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden', {
            detail: {
              message: 'You do not have permission to perform this action.'
            }
          })
        );
      }

      return response;
    };
  }
};

export default initAuthInterceptors;
