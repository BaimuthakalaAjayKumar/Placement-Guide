// Centralized API and Backend configuration
// Ensures consistent base URLs and dynamic environment variable resolution

const sanitizeUrl = (url) => {
  if (!url) return '';
  return url.replace(/\/+$/, '');
};

const getApiUrl = () => {
  const configuredUrl = sanitizeUrl(import.meta.env.VITE_API_URL);

  if (configuredUrl) {
    // If running in browser and accessed via LAN IP or network name (not localhost),
    // and configuredUrl points to localhost, adapt host so remote devices reach backend
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1')) {
        return configuredUrl.replace(/localhost|127\.0\.0\.1/, window.location.hostname);
      }
    }
    return configuredUrl;
  }

  // If in production on Vercel or cloud HTTPS domain, default to Render backend
  if (typeof window !== 'undefined' && window.location.hostname && (window.location.hostname.includes('vercel.app') || window.location.protocol === 'https:')) {
    return 'https://placement-guide.onrender.com/api';
  }

  // Fallback: If accessed from LAN IP, use current hostname on default backend port 5000
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

// Base API endpoint URL (always points to /api)
export const API_URL = getApiUrl();

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
