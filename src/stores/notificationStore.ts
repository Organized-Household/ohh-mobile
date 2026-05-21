import { create } from 'zustand';

type PermissionState = 'NOT_REQUESTED' | 'GRANTED' | 'DENIED';

interface NotificationState {
  permissionState: PermissionState;
  setPermissionState: (state: PermissionState) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  permissionState: 'NOT_REQUESTED',
  setPermissionState: (state: PermissionState) => set({ permissionState: state })
}));
