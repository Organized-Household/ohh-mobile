import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { resolveUserRole } from '../src/lib/resolveRole';
import { useAuthStore } from '../src/stores/authStore';
import { initSyncEngine } from '../src/services/syncEngine';

/**
 * Root layout — handles auth state listening and routing.
 *
 * On mount: attempts to restore existing session from SecureStore.
 * On auth state change: routes to correct screen based on role.
 *
 * STORY-1.2: Session restoration from SecureStore (autoRefreshToken handles refresh)
 * STORY-1.3: Role-based routing post-login
 */
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setSession, setRole, setTenantId, setLoading, clearAuth } = useAuthStore();
  const [debugMsg, setDebugMsg] = useState('init');

  useEffect(() => {
    // Restore existing session on app launch
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setDebugMsg(`session:${session ? session.user.id.slice(0, 8) : 'null'}`);
      if (session) {
        setSession(session);
        const membership = await resolveUserRole(session.user.id);
        setDebugMsg(`role:${membership?.role ?? 'null'} tenant:${membership?.tenantId?.slice(0, 8) ?? 'null'}`);
        if (!membership) {
          // Member removed or deactivated
          clearAuth();
          router.replace('/account-deactivated');
          return;
        }
        setRole(membership.role);
        setTenantId(membership.tenantId);
        router.replace(membership.role === 'admin' ? '/(app)/admin' : '/(app)');
      } else {
        setLoading(false);
        router.replace('/(auth)/login');
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          clearAuth();
          router.replace('/(auth)/login');
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          const membership = await resolveUserRole(session.user.id);
          setDebugMsg(`event:${event} role:${membership?.role ?? 'null'}`);
          if (!membership) {
            clearAuth();
            router.replace('/account-deactivated');
            return;
          }
          setRole(membership.role);
          setTenantId(membership.tenantId);
          setLoading(false);

          // Only route on SIGNED_IN — not on every TOKEN_REFRESHED
          if (event === 'SIGNED_IN') {
            router.replace(membership.role === 'admin' ? '/(app)/admin' : '/(app)');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Initialize SyncEngine singleton — runs for the lifetime of the app
    // Listens for NetInfo connectivity restore and AppState foreground events
    // STORY-5.2
    const cleanup = initSyncEngine();
    return cleanup;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{
        backgroundColor: 'red',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
        zIndex: 999,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
      }}>
        <Text style={{
          color: 'white',
          fontSize: 16,
          fontWeight: 'bold',
          flexWrap: 'wrap',
        }}>{debugMsg}</Text>
      </View>
      <Slot />
    </View>
  );
}
