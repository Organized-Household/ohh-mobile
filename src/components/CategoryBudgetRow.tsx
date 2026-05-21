import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CategoryBudgetAlertIndicator } from './CategoryBudgetAlertIndicator';

interface CategoryBudgetRowProps {
  categoryName: string;
  budgeted: number;
  actual: number;
}

export function CategoryBudgetRow({
  categoryName,
  budgeted,
  actual,
}: CategoryBudgetRowProps) {
  const remaining = budgeted - actual;
  const consumptionPercent = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  const isOverBudget = remaining < 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.categoryName}>{categoryName}</Text>
        <View style={styles.amounts}>
          <Text style={styles.actual}>${actual.toFixed(2)}</Text>
          <Text style={styles.budgeted}>/ ${budgeted.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(consumptionPercent, 100)}%`,
                backgroundColor: isOverBudget ? '#DC3545' : consumptionPercent >= 80 ? '#FFA500' : '#28A745',
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.remaining,
            isOverBudget && styles.overBudget,
          ]}
        >
          {isOverBudget ? `Over by $${Math.abs(remaining).toFixed(2)}` : `$${remaining.toFixed(2)} left`}
        </Text>
      </View>
      <CategoryBudgetAlertIndicator
        consumptionPercent={consumptionPercent}
        categoryName={categoryName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  actual: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginRight: 4,
  },
  budgeted: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  remaining: {
    fontSize: 12,
    color: '#666',
    minWidth: 80,
    textAlign: 'right',
  },
  overBudget: {
    color: '#DC3545',
    fontWeight: '600',
  },
});
