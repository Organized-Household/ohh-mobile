import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../src/lib/supabase';

/**
 * Account Deactivated screen — STORY-1.3
 *
 * Shown when a 401/403 or null role is returned mid-session.
 * Indicates the user has been removed from their household.
 * Non-recoverable in-session — user must contact their admin.
 */
export default function AccountDeactivatedScreen() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Deactivated</Text>
      <Text style={styles.message}>
        Your access to this household has been removed.
        Please contact your household administrator.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Return to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1a1a1a' },
  message: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
