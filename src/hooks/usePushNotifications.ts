import { useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../stores/authStore';

export function usePushNotifications() {
  const { user, tenantId } = useAuthStore();

  useEffect(() => {
    if (!user || !tenantId) {
      return;
    }

    const requestAndRegister = async () => {
      const currentState = await notificationService.getPermissionState();

      if (currentState === 'NOT_REQUESTED') {
        await notificationService.requestPermission();
      }

      const finalState = await notificationService.getPermissionState();
      if (finalState === 'GRANTED') {
        await notificationService.registerPushToken(user.id, tenantId);
      }
    };

    requestAndRegister();
  }, [user, tenantId]);
}
