// Centralized API and Backend configuration
// Ensures consistent base URLs, dynamic environment variable resolution,
// and flawless routing across Localhost, LAN devices, and Vercel/Render production.

const sanitizeUrl = (url) => {
  if (!url) return '';
  return url.replace(/\/+$/, '');
};

const getApiUrl = () => {
  const configuredUrl = sanitizeUrl(import.meta.env.VITE_API_URL);

  // When executed in the browser environment:
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;

    // 1. If running on HTTPS or on Vercel deployment, always use cloud HTTPS backend
    // (Prevents browser mixed-content blocking of http://localhost:5000)
    if (protocol === 'https:' || hostname.includes('vercel.app')) {
      if (configuredUrl && configuredUrl.startsWith('https://')) {
        return configuredUrl;
      }
      return 'https://placement-guide.onrender.com/api';
    }

    // 2. If running locally on 127.0.0.1, match the 127.0.0.1 hostname
    if (hostname === '127.0.0.1') {
      return 'http://127.0.0.1:5000/api';
    }

    // 3. If running locally on localhost, match localhost
    if (hostname === 'localhost') {
      return 'http://localhost:5000/api';
    }

    // 4. If accessed via local area network IP (e.g. 192.168.x.x, 10.x.x.x, 172.x.x.x)
    if (
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname !== 'localhost'
    ) {
      return `http://${hostname}:5000/api`;
    }
  }

  // Fallback for SSR or build time
  if (configuredUrl) {
    return configuredUrl;
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

/**
 * Quick connection check helper to verify backend availability
 */
export const checkBackendHealth = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    return false;
  }
};

export default {
  API_URL,
  BASE_URL,
  getImageUrl,
  checkBackendHealth
};
