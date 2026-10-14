import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL } from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Get current user details from token
  const loadUser = async (authToken) => {
    if (!authToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.data);
      } else {
        // Token invalid/expired
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load user', err);
      // Don't log out on network failure, just hold off
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser(token);
  }, [token]);

  // Register User
  const register = async (name, email, password, role = 'student', leetcodeUsername = '', codeforcesUsername = '', codechefUsername = '', hackerrankUsername = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role, leetcodeUsername, codeforcesUsername, codechefUsername, hackerrankUsername })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('app_theme_pref', 'dark');
        localStorage.setItem('app_theme', 'dark');
        window.dispatchEvent(new CustomEvent('account_opened', { detail: 'dark' }));
        setToken(data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again later.' };
    } finally {
      setLoading(false);
    }
  };

  // Login User
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        return {
          success: false,
          error: `Server returned HTTP ${res.status} (${res.statusText || 'Error'}). Check backend deployment.`
        };
      }

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('app_theme_pref', 'dark');
        localStorage.setItem('app_theme', 'dark');
        window.dispatchEvent(new CustomEvent('account_opened', { detail: 'dark' }));
        setToken(data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Invalid credentials. Please try again.' };
      }
    } catch (err) {
      const isConnectionError = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
      const isProduction = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname.includes('vercel.app'));
      const errorMsg = isConnectionError
        ? (isProduction
            ? 'Cannot connect to backend server. Render cloud servers spin down after inactivity and take ~30-50s to wake up on first request. Please wait a few moments and click Sign In again.'
            : 'Cannot connect to backend server. Please ensure the backend is running on http://localhost:5000 (run "npm run dev" in the backend directory or run start.bat).')
        : (err.message || 'Network error. Please try again later.');
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setLoading(false);
    }
  };

  // Student heartbeat tracking for active session duration and audit log
  useEffect(() => {
    if (!token || !user || user.role !== 'student') return;

    const sendHeartbeat = async (seconds = 60) => {
      if (document.visibilityState === 'hidden') return;
      try {
        await fetch(`${API_URL}/audit/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            durationSeconds: seconds,
            currentPath: window.location.pathname,
            pageTitle: document.title
          })
        });
      } catch (e) {
        // silent fail
      }
    };

    // Initial ping
    sendHeartbeat(30);

    // Periodic heartbeat every 60 seconds
    const interval = setInterval(() => {
      sendHeartbeat(60);
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(30);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token, user?.role, user?._id]);

  // Logout User
  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      } catch (e) {
        // silent
      }
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Update Profile
  const updateProfile = async (profileData) => {
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.data);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Could not update profile.' };
    }
  };

  // Upload or update Profile Photo (File or base64 camera capture)
  const uploadProfilePhoto = async (photoData, isFile = false) => {
    try {
      let options;
      if (isFile) {
        const formData = new FormData();
        formData.append('photo', photoData);
        options = {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        };
      } else {
        options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ photo: photoData })
        };
      }

      const res = await fetch(`${API_URL}/auth/profile-photo`, options);
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        return { success: true, profilePicture: data.profilePicture };
      } else {
        return { success: false, error: data.error || 'Failed to upload profile photo.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Could not upload profile photo.' };
    }
  };

  // Remove Profile Photo
  const removeProfilePhoto = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/profile-photo`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to remove profile photo.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Could not remove profile photo.' };
    }
  };

  // Reset Password & Log In automatically
  const resetPassword = async (resetToken, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/resetpassword/${resetToken}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('app_theme_pref', 'dark');
        localStorage.setItem('app_theme', 'dark');
        window.dispatchEvent(new CustomEvent('account_opened', { detail: 'dark' }));
        setToken(data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again later.' };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        updateProfile,
        uploadProfilePhoto,
        removeProfilePhoto,
        resetPassword,
        loadUser: () => loadUser(token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
