import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { fetchCategories } from '../../src/services/categoryService';
import { UNKNOWN_CATEGORY_NAME } from '../../src/constants/categoryConstants';
import type { Category } from '../../src/services/categoryService';

/**
 * Category Management Screen — STORY-6.1
 *
 * Edit-only on mobile v1. Category creation is web-only.
 * Unknown category excluded from editable list.
 * Changes shared across all household members immediately.
 *
 * AC coverage:
 * - Member can rename any active category ✓
 * - Unknown category excluded from list ✓
 * - Rename submitted directly to Supabase ✓
 * - Changes reflected across household immediately ✓
 * - Duplicate names surface clear error ✓
 * - Empty name validation ✓
 */
export default function CategoriesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    if (!user?.id) return;
    setIsLoading(true);

    const { data: tm } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!tm?.tenant_id) { setIsLoading(false); return; }
    setTenantId(tm.tenant_id);

    const cats = await fetchCategories(tm.tenant_id);

    // Exclude Unknown category from editable list — application layer guard
    const editable = cats.filter(
      (c) => c.name !== UNKNOWN_CATEGORY_NAME
    );
    setCategories(editable);
    setIsLoading(false);
  }

  async function handleSaveRename(categoryId: string) {
    const trimmed = editingName.trim();

    if (!trimmed) {
      Alert.alert('Validation Error', 'Category name cannot be empty.');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const isDuplicate = categories.some(
      (c) =>
        c.id !== categoryId &&
        c.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert(
        'Duplicate Name',
        `A category named "${trimmed}" already exists.`
      );
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('categories')
      .update({ name: trimmed })
      .eq('id', categoryId)
      .eq('tenant_id', tenantId);

    setIsSaving(false);

    if (error) {
      Alert.alert('Error', 'Could not rename category. Please try again.');
      return;
    }

    // Invalidate local cache — update in-memory list
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, name: trimmed } : c))
    );
    setEditingId(null);
    setEditingName('');
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
        <Text style={styles.title}>Categories</Text>
      </View>

      <Text style={styles.subtitle}>
        Categories are shared across your household.
        Tap a category to rename it.
      </Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.categoryRow}>
            {editingId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.editInput}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => handleSaveRename(item.id)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setEditingId(null); setEditingName(''); }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.categoryItem}
                onPress={() => {
                  setEditingId(item.id);
                  setEditingName(item.name);
                }}
              >
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.categoryTag}>{item.tag}</Text>
                <Text style={styles.editHint}>Tap to rename ›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
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
  subtitle: {
    fontSize: 13, color: '#666', paddingHorizontal: 20,
    paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  list: { padding: 16, paddingBottom: 40 },
  categoryRow: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 10,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 8,
  },
  categoryName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  categoryTag: {
    fontSize: 12, color: '#888', backgroundColor: '#f0f0f0',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  editHint: { fontSize: 12, color: '#2563eb' },
  editRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  editInput: {
    flex: 1, borderWidth: 1, borderColor: '#2563eb',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 16, backgroundColor: '#fafafa',
  },
  saveButton: {
    backgroundColor: '#2563eb', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelButton: {
    backgroundColor: '#f0f0f0', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  cancelButtonText: { color: '#333', fontSize: 14, fontWeight: '600' },
});
