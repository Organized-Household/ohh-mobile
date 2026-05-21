import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../../src/stores/authStore';
import { FAB } from '../../src/components/FAB';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';

export default function AppLayout() {
  const { user } = useAuthStore();

  usePushNotifications();

  useEffect(() => {
    if (!user) {
      // Route to login handled by root layout
    }
  }, [user]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Back'
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Budget Dashboard' }}
        />
        <Stack.Screen
          name="admin"
          options={{ title: 'Admin Dashboard' }}
        />
        <Stack.Screen
          name="accounts"
          options={{ title: 'Accounts' }}
        />
        <Stack.Screen
          name="budget-view"
          options={{ title: 'Budget' }}
        />
        <Stack.Screen
          name="categories"
          options={{ title: 'Categories' }}
        />
        <Stack.Screen
          name="pending-transactions"
          options={{ title: 'Pending Sync' }}
        />
      </Stack>
      <FAB />
    </>
  );
}
