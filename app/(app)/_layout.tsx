import { Stack } from 'expo-router';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
export default function AppLayout() {
  usePushNotifications();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin" />
      <Stack.Screen
        name="pending-transactions"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Pending Sync',
        }}
      />
      <Stack.Screen
        name="categories"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="accounts"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="budget-view"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
