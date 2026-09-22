export type Locale = 'en';

const TEMPLATES: Record<Locale, (period: string, totalAmount: string, pdfUrl: string | null) => string> = {
  en: (period, totalAmount, pdfUrl) =>
    pdfUrl === null
      ? `Statement for ${period}, total ${totalAmount}₫, is ready.`
      : `Statement for ${period}, total ${totalAmount}₫, is ready: ${pdfUrl}`,
};

export function statementSentMessage(
  period: string,
  totalAmount: string,
  pdfUrl: string | null,
  locale: Locale = 'en',
): string {
  return TEMPLATES[locale](period, totalAmount, pdfUrl);
}
