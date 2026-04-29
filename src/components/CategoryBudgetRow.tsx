import { View, Text, StyleSheet } from 'react-native';
import type { CategoryBudgetLine } from '../services/dashboardService';
import { formatCurrency } from '../services/dashboardService';

interface Props {
  line: CategoryBudgetLine;
}

/**
 * Renders a single category row in the budget dashboard.
 * Shows category name, progress bar, budgeted vs actual vs remaining.
 *
 * Progress bar colour:
 * - Green: < 70%
 * - Amber: 70–89%
 * - Red: >= 90%
 */
export function CategoryBudgetRow({ line }: Props) {
  const barColor =
    line.percentUsed >= 90
      ? '#ef4444'
      : line.percentUsed >= 70
      ? '#f59e0b'
      : '#22c55e';

  const barWidth = `${Math.min(100, line.percentUsed)}%` as `${number}%`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.categoryName}>{line.categoryName}</Text>
        <Text style={styles.percent}>{line.percentUsed}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]}
        />
      </View>

      <View style={styles.amounts}>
        <Text style={styles.amountLabel}>
          Spent: <Text style={styles.amountValue}>{formatCurrency(line.actual)}</Text>
        </Text>
        <Text style={styles.amountLabel}>
          Budget: <Text style={styles.amountValue}>{formatCurrency(line.budgeted)}</Text>
        </Text>
        <Text style={styles.amountLabel}>
          Left: <Text style={[styles.amountValue, { color: barColor }]}>
            {formatCurrency(line.remaining)}
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  percent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 12,
    color: '#888',
  },
  amountValue: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
