import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { NavigationService } from './navigationService';

type PermissionState = 'NOT_REQUESTED' | 'REQUESTING' | 'GRANTED' | 'DENIED';

const PERMISSION_KEY = '@ohh_finance:push_permission_state';

export interface BudgetAlertPayload {
  type: '80_PERCENT_ALERT';
  categoryId: string;
  categoryName: string;
  consumptionPercent: number;
}

/**
 * NotificationService manages push notification lifecycle:
 * - Permission request and state persistence
 * - Expo push token registration to device_tokens table
 * - Foreground notification handler (in-app banner)
 * - Background/tap notification handler (deep-link navigation)
 */
export class NotificationService {
  private static instance: NotificationService | null = null;
  private permissionState: PermissionState = 'NOT_REQUESTED';
  private isInitialized = false;
  private foregroundSubscription: Notifications.Subscription | null = null;
  private responseSubscription: Notifications.Subscription | null = null;

  private constructor() {
    this.configureForegroundBehavior();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Configure how notifications are presented when app is in foreground.
   */
  private configureForegroundBehavior(): void {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }

  /**
   * Initialize notification service:
   * - Load permission state from AsyncStorage
   * - Request permission if NOT_REQUESTED and authenticated
   * - Register Expo push token if permission GRANTED
   * - Set up notification listeners
   */
  async initialize(userId: string | null): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.loadPermissionState();

    if (userId) {
      if (this.permissionState === 'NOT_REQUESTED') {
        await this.requestPermission();
      }

      if (this.permissionState === 'GRANTED') {
        await this.registerPushToken(userId);
      }
    }

    this.setupNotificationListeners();
    this.isInitialized = true;
  }

  /**
   * Set up notification listeners:
   * - Foreground: display in-app banner
   * - Background/tap: navigate to dashboard with category highlight
   */
  private setupNotificationListeners(): void {
    this.foregroundSubscription = Notifications.addNotificationReceivedListener(
      this.handleForegroundNotification.bind(this)
    );

    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );
  }

  /**
   * Handle notification received while app is in foreground.
   * Display in-app banner (configured via setNotificationHandler).
   */
  private handleForegroundNotification(
    notification: Notifications.Notification
  ): void {
    const data = notification.request.content.data as Partial<BudgetAlertPayload>;
    console.log('[NotificationService] Foreground notification received:', {
      type: data.type,
      categoryName: data.categoryName,
      consumptionPercent: data.consumptionPercent,
    });
  }

  /**
   * Handle notification tap (user interaction).
   * Navigate to dashboard with category highlight.
   * Handles both backgrounded and closed app states.
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as Partial<BudgetAlertPayload>;
    
    console.log('[NotificationService] Notification tap received:', {
      type: data.type,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
    });

    if (data.type === '80_PERCENT_ALERT' && data.categoryId) {
      NavigationService.navigateToDashboard(data.categoryId);
    } else {
      NavigationService.navigateToDashboard();
    }
  }

  /**
   * Load permission state from AsyncStorage.
   */
  private async loadPermissionState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_KEY);
      if (stored) {
        this.permissionState = stored as PermissionState;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[NotificationService] loadPermissionState error:', err.message);
      }
    }
  }

  /**
   * Save permission state to AsyncStorage.
   */
  private async savePermissionState(state: PermissionState): Promise<void> {
    this.permissionState = state;
    try {
      await AsyncStorage.setItem(PERMISSION_KEY, state);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[NotificationService] savePermissionState error:', err.message);
      }
    }
  }

  /**
   * Request push notification permission.
   * Called once on first authenticated launch if NOT_REQUESTED.
   */
  async requestPermission(): Promise<void> {
    if (this.permissionState !== 'NOT_REQUESTED') {
      return;
    }

    await this.savePermissionState('REQUESTING');

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await this.savePermissionState('GRANTED');
      } else {
        await this.savePermissionState('DENIED');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[NotificationService] requestPermission error:', err.message);
      }
      await this.savePermissionState('DENIED');
    }
  }

  /**
   * Register Expo push token to device_tokens table.
   * Called on every authenticated launch if permission is GRANTED.
   * Handles token rotation automatically.
   */
  async registerPushToken(userId: string): Promise<void> {
    if (this.permissionState !== 'GRANTED') {
      return;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync();
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      const { error } = await supabase.from('device_tokens').upsert(
        {
          user_id: userId,
          expo_push_token: token.data,
          platform,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      );

      if (error) {
        console.error('[NotificationService] registerPushToken error:', error.message);
      } else {
        console.log('[NotificationService] Push token registered:', {
          platform,
          token: token.data,
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[NotificationService] registerPushToken error:', err.message);
      }
    }
  }

  /**
   * Get current permission state.
   */
  getPermissionState(): PermissionState {
    return this.permissionState;
  }

  /**
   * Clean up notification listeners.
   */
  dispose(): void {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
    this.isInitialized = false;
  }
}
