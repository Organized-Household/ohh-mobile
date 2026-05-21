import { router } from 'expo-router';

/**
 * NavigationService wraps Expo Router imperative API.
 * Provides centralized navigation methods for use outside the component tree,
 * particularly from NotificationService and AuthService.
 */
export class NavigationService {
  /**
   * Navigate to the member's Personal Budget Dashboard.
   * @param categoryId Optional category UUID to highlight or scroll to
   */
  static navigateToDashboard(categoryId?: string): void {
    try {
      if (categoryId) {
        router.push({
          pathname: '/(app)',
          params: { highlightCategoryId: categoryId }
        });
      } else {
        router.push('/(app)');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[NavigationService] navigateToDashboard error:', err.message);
      } else {
        console.error('[NavigationService] navigateToDashboard unknown error:', err);
      }
    }
  }

  /**
   * Navigate to the Account Deactivated screen.
   * Called by AuthService on 401/403 mid-session.
   */
  static navigateToAccountDeactivated(): void {
    try {
      router.replace('/account-deactivated');
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[NavigationService] navigateToAccountDeactivated error:', err.message);
      } else {
        console.error('[NavigationService] navigateToAccountDeactivated unknown error:', err);
      }
    }
  }

  /**
   * Navigate to the pending transactions list.
   * @param filter Optional filter to apply to the transaction list
   */
  static navigateToTransactionList(filter?: string): void {
    try {
      if (filter) {
        router.push({
          pathname: '/(app)/pending-transactions',
          params: { filter }
        });
      } else {
        router.push('/(app)/pending-transactions');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('[NavigationService] navigateToTransactionList error:', err.message);
      } else {
        console.error('[NavigationService] navigateToTransactionList unknown error:', err);
      }
    }
  }
}
