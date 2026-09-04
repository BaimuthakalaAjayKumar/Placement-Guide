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
        setToken(data.token);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || 'Invalid credentials. Please try again.' };
      }
    } catch (err) {
      const isConnectionError = err.message?.includes('Failed to fetch') || err.name === 'TypeError';
      return {
        success: false,
        error: isConnectionError
          ? 'Network error. Could not connect to backend server. Please try again later.'
          : (err.message || 'Network error. Please try again later.')
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout User
  const logout = () => {
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
        resetPassword,
        loadUser: () => loadUser(token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
