import { Inject, Injectable } from '@nestjs/common';
import { PlatformDashboardSummaryView, TrendBucketView } from '../../dtos/platform/platform.response.dto';
import { TenantStatus } from '../../models/tenants/tenant.entity';
import { ITenantRepository, TenantRepository } from '../../repositories/tenants/tenant.repository';
import { CLOCK, IClock } from '../access-control/clock';
import { addDaysUTC, addMonthsUTC, startOfMonthUTC, toDateString } from '../../utils/period';
const TREND_MONTHS = 6;
const RECENT_TENANTS_LIMIT = 5;
@Injectable()
export class PlatformDashboardService {
  constructor(
    @Inject(TenantRepository)
    private readonly tenantRepository: ITenantRepository,
    @Inject(CLOCK)
    private readonly clock: IClock,
  ) {}
  async get(): Promise<PlatformDashboardSummaryView> {
    const currentMonthStart = startOfMonthUTC(this.clock.now());
    const [total, active, suspended, growthTrend, recent] = await Promise.all([
      this.tenantRepository.countAll(),
      this.tenantRepository.countByStatus(TenantStatus.Active),
      this.tenantRepository.countByStatus(TenantStatus.Suspended),
      this.buildGrowthTrend(currentMonthStart),
      this.tenantRepository.listRecent(RECENT_TENANTS_LIMIT),
    ]);
    return {
      total_tenants: total,
      active_tenants: active,
      suspended_tenants: suspended,
      tenants_created_this_period: growthTrend[growthTrend.length - 1].count,
      growth_trend: growthTrend,
      recent_tenants: recent.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        created_at: tenant.createdAt,
      })),
    };
  }
  private async buildGrowthTrend(currentMonthStart: Date): Promise<TrendBucketView[]> {
    const firstBucketStart = addMonthsUTC(currentMonthStart, -(TREND_MONTHS - 1));
    const buckets: TrendBucketView[] = [];
    for (let i = 0; i < TREND_MONTHS; i += 1) {
      const start = addMonthsUTC(firstBucketStart, i);
      const end = addMonthsUTC(start, 1);
      const count = await this.tenantRepository.countCreatedBetween(start, end);
      buckets.push({
        period_start: toDateString(start),
        period_end: toDateString(addDaysUTC(end, -1)),
        label: `T${start.getUTCMonth() + 1}`,
        count,
      });
    }
    return buckets;
  }
}
