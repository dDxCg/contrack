import { AlertKind } from '../../models/alerts/alert.entity';

export type Locale = 'vi';

const TEMPLATES: Record<Locale, Record<AlertKind, (subjectId: number) => string>> = {
  vi: {
    [AlertKind.ContractExpiring]: (subjectId) => `Hợp đồng #${subjectId} sắp hết hạn`,
    [AlertKind.ShiftOverdue]: (subjectId) => `Ca #${subjectId} đã trễ hẹn`,
  },
};

export function messageFor(kind: AlertKind, subjectId: number, locale: Locale = 'vi'): string {
  return TEMPLATES[locale][kind](subjectId);
}
