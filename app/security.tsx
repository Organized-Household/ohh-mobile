import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SecurityPage() {
  const router = useRouter();

  const handleOpenSupabase = () => {
    Linking.openURL('https://supabase.com/security');
  };

  const handleOpenVercel = () => {
    Linking.openURL('https://vercel.com/security');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Your Financial Data Security</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Storage</Text>
          <Text style={styles.paragraph}>
            OHh-Finance stores all your financial data securely using Supabase, a trusted open-source database platform built on PostgreSQL. Your household budgets, transactions, accounts, and categories are stored in a private database with strict tenant isolation.
          </Text>
          <Text style={styles.paragraph}>
            Each household (tenant) has its own isolated data space. Multi-tenant data isolation is enforced at both the application and database layers through Row Level Security (RLS) policies, ensuring you can only access your own household's financial information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Encryption & Protection</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Data in Transit:</Text> All communication between the OHh-Finance app and our servers uses industry-standard TLS/SSL encryption (HTTPS), protecting your data as it travels over the internet.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Data at Rest:</Text> Your financial data stored in Supabase is encrypted at rest using AES-256 encryption, the same standard used by banks and financial institutions.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Authentication:</Text> We use Supabase Auth with email/password authentication. Passwords are hashed using bcrypt before storage, and we never store plain-text passwords.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Account Numbers:</Text> If you choose to store account numbers for savings or debt accounts, only the last 4 digits are stored. We never store full account numbers or credentials.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Don't Do</Text>
          <Text style={styles.paragraph}>
            • We do NOT use Plaid, Yodlee, or any third-party financial data aggregation services
          </Text>
          <Text style={styles.paragraph}>
            • We do NOT connect directly to your bank accounts
          </Text>
          <Text style={styles.paragraph}>
            • We do NOT store full bank account numbers or credentials
          </Text>
          <Text style={styles.paragraph}>
            • We do NOT share your financial data with third parties
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CSV Import Security</Text>
          <Text style={styles.paragraph}>
            When you import transactions via CSV, the file is parsed locally on your device or securely on our server, and only the transaction data (date, description, amount) is stored in your household's database. CSV file contents are never logged, and imported transactions are stored with the same encryption and isolation as manually entered data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.paragraph}>
            OHh-Finance relies on the following trusted third-party services:
          </Text>
          <TouchableOpacity onPress={handleOpenSupabase} style={styles.link}>
            <Text style={styles.linkText}>• Supabase (Database & Authentication)</Text>
            <Ionicons name="open-outline" size={16} color="#007AFF" style={styles.linkIcon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenVercel} style={styles.link}>
            <Text style={styles.linkText}>• Vercel (Web Hosting)</Text>
            <Ionicons name="open-outline" size={16} color="#007AFF" style={styles.linkIcon} />
          </TouchableOpacity>
          <Text style={styles.paragraph}>
            Both providers maintain SOC 2 Type II compliance and follow industry-standard security practices.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Responsibilities</Text>
          <Text style={styles.paragraph}>
            • Use a strong, unique password for your OHh-Finance account
          </Text>
          <Text style={styles.paragraph}>
            • Keep your login credentials private
          </Text>
          <Text style={styles.paragraph}>
            • Log out when using shared devices
          </Text>
          <Text style={styles.paragraph}>
            • Contact us immediately if you suspect unauthorized access
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions or Concerns?</Text>
          <Text style={styles.paragraph}>
            If you have questions about our security practices or need to report a security issue, please contact our support team.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: January 2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#000',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#007AFF',
  },
  linkIcon: {
    marginLeft: 6,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
