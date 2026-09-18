export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
export function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
export function addMonthsUTC(date: Date, count: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + count);
  return next;
}
export function addDaysUTC(date: Date, count: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
