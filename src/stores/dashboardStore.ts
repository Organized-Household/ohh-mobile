import { create } from 'zustand';
import type { DashboardData } from '../services/dashboardService';

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  setData: (data: DashboardData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  setData: (data) =>
    set({ data, error: null, lastFetchedAt: Date.now() }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error, isLoading: false }),

  clearDashboard: () =>
    set({ data: null, isLoading: false, error: null, lastFetchedAt: null }),
}));
