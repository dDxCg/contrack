import { TrendBucketView } from '../platform/platform.response.dto';

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

export interface SiteShiftStatsView extends ShiftStatsView {
  site_id: number;
  site_name: string;
}

export interface ProfitTrendBucketView {
  period_start: string;
  period_end: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
  is_estimated: boolean;
}

export interface DashboardComparisonView {
  period_start: string;
  period_end: string;
  projected_revenue: number;
  margin_pct: number;
  late_shifts: number;
  new_contracts: number;
}

export interface DashboardSummaryView {
  active_contracts: number;
  expiring_soon: number;
  disputed_shifts: number;
  projected_revenue: number;
  statements_closed: {
    closed: number;
    total: number;
  };
  shifts_summary: ShiftStatsView;
  shifts_by_site: SiteShiftStatsView[];
  new_contracts_trend: TrendBucketView[];
  renewal_rate_pct: number;
  cancellation_rate_pct: number;
  profit_trend: ProfitTrendBucketView[];
  comparison: DashboardComparisonView;
  bucket_unit: 'month' | 'week' | 'day';
}
