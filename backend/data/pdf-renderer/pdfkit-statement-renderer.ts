import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PdfRenderer, StatementPdfInput } from './pdf-renderer';

@Injectable()
export class PdfKitStatementRenderer implements PdfRenderer {
  async renderStatement(input: StatementPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, compress: false });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(`Statement #${input.statementId}`, { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Contract #${input.contractId}`);
      doc.text(`Period: ${input.period}`);
      doc.moveDown();

      doc.fontSize(12).text('Shift', 50, doc.y, { continued: true, width: 100 });
      doc.text('Date', 150, doc.y - doc.currentLineHeight(), { continued: true, width: 100 });
      doc.text('Evidence', 250, doc.y - doc.currentLineHeight(), { continued: true, width: 100 });
      doc.text('Amount', 350, doc.y - doc.currentLineHeight());
      doc.moveDown(0.5);

      for (const line of input.lines) {
        const y = doc.y;
        doc.fontSize(10).text(`#${line.shiftId}`, 50, y, { continued: true, width: 100 });
        doc.text(line.scheduledDate, 150, y, { continued: true, width: 100 });
        doc.text(line.hasEvidence ? 'Complete' : 'Missing', 250, y, { continued: true, width: 100 });
        doc.text(line.amount, 350, y);
      }

      doc.moveDown();
      doc.fontSize(13).text(`Total: ${input.totalAmount}`, { align: 'right' });
      doc.end();
    });
  }
}
