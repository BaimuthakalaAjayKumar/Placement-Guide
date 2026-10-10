export type UserRole =
  | 'student'
  | 'faculty'
  | 'hod'
  | 'administrator'
  | 'admin'
  | 'director'
  | 'principal'
  | 'placement_officer'
  | 'recruiter'
  | 'auditor'
  | 'super_admin';

export interface ManagedScope {
  academicYear: string;
  branch?: string;
  section?: string;
  subject?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  campusId?: string | null;
  departmentId?: string | null;
  department?: string;
  branch?: string;
  section?: string;
  year?: string;
  academicYear?: string;
  rollNumber?: string;
  mobileNumber?: string;
  phone?: string;
  isLocked?: boolean;
  lockReason?: string;
  managedScopes?: ManagedScope[];
  loginCount?: number;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  error?: string;
}

export interface CaptchaVerification {
  token: string;
  timestamp: number;
  verified: boolean;
  provider: 'turnstile' | 'recaptcha' | 'internal_challenge';
}

export interface LoginCredentials {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCachedSession?: boolean;
  isBiometricLocked?: boolean;
  isBiometricSupported?: boolean;
  biometricLabel?: string;
  role: UserRole | null;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  unlockWithBiometrics?: () => Promise<{ success: boolean; error?: string }>;
}
