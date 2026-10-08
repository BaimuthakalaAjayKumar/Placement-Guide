import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from './constants';
import { User } from '../types/auth';

/**
 * Hardware-backed secure storage wrapper using expo-secure-store.
 * Stores JWT and cached profile using Android Keystore / iOS Keychain.
 *
 * CRITICAL RULE: NEVER use unencrypted AsyncStorage for tokens.
 */

export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch (error) {
    console.error('[SecureStore] Error saving token:', error);
    throw error;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('[SecureStore] Error retrieving token:', error);
    return null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('[SecureStore] Error deleting token:', error);
  }
}

export async function saveUserData(user: User): Promise<void> {
  try {
    const serialized = JSON.stringify(user);
    await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, serialized);
  } catch (error) {
    console.error('[SecureStore] Error saving user data:', error);
  }
}

export async function getUserData(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch (error) {
    console.error('[SecureStore] Error reading user data:', error);
    return null;
  }
}

export async function clearAuthStorage(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN),
      SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA),
    ]);
  } catch (error) {
    console.error('[SecureStore] Error clearing auth storage:', error);
  }
}
