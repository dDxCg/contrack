import { statementSentMessage } from '../../../services/statements/messages';

describe('statementSentMessage', () => {
  it('includes the period, total and PDF link when one is set', () => {
    expect(statementSentMessage('2024-10-01', '21,000,000.00', 'https://cdn.test/statements/7.pdf')).toBe(
      'Statement for 2024-10-01, total 21,000,000.00₫, is ready: https://cdn.test/statements/7.pdf',
    );
  });

  it('still renders a message when there is no PDF link yet', () => {
    expect(statementSentMessage('2024-10-01', '21,000,000.00', null)).toBe(
      'Statement for 2024-10-01, total 21,000,000.00₫, is ready.',
    );
  });
});
