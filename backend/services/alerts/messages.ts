import { AlertKind } from '../../models/alerts/alert.entity';
import { dateFromDaysSinceEpoch, toDateString } from '../../utils/period';

export type Locale = 'vi';

const TEMPLATES: Record<Locale, Record<AlertKind, (subjectId: number) => string>> = {
  vi: {
    [AlertKind.ContractExpiring]: (subjectId) => `Hợp đồng #${subjectId} sắp hết hạn`,
    [AlertKind.ShiftOverdue]: (subjectId) => `Ca #${subjectId} đã trễ hẹn`,
    [AlertKind.ScheduleOverload]: (subjectId) =>
      `Ngày ${toDateString(dateFromDaysSinceEpoch(subjectId))} có nhiều ca hơn số team hiện có, cần kiểm tra phân bổ`,
  },
};

export function messageFor(kind: AlertKind, subjectId: number, locale: Locale = 'vi'): string {
  return TEMPLATES[locale][kind](subjectId);
}
