import { AlertKind } from '../../../models/alerts/alert.entity';
import { messageFor } from '../../../services/alerts/messages';

describe('messageFor', () => {
  it('renders the Vietnamese contract-expiring template with the subject id', () => {
    expect(messageFor(AlertKind.ContractExpiring, 42)).toBe('Hợp đồng #42 sắp hết hạn');
  });

  it('renders the Vietnamese shift-overdue template with the subject id', () => {
    expect(messageFor(AlertKind.ShiftOverdue, 7)).toBe('Ca #7 đã trễ hẹn');
  });

  it('defaults to the vi locale when none is given', () => {
    expect(messageFor(AlertKind.ShiftOverdue, 1)).toBe(messageFor(AlertKind.ShiftOverdue, 1, 'vi'));
  });
});
