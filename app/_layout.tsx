import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { resolveUserRole } from '../src/lib/resolveRole';
import { useAuthStore } from '../src/stores/authStore';

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

  useEffect(() => {
    // Restore existing session on app launch
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        const membership = await resolveUserRole(session.user.id);
        if (!membership) {
          // Member removed or deactivated
          clearAuth();
          router.replace('/account-deactivated');
          return;
        }
        setRole(membership.role);
        setTenantId(membership.tenantId);
        router.replace(membership.role === 'admin' ? '/(app)/admin' : '/(app)/');
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
            router.replace(membership.role === 'admin' ? '/(app)/admin' : '/(app)/');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return <Slot />;
}
