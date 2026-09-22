import { PdfKitStatementRenderer } from '../../../data/pdf-renderer/pdfkit-statement-renderer';

function decodeHexStringLiterals(pdfSource: string): string {
  const hexLiteral = /<([0-9a-fA-F]+)>/g;
  let decoded = '';
  let match: RegExpExecArray | null;

  while ((match = hexLiteral.exec(pdfSource)) !== null) {
    decoded += Buffer.from(match[1], 'hex').toString('latin1');
  }

  return decoded;
}

describe('PdfKitStatementRenderer', () => {
  it('renders a real PDF file containing the statement period, lines and total', async () => {
    const renderer = new PdfKitStatementRenderer();

    const buffer = await renderer.renderStatement({
      statementId: 7,
      contractId: 42,
      period: '2024-10-01',
      totalAmount: '21,000,000.00',
      lines: [
        { shiftId: 22, scheduledDate: '2024-10-14', hasEvidence: true, amount: '21,000,000.00' },
        { shiftId: 23, scheduledDate: '2024-10-28', hasEvidence: false, amount: '0.00' },
      ],
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.subarray(-7).toString('latin1').trim()).toBe('%%EOF');

    const text = decodeHexStringLiterals(buffer.toString('latin1'));
    expect(text).toContain('Statement #7');
    expect(text).toContain('Contract #42');
    expect(text).toContain('2024-10-01');
    expect(text).toContain('21,000,000.00');
    expect(text).toContain('2024-10-14');
    expect(text).toContain('2024-10-28');
    expect(text).toContain('Missing');
  });
});
