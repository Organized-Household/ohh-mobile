/**
 * Generates a UUIDv4 for offline transaction local IDs.
 *
 * Uses crypto.randomUUID() which is available in React Native's
 * Hermes engine (Expo SDK 49+). Falls back to a manual implementation
 * if not available.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUIDv4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
