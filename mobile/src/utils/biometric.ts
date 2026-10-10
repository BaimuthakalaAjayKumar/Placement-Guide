import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  typeLabel: string;
}

/**
 * Checks device biometric hardware availability and enrollment status.
 * Never stores or collects raw biometric samples or templates.
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const supportedTypes = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];

    let typeLabel = 'Biometric Unlock';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      typeLabel = 'Face ID / Facial Recognition';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      typeLabel = 'Fingerprint / Touch ID';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      typeLabel = 'Iris Recognition';
    }

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
      typeLabel,
    };
  } catch (error) {
    console.warn('[Biometric] Capability check error:', error);
    return {
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      typeLabel: 'Biometrics Unavailable',
    };
  }
}

/**
 * Reads whether the user has opted into local biometric app unlock.
 */
export async function isBiometricUnlockEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists the user preference for biometric app unlock in hardware-backed SecureStore.
 */
export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
    }
  } catch (error) {
    console.error('[Biometric] Failed to persist biometric preference:', error);
  }
}

/**
 * Prompts the operating system's native biometric dialog (Android BiometricPrompt / iOS LocalAuthentication).
 *
 * SAFETY GUARANTEES:
 * 1. Raw biometric data is handled entirely within OS TrustZone / Secure Enclave.
 * 2. This function ONLY returns a boolean success status for local app gate unlock.
 * 3. It does NOT claim identity to the backend and does NOT bypass backend JWT authorization.
 * 4. Fallback to password login is always supported.
 */
export async function promptBiometricUnlock(
  promptMessage: string = 'Unlock CampusBridge'
): Promise<{ success: boolean; error?: string }> {
  try {
    const caps = await checkBiometricCapabilities();
    if (!caps.hasHardware) {
      return { success: false, error: 'Biometric hardware is not available on this device.' };
    }
    if (!caps.isEnrolled) {
      return { success: false, error: 'No biometric credentials enrolled in device settings.' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Institutional Password',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    // Map common error codes
    if (result.error === 'user_cancel' || result.error === 'app_cancel') {
      return { success: false, error: 'Biometric authentication was cancelled.' };
    }
    if (result.error === 'user_fallback') {
      return { success: false, error: 'User opted for password authentication fallback.' };
    }
    if (result.error === 'lockout') {
      return { success: false, error: 'Biometric sensor locked due to multiple failed attempts. Use password.' };
    }

    return { success: false, error: result.warning || 'Biometric authentication failed.' };
  } catch (error: any) {
    console.warn('[Biometric] Native authentication invocation error:', error);
    return { success: false, error: error?.message || 'Biometric authentication encountered an error.' };
  }
}
