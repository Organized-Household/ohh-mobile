/**
 * applySignConvention — converts user-entered amount to signed storage value.
 *
 * Income → stored as positive number
 * Expense → stored as negative number
 *
 * Called on every transaction write — online and offline.
 * The DB check constraint (amount <> 0) is enforced at form validation layer.
 *
 * Source: OHhFinance_MasterDecisionLog_v1.md — Signed amount convention (FINAL)
 */
export function applySignConvention(
  amount: number,
  transactionType: 'income' | 'expense'
): number {
  const abs = Math.abs(amount);
  return transactionType === 'expense' ? -abs : abs;
}
