import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native/async-storage';
import { supabase } from '../lib/supabase';

const PERMISSION_STATE_KEY = '@ohhfin/push_permission_state';

type PermissionState = 'NOT_REQUESTED' | 'GRANTED' | 'DENIED';

export class NotificationService {
  private static instance: NotificationService | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async getPermissionState(): Promise<PermissionState> {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_STATE_KEY);
      if (stored === 'GRANTED' || stored === 'DENIED') {
        return stored as PermissionState;
      }
      return 'NOT_REQUESTED';
    } catch (err: unknown) {
      console.error('Failed to read permission state from AsyncStorage:', err);
      return 'NOT_REQUESTED';
    }
  }

  private async setPermissionState(state: PermissionState): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSION_STATE_KEY, state);
    } catch (err: unknown) {
      console.error('Failed to write permission state to AsyncStorage:', err);
    }
  }

  async requestPermissionIfNeeded(): Promise<PermissionState> {
    const currentState = await this.getPermissionState();
    if (currentState === 'GRANTED' || currentState === 'DENIED') {
      return currentState;
    }

    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      await this.setPermissionState('DENIED');
      return 'DENIED';
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        await this.setPermissionState('GRANTED');
        return 'GRANTED';
      } else {
        await this.setPermissionState('DENIED');
        return 'DENIED';
      }
    } catch (err: unknown) {
      console.error('Error requesting push notification permissions:', err);
      await this.setPermissionState('DENIED');
      return 'DENIED';
    }
  }

  async registerDeviceToken(userId: string, tenantId: string): Promise<void> {
    const permissionState = await this.getPermissionState();
    if (permissionState !== 'GRANTED') {
      return;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          {
            user_id: userId,
            tenant_id: tenantId,
            expo_push_token: expoPushToken,
            platform: platform,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id,platform'
          }
        );

      if (error) {
        console.error('Failed to upsert device token to Supabase:', error);
      } else {
        console.log('Device token registered successfully');
      }
    } catch (err: unknown) {
      console.error('Failed to register device token:', err);
    }
  }

  async initializeForUser(userId: string, tenantId: string): Promise<void> {
    const permissionState = await this.requestPermissionIfNeeded();
    
    if (permissionState === 'GRANTED') {
      await this.registerDeviceToken(userId, tenantId);
    }
  }

  async refreshTokenIfNeeded(userId: string, tenantId: string): Promise<void> {
    const permissionState = await this.getPermissionState();
    if (permissionState === 'GRANTED') {
      await this.registerDeviceToken(userId, tenantId);
    }
  }
}

export const notificationService = NotificationService.getInstance();
