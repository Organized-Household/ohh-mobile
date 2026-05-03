import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import {
  formatCurrency,
  getCurrentMonthStart,
} from '../../src/services/dashboardService';

/**
 * Read-Only Budget Allocation View — STORY-7.2
 *
 * AC coverage:
 * - Shows current month budget lines by category ✓
 * - Read-only — no create/edit ✓
 * - Only authenticated member's own budget ✓
 * - Empty state if no budget for current month ✓
 */

interface BudgetLine {
  id: string;
  categoryName: string;
  amount: number;
}

export default function BudgetViewScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const monthStart = getCurrentMonthStart();

  useEffect(() => {
    loadBudget();
  }, []);

  async function loadBudget() {
    if (!user?.id) return;
    setIsLoading(true);

    const { data: tm } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!tm?.tenant_id) { setIsLoading(false); return; }

    // Get budget for current month
    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('tenant_id', tm.tenant_id)
      .eq('user_id', user.id)
      .eq('month_start', monthStart)
      .single();

    if (!budget?.id) { setIsLoading(false); return; }

    // Get budget lines with category names
    const { data: budgetLines } = await supabase
      .from('budget_lines')
      .select(`amount, categories ( name )`)
      .eq('budget_id', budget.id)
      .gt('amount', 0)
      .order('amount', { ascending: false });

    if (budgetLines) {
      setLines(
        budgetLines.map((bl, i) => {
          const cat = Array.isArray(bl.categories)
            ? bl.categories[0]
            : bl.categories;
          return {
            id: `${i}`,
            categoryName: cat?.name ?? 'Unknown',
            amount: Number(bl.amount),
          };
        })
      );
    }

    setIsLoading(false);
  }

  const monthLabel = new Date(monthStart).toLocaleDateString('en-CA', {
    month: 'long', year: 'numeric',
  });

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
        <View>
          <Text style={styles.title}>My Budget</Text>
          <Text style={styles.month}>{monthLabel}</Text>
        </View>
      </View>

      {lines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No budget set</Text>
          <Text style={styles.emptySubtitle}>
            Set up your {monthLabel} budget on the web app.
          </Text>
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.budgetRow}>
              <Text style={styles.categoryName}>{item.categoryName}</Text>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
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
  month: { fontSize: 13, color: '#888' },
  list: { padding: 16, paddingBottom: 40 },
  budgetRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 8, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  amount: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
});
