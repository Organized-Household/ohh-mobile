import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { applySignConvention } from '../lib/signConvention';
import { generateUUID } from '../lib/uuid';
import { addPendingTransaction, getSyncQueueCounts } from '../stores/offlineStore';
import { useSyncStatusStore } from '../stores/syncStatusStore';
import { fetchCategories } from '../services/categoryService';
import { fetchAccountsForMember } from '../services/accountService';
import type { Category } from '../services/categoryService';
import type { Account } from '../services/accountService';
import type { OfflinePendingTransaction } from '../types/offline';
import type { HouseholdMember } from '../services/memberService';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void; // Called after successful online submission — triggers dashboard refresh
  adminTargetUserId?: string; // STORY-4.3 — if set, admin is entering on behalf of this member
  adminMembers?: HouseholdMember[]; // STORY-4.3 — list of members for on-behalf-of display
}

/**
 * Transaction Entry Modal — STORY-4.2
 *
 * Captures: amount, transaction_type, category, date (default today),
 * account (optional), description (optional).
 *
 * Online: writes directly to Supabase transactions table.
 * Offline: queued via OfflineStore (expo-file-system).
 *
 * AC coverage:
 * - amount, transaction_type, category, date, account, description ✓
 * - applySignConvention on write ✓
 * - Online: direct Supabase INSERT ✓
 * - Offline: queued to OfflineStore ✓
 * - Dashboard refresh after successful online submission ✓
 * - Form validation errors shown inline ✓
 * - Form dismissed on successful submission ✓
 * - amount <> 0 enforced at form layer ✓
 *
 * Schema: transaction_date, created_by_user_id, NO source/status columns.
 */
