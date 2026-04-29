import { Stack } from 'expo-router';

export default function AppLayout() {
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
    </Stack>
  );
}
