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
 *
 * Chunking: SecureStore has a 2048-byte limit per key. Supabase sessions
 * (access JWT + refresh token + metadata) routinely exceed this. We split
 * large values into 1800-byte chunks stored at `${key}_chunk_N` and
 * track the count at `${key}_chunksCount`. Reads reassemble transparently.
 */
const CHUNK_SIZE = 1800;

async function secureStoreGet(key: string): Promise<string | null> {
  const chunksCount = await SecureStore.getItemAsync(`${key}_chunksCount`);
  if (chunksCount !== null) {
    const count = parseInt(chunksCount, 10);
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}_chunk_${i}`)
      )
    );
    if (chunks.some((c) => c === null)) return null;
    return (chunks as string[]).join('');
  }
  return SecureStore.getItemAsync(key);
}

async function secureStoreSet(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK_SIZE) {
    // Remove any stale chunks from a previous larger value
    await secureStoreRemoveChunks(key);
    await SecureStore.setItemAsync(key, value);
    return;
  }
  // Remove any direct key from a previous smaller value
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(`${key}_chunksCount`, String(chunks.length));
  await Promise.all(
    chunks.map((chunk, i) =>
      SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk)
    )
  );
}

async function secureStoreRemove(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
  await secureStoreRemoveChunks(key);
}

async function secureStoreRemoveChunks(key: string): Promise<void> {
  const chunksCount = await SecureStore.getItemAsync(`${key}_chunksCount`);
  if (chunksCount === null) return;
  const count = parseInt(chunksCount, 10);
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}_chunksCount`),
    ...Array.from({ length: count }, (_, i) =>
      SecureStore.deleteItemAsync(`${key}_chunk_${i}`)
    ),
  ]);
}

const SecureStoreAdapter = {
  getItem: secureStoreGet,
  setItem: secureStoreSet,
  removeItem: secureStoreRemove,
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
