import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CategoryBudgetAlertIndicatorProps {
  consumptionPercent: number;
  categoryName: string;
}

export function CategoryBudgetAlertIndicator({
  consumptionPercent,
  categoryName,
}: CategoryBudgetAlertIndicatorProps) {
  if (consumptionPercent < 80) {
    return null;
  }

  const isNearLimit = consumptionPercent >= 80 && consumptionPercent < 100;
  const isOverBudget = consumptionPercent >= 100;

  return (
    <View
      style={[
        styles.container,
        isOverBudget ? styles.overBudget : styles.nearLimit,
      ]}
    >
      <Text style={styles.text}>
        {isOverBudget
          ? `${categoryName} is over budget (${Math.round(consumptionPercent)}%)`
          : `${categoryName} is at ${Math.round(consumptionPercent)}% of budget`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginVertical: 4,
  },
  nearLimit: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  overBudget: {
    backgroundColor: '#F8D7DA',
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  text: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
});
