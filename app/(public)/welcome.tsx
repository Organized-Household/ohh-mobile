import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="wallet" size={64} color="#007AFF" />
          <Text style={styles.title}>Welcome to OHh-Finance</Text>
          <Text style={styles.subtitle}>
            Your household budgeting companion
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="calendar" size={28} color="#007AFF" />
            <Text style={styles.featureText}>Monthly budgets & tracking</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="trending-up" size={28} color="#007AFF" />
            <Text style={styles.featureText}>Income & expense management</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="document-text" size={28} color="#007AFF" />
            <Text style={styles.featureText}>CSV import for bank statements</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={28} color="#007AFF" />
            <Text style={styles.featureText}>Secure & private</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(public)/register')}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(public)/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/disclosures')}>
            <Text style={styles.footerLink}>Privacy & Disclosures</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/security')}>
            <Text style={styles.footerLink}>Security Information</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  features: {
    marginTop: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  actions: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerLink: {
    fontSize: 14,
    color: '#007AFF',
  },
});
