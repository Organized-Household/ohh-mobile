import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

type PermissionState = 'NOT_REQUESTED' | 'REQUESTING' | 'GRANTED' | 'DENIED';

const PERMISSION_STATE_KEY = '@notification_permission_state';

export interface BudgetAlertPayload {
  type: '80_PERCENT_ALERT';
  categoryId: string;
  categoryName: string;
  consumptionPercent: number;
}

class NotificationService {
  private permissionState: PermissionState = 'NOT_REQUESTED';
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    // Configure notification handler for foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Load persisted permission state
    const storedState = await AsyncStorage.getItem(PERMISSION_STATE_KEY);
    if (storedState) {
      this.permissionState = storedState as PermissionState;
    }

    // Register notification received listener for foreground
    Notifications.addNotificationReceivedListener(this.handleNotificationReceived);

    // Register notification response listener for tap actions
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

    this.initialized = true;
  }

  private handleNotificationReceived = (notification: Notifications.Notification) => {
    const data = notification.request.content.data as Partial<BudgetAlertPayload>;
    
    if (data.type === '80_PERCENT_ALERT') {
      // Foreground in-app banner is handled by setNotificationHandler above
      console.log('80% budget alert received in foreground:', {
        categoryName: data.categoryName,
        consumptionPercent: data.consumptionPercent,
      });
    }
  };

  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as Partial<BudgetAlertPayload>;

    if (data.type === '80_PERCENT_ALERT') {
      console.log('80% budget alert tapped:', {
        categoryName: data.categoryName,
        categoryId: data.categoryId,
      });
      
      // Navigation will be handled in STORY-8.3
      // For now, notification tap opens the app to default authenticated screen
    }
  };

  async getPermissionState(): Promise<PermissionState> {
    return this.permissionState;
  }

  async requestPermission(): Promise<PermissionState> {
    if (this.permissionState === 'GRANTED' || this.permissionState === 'DENIED') {
      return this.permissionState;
    }

    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      await this.setPermissionState('DENIED');
      return 'DENIED';
    }

    await this.setPermissionState('REQUESTING');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const newState = finalStatus === 'granted' ? 'GRANTED' : 'DENIED';
    await this.setPermissionState(newState);

    if (newState === 'GRANTED') {
      await this.registerPushToken();
    }

    return newState;
  }

  private async setPermissionState(state: PermissionState) {
    this.permissionState = state;
    await AsyncStorage.setItem(PERMISSION_STATE_KEY, state);
  }

  async registerPushToken() {
    if (this.permissionState !== 'GRANTED') {
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Cannot register push token: no authenticated user');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        console.error('Cannot register push token: no profile found');
        return;
      }

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          {
            user_id: user.id,
            tenant_id: profile.tenant_id,
            expo_push_token: token.data,
            platform,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,platform',
          }
        );

      if (error) {
        console.error('Failed to register push token:', error.message);
      } else {
        console.log('Push token registered successfully');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error registering push token:', err.message);
      } else {
        console.error('Unknown error registering push token');
      }
    }
  }

  async refreshTokenIfNeeded() {
    if (this.permissionState === 'GRANTED') {
      await this.registerPushToken();
    }
  }
}

export const notificationService = new NotificationService();
