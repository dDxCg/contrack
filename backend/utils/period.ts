export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / 86400000);
}

export function dateFromDaysSinceEpoch(days: number): Date {
  return new Date(days * 86400000);
}

export function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addMonthsUTC(date: Date, count: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + count;
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function addDaysUTC(date: Date, count: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);

  return next;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toDateStringInZone(date: Date, timeZone: string): string {
  const { year, month, day } = partsInZone(date, timeZone);

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function startOfMonthInZone(date: Date, timeZone: string): Date {
  const { year, month } = partsInZone(date, timeZone);

  return new Date(Date.UTC(year, month - 1, 1));
}

function partsInZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value);

  return { year: get('year'), month: get('month'), day: get('day') };
}
