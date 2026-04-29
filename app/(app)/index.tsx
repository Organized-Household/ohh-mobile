import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';

/**
 * Member Personal Dashboard — placeholder for WP-2 (STORY-2.1)
 * Full implementation in ForgePacket v3.
 */
export default function MemberDashboard() {
  const { user } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personal Dashboard</Text>
      <Text style={styles.subtitle}>WP-2 implementation coming in Sprint 1</Text>
      <Text style={styles.user}>{user?.email}</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' },
  user: { fontSize: 14, color: '#999', marginBottom: 32 },
  button: { backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
