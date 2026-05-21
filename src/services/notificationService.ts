import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { NavigationService } from './navigationService';

const PERMISSION_STATE_KEY = '@ohh-finance/push-permission-state';

export type PermissionState = 'NOT_REQUESTED' | 'REQUESTING' | 'GRANTED' | 'DENIED';

export interface NotificationServiceInterface {
  requestPermission(): Promise<void>;
  getPermissionState(): Promise<PermissionState>;
  registerPushToken(userId: string, tenantId: string): Promise<void>;
}

// STORY-8.2: Budget alert payload contract
export interface BudgetAlertPayload {
  type: '80_PERCENT_ALERT';
  categoryId: string;
  categoryName: string;
  consumptionPercent: number;
}

class NotificationService implements NotificationServiceInterface {
  private static instance: NotificationService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // STORY-8.2: Initialize notification handlers for foreground alerts and tap responses
  async initialize(): Promise<void> {
    if (this.initialized) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    Notifications.addNotificationReceivedListener(this.handleNotificationReceived);
    Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

    this.initialized = true;
  }

  // STORY-8.2: Handle foreground notification receipt
  private handleNotificationReceived = (notification: Notifications.Notification) => {
    const data = notification.request.content.data as Partial<BudgetAlertPayload>;
    if (data.type === '80_PERCENT_ALERT') {
      console.log('[NotificationService] 80% budget alert received in foreground:', {
        categoryName: data.categoryName,
        consumptionPercent: data.consumptionPercent,
      });
    }
  };

  // STORY-8.3: Handle notification tap — navigate to dashboard with category highlight
  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as Partial<BudgetAlertPayload>;
    if (data.type === '80_PERCENT_ALERT') {
      console.log('[NotificationService] 80% budget alert tapped:', {
        categoryName: data.categoryName,
        categoryId: data.categoryId,
      });
      if (data.categoryId) {
        NavigationService.navigateToDashboard(data.categoryId);
      } else {
        NavigationService.navigateToDashboard();
      }
    }
  };

  async getPermissionState(): Promise<PermissionState> {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_STATE_KEY);
      if (stored === 'GRANTED' || stored === 'DENIED') {
        return stored as PermissionState;
      }
      return 'NOT_REQUESTED';
    } catch (err: unknown) {
      console.error('[NotificationService] Failed to read permission state:', err);
      return 'NOT_REQUESTED';
    }
  }

  private async setPermissionState(state: PermissionState): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSION_STATE_KEY, state);
    } catch (err: unknown) {
      console.error('[NotificationService] Failed to write permission state:', err);
    }
  }

  async requestPermission(): Promise<void> {
    const currentState = await this.getPermissionState();
    if (currentState === 'GRANTED' || currentState === 'DENIED') {
      console.log('[NotificationService] Permission already decided:', currentState);
      return;
    }

    await this.setPermissionState('REQUESTING');

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        await this.setPermissionState('GRANTED');
        console.log('[NotificationService] Push permission granted');
      } else {
        await this.setPermissionState('DENIED');
        console.log('[NotificationService] Push permission denied');
      }
    } catch (err: unknown) {
      console.error('[NotificationService] Permission request failed:', err);
      await this.setPermissionState('DENIED');
    }
  }

  async registerPushToken(userId: string, tenantId: string): Promise<void> {
    const permissionState = await this.getPermissionState();
    if (permissionState !== 'GRANTED') {
      console.log('[NotificationService] Cannot register push token — permission not granted');
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined
      });

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          {
            user_id: userId,
            tenant_id: tenantId,
            expo_push_token: token.data,
            platform,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,platform'
          }
        );

      if (error) {
        console.error('[NotificationService] Failed to upsert device token:', error);
        return;
      }

      console.log('[NotificationService] Push token registered successfully');
    } catch (err: unknown) {
      console.error('[NotificationService] Failed to register push token:', err);
    }
  }
}

export const notificationService = NotificationService.getInstance();