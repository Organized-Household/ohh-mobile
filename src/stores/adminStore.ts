import { create } from 'zustand';
import type { HouseholdMember } from '../services/memberService';

/**
 * Admin store — tracks selected member for dashboard viewing.
 * Default: null (admin sees their own dashboard).
 * When a member is selected, dashboard loads that member's data.
 */

interface AdminState {
  members: HouseholdMember[];
  selectedMember: HouseholdMember | null;
  setMembers: (members: HouseholdMember[]) => void;
  setSelectedMember: (member: HouseholdMember | null) => void;
  clearAdmin: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  members: [],
  selectedMember: null,
  setMembers: (members) => set({ members }),
  setSelectedMember: (selectedMember) => set({ selectedMember }),
  clearAdmin: () => set({ members: [], selectedMember: null }),
}));
