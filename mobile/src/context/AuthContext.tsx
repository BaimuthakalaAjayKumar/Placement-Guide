import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthContextType, LoginCredentials, User, UserRole } from '../types/auth';
import { getToken, saveToken, getUserData, saveUserData, clearAuthStorage } from '../utils/storage';
import { loginUser, logoutUser, getMe } from '../api/authApi';
import { registerUnauthorizedHandler } from '../api/client';
import { formatApiErrorMessage } from '../utils/errorUtils';
import {
  checkBiometricCapabilities,
  isBiometricUnlockEnabled,
  promptBiometricUnlock,
} from '../utils/biometric';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCachedSession, setIsCachedSession] = useState<boolean>(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState<boolean>(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  const [biometricLabel, setBiometricLabel] = useState<string>('Biometrics');

  // Restore authenticated session on app launch
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await getToken();
      const cachedUser = await getUserData();

      // Check device biometric capabilities
      try {
        const caps = await checkBiometricCapabilities();
        setIsBiometricSupported(caps.hasHardware && caps.isEnrolled);
        setBiometricLabel(caps.typeLabel);
      } catch {
        setIsBiometricSupported(false);
      }

      if (storedToken) {
        setToken(storedToken);
        if (cachedUser) {
          setUser(cachedUser);
          setIsCachedSession(true);
        }

        // Verify if user previously enabled local biometric app lock
        const bioEnabled = await isBiometricUnlockEnabled();
        if (bioEnabled) {
          setIsBiometricLocked(true);
        } else {
          setIsBiometricLocked(false);
        }

        // Verify token with backend & refresh profile in background
        try {
          const freshData = await getMe();
          if (freshData?.data) {
            setUser(freshData.data);
            setIsCachedSession(false);
            await saveUserData(freshData.data);
          }
        } catch (apiErr: any) {
          if (apiErr?.response?.status === 401) {
            // Token expired or invalid
            await clearAuthStorage();
            setToken(null);
            setUser(null);
            setIsCachedSession(false);
            setIsBiometricLocked(false);
          }
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to restore session:', err);
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
      setIsCachedSession(false);
      setIsBiometricLocked(false);
    });
  }, [restoreSession]);

  const unlockWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await promptBiometricUnlock('Unlock CampusBridge Session');
      if (res.success) {
        setIsBiometricLocked(false);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Biometric verification failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await loginUser(credentials);
      if (response.success && response.token && response.user) {
        await saveToken(response.token);
        await saveUserData(response.user);
        setToken(response.token);
        setUser(response.user);
        setIsCachedSession(false);
        setIsBiometricLocked(false);
        return { success: true };
      }
      return { success: false, error: response.error || 'Login failed.' };
    } catch (err: any) {
      const errorMessage = formatApiErrorMessage(err);
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
      setIsCachedSession(false);
      setIsBiometricLocked(false);
      setIsLoading(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const freshData = await getMe();
      if (freshData?.data) {
        setUser(freshData.data);
        setIsCachedSession(false);
        await saveUserData(freshData.data);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to refresh profile:', err);
    }
  };

  const role: UserRole | null = user?.role ?? null;
  const isAuthenticated = Boolean(token && user && !isBiometricLocked);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isCachedSession,
        isBiometricLocked,
        isBiometricSupported,
        biometricLabel,
        role,
        login,
        logout,
        refreshProfile,
        unlockWithBiometrics,
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
