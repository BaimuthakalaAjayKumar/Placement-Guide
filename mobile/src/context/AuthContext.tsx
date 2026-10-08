import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthContextType, LoginCredentials, User, UserRole } from '../types/auth';
import { getToken, saveToken, getUserData, saveUserData, clearAuthStorage } from '../utils/storage';
import { loginUser, logoutUser, getMe } from '../api/authApi';
import { registerUnauthorizedHandler } from '../api/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on app launch
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await getToken();
      const cachedUser = await getUserData();

      if (storedToken) {
        setToken(storedToken);
        if (cachedUser) {
          setUser(cachedUser);
        }

        // Verify token with backend & refresh profile in background
        try {
          const freshData = await getMe();
          if (freshData?.data) {
            setUser(freshData.data);
            await saveUserData(freshData.data);
          }
        } catch (apiErr: any) {
          if (apiErr?.response?.status === 401) {
            // Token expired or invalid
            await clearAuthStorage();
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch (err) {
      console.error('[AuthContext] Failed to restore session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Register 401 listener from Axios client
    registerUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, [restoreSession]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      if (response.success && response.token && response.user) {
        await saveToken(response.token);
        await saveUserData(response.user);
        setToken(response.token);
        setUser(response.user);
        return { success: true };
      }
      return { success: false, error: response.error || 'Login failed.' };
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to connect to CampusBridge server.';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.warn('[AuthContext] Backend logout request error:', err);
    } finally {
      await clearAuthStorage();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const freshData = await getMe();
      if (freshData?.data) {
        setUser(freshData.data);
        await saveUserData(freshData.data);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to refresh profile:', err);
    }
  };

  const role: UserRole | null = user?.role ?? null;
  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        role,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
