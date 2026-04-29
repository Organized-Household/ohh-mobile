import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

/**
 * Supabase client for OHh Finance Mobile.
 * Uses Expo SecureStore for session persistence — never AsyncStorage.
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are injected via EAS Build
 * environment secrets. For local dev, use app.config.ts extra field
 * or a .env file with expo-constants.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
    'in your .env.local file.'
  );
}

/**
 * SecureStore adapter for Supabase Auth session persistence.
 * Stores JWT access + refresh tokens in iOS Keychain / Android Keystore.
 * Never stores tokens in plain AsyncStorage.
 */
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
