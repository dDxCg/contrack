export interface ShiftStatsView {
  scheduled: number;
  due: number;
  not_due: number;
  completed: number;
  completed_pct: number | null;
  overdue: number;
  overdue_pct: number | null;
  disputed: number;
  disputed_pct: number | null;
  missing_evidence: number;
}

export interface DashboardSummaryView {
  active_contracts: number;
  expiring_soon: number;
  disputed_shifts: number;
  projected_revenue: number;
  statements_closed: { closed: number; total: number };
  shifts_summary: ShiftStatsView;
  bucket_unit: 'month' | 'week' | 'day';
}
