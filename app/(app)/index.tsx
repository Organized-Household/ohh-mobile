import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDashboard } from '../../src/hooks/useDashboard';
import { CategoryBudgetRow } from '../../src/components/CategoryBudgetRow';

/**
 * Personal Budget Dashboard (Member Home Screen)
 * - Displays current month budget vs. actual by category
 * - Data-isolated per member via RLS
 * - Updates immediately after transaction submission
 * - Offline shows last-known cached state with offline banner
 * - Supports deep-link highlighting via highlightCategoryId param
 */
export default function DashboardScreen() {
  const params = useLocalSearchParams<{ highlightCategoryId?: string }>();
  const { data, isLoading, isOffline, refresh } = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<Map<string, View>>(new Map());

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  useEffect(() => {
    if (params.highlightCategoryId && data?.categories && scrollViewRef.current) {
      const categoryIndex = data.categories.findIndex(
        (cat) => cat.categoryId === params.highlightCategoryId
      );
      
      if (categoryIndex !== -1) {
        const targetRef = categoryRefs.current.get(params.highlightCategoryId);
        if (targetRef) {
          targetRef.measureLayout(
            scrollViewRef.current.getInnerViewNode(),
            (_x, y) => {
              scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
            },
            () => {
              console.log('[DashboardScreen] measureLayout failed for category highlight');
            }
          );
        }
      }
    }
  }, [params.highlightCategoryId, data?.categories]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your budget...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unable to load dashboard</Text>
        <Text style={styles.errorSubtext}>
          {isOffline ? 'You are offline' : 'Please try again'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Offline - Showing cached data</Text>
        </View>
      )}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Budget</Text>
          <Text style={styles.subtitle}>{data.month}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryValue}>${data.totalBudget.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryValue}>${data.totalActual.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text
              style={[
                styles.summaryValue,
                data.totalRemaining < 0 && styles.negativeValue,
              ]}
            >
              ${data.totalRemaining.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {data.categories.map((category) => {
            const isHighlighted = params.highlightCategoryId === category.categoryId;
            return (
              <View
                key={category.categoryId}
                ref={(ref) => {
                  if (ref) {
                    categoryRefs.current.set(category.categoryId, ref);
                  }
                }}
                style={[
                  styles.categoryRowWrapper,
                  isHighlighted && styles.highlightedCategory,
                ]}
              >
                <CategoryBudgetRow category={category} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
  },
  offlineBanner: {
    backgroundColor: '#FFA500',
    padding: 12,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  negativeValue: {
    color: '#DC3545',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  categoryRowWrapper: {
    marginBottom: 12,
  },
  highlightedCategory: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFC107',
    padding: 8,
    marginHorizontal: -8,
  },
});
