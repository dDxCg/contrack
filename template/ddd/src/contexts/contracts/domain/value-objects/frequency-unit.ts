/**
 * FrequencyUnit — ported verbatim from backend/models/contracts/contract-item.entity.ts.
 * Kept as a plain enum (no persistence concerns) because it is a closed,
 * ubiquitous-language vocabulary term of the contracts domain.
 */
export enum FrequencyUnit {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Quarter = 'quarter',
  Year = 'year',
}
