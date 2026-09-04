// Centralized API and Backend configuration
// Ensures consistent base URLs and dynamic environment variable resolution

const sanitizeUrl = (url) => {
  if (!url) return '';
  return url.replace(/\/+$/, '');
};

// Base API endpoint URL (always points to /api)
// Reads VITE_API_URL from environment; defaults to local development server
const rawApiUrl = import.meta.env.VITE_API_URL;
export const API_URL = sanitizeUrl(rawApiUrl) || 'http://localhost:5000/api';

// Base backend server URL (strips trailing /api, useful for static assets and uploads)
export const BASE_URL = API_URL.replace(/\/api$/, '');

/**
 * Resolves static or uploaded asset URLs safely.
 * If the path is already an absolute URL or data URI, returns it as is.
 * Otherwise prefixes with the active backend BASE_URL.
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${BASE_URL}/${cleanPath}`;
};

export default {
  API_URL,
  BASE_URL,
  getImageUrl,
};
