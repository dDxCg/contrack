export interface StatementPdfLine {
  shiftId: number;
  scheduledDate: string;
  hasEvidence: boolean;
  amount: string;
}

export interface StatementPdfInput {
  statementId: number;
  contractId: number;
  period: string;
  totalAmount: string;
  lines: StatementPdfLine[];
}

export interface PdfRenderer {
  renderStatement(input: StatementPdfInput): Promise<Buffer>;
}

export const PDF_RENDERER = Symbol('PDF_RENDERER');
