import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useAdminStore } from '../../src/stores/adminStore';
import { useDashboardStore } from '../../src/stores/dashboardStore';
import { useDashboard } from '../../src/hooks/useDashboard';
import { fetchHouseholdMembers } from '../../src/services/memberService';
import { CategoryBudgetRow } from '../../src/components/CategoryBudgetRow';
import { FAB } from '../../src/components/FAB';
import { TransactionEntryModal } from '../../src/components/TransactionEntryModal';
import { SyncStatusIcon } from '../../src/components/SyncStatusIcon';
import {
  formatCurrency,
  getCurrentMonthStart,
} from '../../src/services/dashboardService';

/**
 * Admin Dashboard — STORY-3.1, STORY-3.2
 *
 * AC coverage:
 * - Member selector dropdown listing all active household members ✓
 * - Admin's own name in list, default selection ✓
 * - Selecting a member loads their personal dashboard ✓
 * - Dashboard clearly identifies whose data is being viewed ✓
 * - No aggregated multi-member view ✓
 * - Admin cannot view members outside their household (RLS) ✓
 * - Removed/inactive members excluded (is_active filter) ✓
 */
export default function AdminDashboard() {
  const { user, tenantId } = useAuthStore();
  const { members, selectedMember, setMembers, setSelectedMember } =
    useAdminStore();
  const { data, isLoading } = useDashboardStore();
  const [isMemberPickerVisible, setMemberPickerVisible] = useState(false);
  const [isTransactionModalVisible, setTransactionModalVisible] =
    useState(false);

  // Load members on mount — tenantId comes from authStore (set at login via resolveUserRole)
  useEffect(() => {
    loadAdminData();
  }, [user?.id, tenantId]);

  async function loadAdminData() {
    if (!user?.id || !tenantId) return;

    await supabase.auth.refreshSession();
    const allMembers = await fetchHouseholdMembers(tenantId);
    setMembers(allMembers);

    // Default selection: admin's own record
    const self = allMembers.find((m) => m.userId === user.id);
    if (self && !selectedMember) {
      setSelectedMember(self);
    }
  }

  // Target user for dashboard — selected member or self
  const targetUserId = selectedMember?.userId ?? user?.id ?? '';
  const { refresh } = useDashboard(targetUserId);

  useEffect(() => {
    if (targetUserId) void refresh();
  }, [targetUserId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const monthStart = getCurrentMonthStart();
  const monthLabel = new Date(monthStart).toLocaleDateString('en-CA', {
    month: 'long',
    year: 'numeric',
  });

  const viewingName =
    selectedMember?.userId === user?.id
      ? 'My Budget'
      : `${selectedMember?.displayName ?? 'Member'}'s Budget`;

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.memberSelector}
            onPress={() => setMemberPickerVisible(true)}
          >
            <Text style={styles.memberSelectorLabel}>Viewing:</Text>
            <Text style={styles.memberSelectorName}>
              {selectedMember?.displayName ?? 'Select member'} ▾
            </Text>
          </TouchableOpacity>
          <Text style={styles.month}>{monthLabel}</Text>
        </View>
        <View style={styles.headerRight}>
          <SyncStatusIcon />
          <TouchableOpacity onPress={() => void handleLogout()}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Viewing banner */}
      {selectedMember && selectedMember.userId !== user?.id && (
        <View style={styles.viewingBanner}>
          <Text style={styles.viewingBannerText}>
            👁 Viewing {selectedMember.displayName}&apos;s dashboard
          </Text>
        </View>
      )}

      {/* Summary totals */}
      {data && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Budgeted</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(data.totalBudgeted)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Spent</Text>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
              {formatCurrency(data.totalActual)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
              {formatCurrency(
                Math.max(0, data.totalBudgeted - data.totalActual)
              )}
            </Text>
          </View>
        </View>
      )}

      {/* Category list */}
      {!data || data.lines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No budget set</Text>
          <Text style={styles.emptySubtitle}>
            {selectedMember?.userId === user?.id
              ? `Set up your budget for ${monthLabel} on the web app.`
              : `${selectedMember?.displayName ?? 'This member'} has no budget for ${monthLabel}.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data.lines}
          keyExtractor={(item) => item.categoryId}
          renderItem={({ item }) => <CategoryBudgetRow line={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Member Picker Modal — STORY-3.1 */}
      <Modal
        visible={isMemberPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMemberPickerVisible(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Select Member</Text>
          {members.map((member) => (
            <TouchableOpacity
              key={member.userId}
              style={[
                styles.memberRow,
                selectedMember?.userId === member.userId &&
                  styles.memberRowSelected,
              ]}
              onPress={() => {
                setSelectedMember(member);
                setMemberPickerVisible(false);
              }}
            >
              <Text style={styles.memberRowName}>{member.displayName}</Text>
              <Text style={styles.memberRowRole}>
                {member.role === 'admin' ? '(Admin)' : '(Member)'}
                {member.userId === user?.id ? ' — You' : ''}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.pickerCancel}
            onPress={() => setMemberPickerVisible(false)}
          >
            <Text style={styles.pickerCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Persistent FAB */}
      <FAB onPress={() => setTransactionModalVisible(true)} />

      {/* Transaction modal — admin on-behalf-of (STORY-4.3) */}
      <TransactionEntryModal
        visible={isTransactionModalVisible}
        onClose={() => setTransactionModalVisible(false)}
        onSuccess={refresh}
        adminTargetUserId={
          selectedMember?.userId !== user?.id
            ? selectedMember?.userId
            : undefined
        }
        adminMembers={members}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: 20,
    paddingTop: 60, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberSelector: { marginBottom: 4 },
  memberSelectorLabel: { fontSize: 12, color: '#888' },
  memberSelectorName: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  month: { fontSize: 13, color: '#888' },
  signOut: { fontSize: 14, color: '#2563eb' },
  viewingBanner: {
    backgroundColor: '#eff6ff', paddingVertical: 8, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#bfdbfe',
  },
  viewingBannerText: { fontSize: 13, color: '#1d4ed8', fontWeight: '500' },
  summaryRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 16, gap: 8,
  },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 4, elevation: 2,
  },
  summaryLabel: { fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  pickerContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 16 },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd',
    alignSelf: 'center', marginBottom: 24,
  },
  pickerTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 20, marginBottom: 16 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  memberRowSelected: { backgroundColor: '#eff6ff' },
  memberRowName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  memberRowRole: { fontSize: 13, color: '#888' },
  pickerCancel: { margin: 20, padding: 16, backgroundColor: '#f0f0f0', borderRadius: 12, alignItems: 'center' },
  pickerCancelText: { fontSize: 16, fontWeight: '600', color: '#333' },
});
