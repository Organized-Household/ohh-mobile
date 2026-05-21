import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { fetchAccountsForMember } from '../../src/services/accountService';
import { formatCurrency } from '../../src/services/dashboardService';
import { supabase } from '../../src/lib/supabase';
import type { Account } from '../../src/services/accountService';

/**
 * Read-Only Account Balance View — STORY-7.1
 *
 * AC coverage:
 * - Shows savings, investment, and debt accounts ✓
 * - Grouped by account_kind ✓
 * - Read-only — no create/edit/delete ✓
 * - Only authenticated member's own accounts ✓
 * - opening_balance shown as balance figure ✓
 */
export default function AccountsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [sections, setSections] = useState<
    { title: string; data: Account[] }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    if (!user?.id) return;
    setIsLoading(true);

    const { data: tm } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!tm?.tenant_id) { setIsLoading(false); return; }

    const accounts = await fetchAccountsForMember(user.id, tm.tenant_id);

    // Group by account_kind
    const savings = accounts.filter((a) => a.account_kind === 'savings');
    const investments = accounts.filter((a) => a.account_kind === 'investment');
    const debts = accounts.filter((a) => a.account_kind === 'debt');

    const built = [];
    if (savings.length > 0) built.push({ title: 'Savings', data: savings });
    if (investments.length > 0) built.push({ title: 'Investments', data: investments });
    if (debts.length > 0) built.push({ title: 'Debt', data: debts });

    setSections(built);
    setIsLoading(false);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Accounts</Text>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No accounts found</Text>
          <Text style={styles.emptySubtitle}>
            Add accounts on the web app to see them here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.accountRow}>
              <Text style={styles.accountName}>{item.name}</Text>
              <Text style={styles.accountBalance}>
                {formatCurrency(item.opening_balance ?? 0)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  back: { fontSize: 24, color: '#2563eb' },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  list: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 13, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 8,
  },
  accountRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 8, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  accountName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  accountBalance: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
});