export function TransactionEntryModal({ visible, onClose, onSuccess, adminTargetUserId, adminMembers }: Props) {
  const { user, tenantId } = useAuthStore();
  const { setCounts } = useSyncStatusStore();

  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(getTodayISO());
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible || !user?.id || !tenantId) return;
    void loadFormData();
  }, [visible, user?.id, tenantId]);

  async function loadFormData() {
    if (!user?.id || !tenantId) return;

    const [cats, accts] = await Promise.all([
      fetchCategories(tenantId),
      fetchAccountsForMember(user.id, tenantId),
    ]);

    setCategories(cats);
    setAccounts(accts);

    // Default to first expense category
    const expenseCats = cats.filter((c) => c.category_type === 'expense');
    if (expenseCats.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(expenseCats[0].id);
    }
  }

  function getTodayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than zero.';
    }
    if (!selectedCategoryId) {
      newErrors.category = 'Please select a category.';
    }
    if (!transactionDate) {
      newErrors.date = 'Please select a date.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (!user?.id || !tenantId) return;

    setIsSubmitting(true);

    const parsedAmount = parseFloat(amount);
    const signedAmount = applySignConvention(parsedAmount, transactionType);
    const localUUID = generateUUID();

    const payload = {
      id: localUUID,
      tenant_id: tenantId,
      created_by_user_id: adminTargetUserId ?? user.id,
      category_id: selectedCategoryId,
      description: description.trim() || '',
      amount: signedAmount,
      transaction_date: transactionDate,
      transaction_type: transactionType,
      linked_account_id: selectedAccountId,
      payment_source_account_id: null,
      // NO source column — does not exist (schema-map FINDING-3)
      // NO status column — does not exist (schema-map FINDING-3)
    };

    // Check connectivity
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (isOnline) {
      // Online path — write directly to Supabase
      const { error } = await supabase.from('transactions').insert(payload);

      setIsSubmitting(false);

      if (error) {
        Alert.alert(
          'Submission Failed',
          'Could not save your transaction. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      resetForm();
      onSuccess(); // Triggers dashboard refresh (online only)
      onClose();
    } else {
      // Offline path — queue in OfflineStore
      const offlineTx: OfflinePendingTransaction = {
        localUUID,
        syncStatus: 'PENDING_SYNC',
        retryCount: 0,
        createdAt: new Date().toISOString(),
        ...payload,
      };

      await addPendingTransaction(offlineTx);

      // Update sync status badge counts
      const counts = await getSyncQueueCounts();
      setCounts(counts.pendingCount, counts.failedCount);

      setIsSubmitting(false);
      resetForm();
      onClose();
      // Note: onSuccess NOT called for offline — dashboard shows cached data
    }
  }, [
    amount, transactionType, selectedCategoryId, selectedAccountId,
    description, transactionDate, user?.id, tenantId, onClose, onSuccess, setCounts,
  ]);

  function resetForm() {
    setAmount('');
    setTransactionType('expense');
    setDescription('');
    setTransactionDate(getTodayISO());
    setErrors({});
    setSelectedAccountId(null);
    setSelectedCategoryId('');
  }

  const filteredCategories = categories.filter(
    (c) => c.category_type === transactionType
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Handle bar */}
        <View style={styles.handle} />

        <Text style={styles.title}>Add Transaction</Text>

        {/* On-behalf-of banner — STORY-4.3 */}
        {adminTargetUserId && adminMembers && (
          <View style={styles.onBehalfBanner}>
            <Text style={styles.onBehalfText}>
              📋 On behalf of:{' '}
              {adminMembers.find((m) => m.userId === adminTargetUserId)?.displayName ?? 'Member'}
            </Text>
          </View>
        )}

        {/* Transaction type toggle */}
        <View style={styles.typeRow}>
          {(['expense', 'income'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                transactionType === type && styles.typeButtonActive,
              ]}
              onPress={() => {
                setTransactionType(type);
                setSelectedCategoryId('');
              }}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  transactionType === type && styles.typeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={[styles.input, errors.amount ? styles.inputError : undefined]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {filteredCategories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                selectedCategoryId === cat.id && styles.chipActive,
              ]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategoryId === cat.id && styles.chipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {errors.category ? (
          <Text style={styles.errorText}>{errors.category}</Text>
        ) : null}

        {/* Date */}
        <Text style={styles.label}>Date *</Text>
        <TextInput
          style={[styles.input, errors.date ? styles.inputError : undefined]}
          value={transactionDate}
          onChangeText={setTransactionDate}
          placeholder="YYYY-MM-DD"
          maxLength={10}
        />
        {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}

        {/* Account (optional) */}
        {accounts.length > 0 && (
          <>
            <Text style={styles.label}>Account (optional)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              <TouchableOpacity
                style={[styles.chip, selectedAccountId === null && styles.chipActive]}
                onPress={() => setSelectedAccountId(null)}
              >
                <Text style={[styles.chipText, selectedAccountId === null && styles.chipTextActive]}>
                  None
                </Text>
              </TouchableOpacity>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.chip, selectedAccountId === acc.id && styles.chipActive]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Text style={[styles.chipText, selectedAccountId === acc.id && styles.chipTextActive]}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Description */}
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="What was this for?"
          multiline
          numberOfLines={2}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Save Transaction</Text>
          )}
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ddd', alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  title: {
    fontSize: 24, fontWeight: '700', color: '#1a1a1a',
    paddingHorizontal: 20, marginBottom: 20,
  },
  typeRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: '#f0f0f0', borderRadius: 10, padding: 4,
  },
  typeButton: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  typeButtonActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  typeButtonText: { fontSize: 15, fontWeight: '500', color: '#888' },
  typeButtonTextActive: { color: '#1a1a1a', fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginHorizontal: 20, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
    marginHorizontal: 20, marginBottom: 16, backgroundColor: '#fafafa',
  },
  inputError: { borderColor: '#ef4444' },
  inputMultiline: { height: 72, textAlignVertical: 'top' },
  errorText: { color: '#ef4444', fontSize: 13, marginHorizontal: 20, marginTop: -12, marginBottom: 12 },
  chipScroll: { paddingHorizontal: 16, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f0f0f0', marginRight: 8,
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontSize: 14, color: '#555', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  submitButton: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16,
    marginHorizontal: 20, alignItems: 'center', marginBottom: 12,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { alignItems: 'center', paddingVertical: 12, marginHorizontal: 20 },
  cancelText: { fontSize: 16, color: '#888' },
  bottomPad: { height: 40 },
  onBehalfBanner: {
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  onBehalfText: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: '500',
  },
});
