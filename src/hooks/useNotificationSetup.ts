import { useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';

export function useNotificationSetup() {
  const { user, tenantId } = useAuthStore();
  const { setPermissionState } = useNotificationStore();

  useEffect(() => {
    if (!user || !tenantId) {
      return;
    }

    const initialize = async () => {
      const state = await notificationService.getPermissionState();
      setPermissionState(state);

      if (state === 'NOT_REQUESTED') {
        const newState = await notificationService.requestPermissionIfNeeded();
        setPermissionState(newState);
        if (newState === 'GRANTED') {
          await notificationService.registerDeviceToken(user.id, tenantId);
        }
      } else if (state === 'GRANTED') {
        await notificationService.refreshTokenIfNeeded(user.id, tenantId);
      }
    };

    initialize().catch((err: unknown) => {
      console.error('Failed to initialize notification setup:', err);
    });
  }, [user, tenantId, setPermissionState]);
}
