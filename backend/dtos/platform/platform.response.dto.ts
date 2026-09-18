import { TenantStatus } from '../../models/tenants/tenant.entity';
import { PageView } from '../page.dto';
export interface PlatformAdminView {
  id: number;
  name: string;
}
export interface PlatformSessionView {
  token: string;
  platform_admin: PlatformAdminView;
}
export interface TenantView {
  id: number;
  name: string;
  status: TenantStatus;
  created_at: Date;
  director_employee_id?: number;
}
export type TenantPage = PageView<TenantView>;
export interface TrendBucketView {
  period_start: string;
  period_end: string;
  label: string;
  count: number;
}
export interface RecentTenantView {
  id: number;
  name: string;
  status: TenantStatus;
  created_at: Date;
}
export interface PlatformDashboardSummaryView {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  tenants_created_this_period: number;
  growth_trend: TrendBucketView[];
  recent_tenants: RecentTenantView[];
}
