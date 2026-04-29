import { supabase } from '../lib/supabase';

/**
 * Dashboard data types.
 *
 * Schema reference: docs/schema-map.json
 * Tables: budgets, budget_lines, transactions, categories
 *
 * Key facts from schema-map.json:
 * - budget_lines.amount: single column (NOT planned_income/planned_expense)
 * - transactions.transaction_date: date column (NOT occurred_at)
 * - transactions.created_by_user_id: user column (NOT user_id)
 * - transactions.amount: signed — income=positive, expense=negative
 * - budgets unique constraint: (tenant_id, user_id, month_start)
 * - month_start is always first day of month: YYYY-MM-01
 */

export interface CategoryBudgetLine {
  categoryId: string;
  categoryName: string;
  budgeted: number;      // from budget_lines.amount (always positive)
  actual: number;        // ABS(SUM of transactions.amount) for this category
  remaining: number;     // budgeted - actual
  percentUsed: number;   // (actual / budgeted) * 100, capped at 999
}

export interface DashboardData {
  month: string;         // YYYY-MM-01
  memberName: string;
  lines: CategoryBudgetLine[];
  totalBudgeted: number;
  totalActual: number;
}

/**
 * Fetches budget vs actual data for a given member and month.
 *
 * Used by both member (own data) and admin (any member's data).
 * RLS handles data isolation — member sees own, admin sees any.
 *
 * @param userId - The target member's user_id
 * @param tenantId - The household tenant_id
 * @param monthStart - First day of month as ISO date string (YYYY-MM-01)
 */
export async function fetchDashboardData(
  userId: string,
  tenantId: string,
  monthStart: string
): Promise<DashboardData | null> {
  // Step 1: Get the budget row for this member + month
  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('month_start', monthStart)
    .single();

  if (budgetError || !budget) {
    // No budget set for this month — return empty state
    return null;
  }

  // Step 2: Get all budget lines for this budget with category names
  const { data: lines, error: linesError } = await supabase
    .from('budget_lines')
    .select(`
      amount,
      category_id,
      categories (
        id,
        name
      )
    `)
    .eq('budget_id', budget.id)
    .gt('amount', 0);

  if (linesError || !lines) return null;

  // Step 3: Get all transactions for this member + month
  // month_start to first day of next month
  const nextMonth = getNextMonthStart(monthStart);

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('amount, category_id')
    .eq('created_by_user_id', userId)
    .eq('tenant_id', tenantId)
    .gte('transaction_date', monthStart)
    .lt('transaction_date', nextMonth);

  if (txError) return null;

  // Step 4: Sum actuals per category
  // Expenses are stored as negative — use ABS for display
  const actualsByCategory: Record<string, number> = {};
  for (const tx of transactions ?? []) {
    const abs = Math.abs(Number(tx.amount));
    actualsByCategory[tx.category_id] =
      (actualsByCategory[tx.category_id] ?? 0) + abs;
  }

  // Step 5: Build dashboard lines
  const dashboardLines: CategoryBudgetLine[] = lines.map((line) => {
    const category = Array.isArray(line.categories)
      ? line.categories[0]
      : line.categories;
    const budgeted = Number(line.amount);
    const actual = actualsByCategory[line.category_id] ?? 0;
    const remaining = Math.max(0, budgeted - actual);
    const percentUsed = budgeted > 0
      ? Math.min(999, Math.round((actual / budgeted) * 100))
      : 0;

    return {
      categoryId: line.category_id,
      categoryName: (category as { name: string } | null)?.name ?? 'Unknown',
      budgeted,
      actual,
      remaining,
      percentUsed,
    };
  });

  // Sort by percentUsed descending (most at-risk categories first)
  dashboardLines.sort((a, b) => b.percentUsed - a.percentUsed);

  const totalBudgeted = dashboardLines.reduce((s, l) => s + l.budgeted, 0);
  const totalActual = dashboardLines.reduce((s, l) => s + l.actual, 0);

  // Get member display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, first_name')
    .eq('user_id', userId)
    .single();

  const memberName =
    (profile?.display_name as string | null) ??
    (profile?.first_name as string | null) ??
    'Member';

  return {
    month: monthStart,
    memberName,
    lines: dashboardLines,
    totalBudgeted,
    totalActual,
  };
}

/**
 * Returns the first day of the next month given a YYYY-MM-01 string.
 */
function getNextMonthStart(monthStart: string): string {
  const date = new Date(monthStart);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Returns the current month start as YYYY-MM-01.
 */
export function getCurrentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Formats a currency amount for display (CAD).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
