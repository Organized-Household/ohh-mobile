import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'member';

interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  tenantId: string | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: UserRole | null) => void;
  setTenantId: (tenantId: string | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  tenantId: null,
  isLoading: true,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  setRole: (role) =>
    set({ role }),

  setTenantId: (tenantId) =>
    set({ tenantId }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  clearAuth: () =>
    set({ session: null, user: null, role: null, tenantId: null, isLoading: false }),
}));
