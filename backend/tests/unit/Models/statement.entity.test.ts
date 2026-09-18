import { StatementImmutableException, StatementNotIssuedException } from '../../../models/domain-errors';
import { Statement, StatementStatus } from '../../../models/statements/statement.entity';
import { captureDomainError } from '../../support/domain-errors';
function aDraftStatement(): Statement {
  const statement = new Statement();
  statement.id = 1;
  statement.tenantId = 1;
  statement.contractId = 1;
  statement.period = new Date('2024-10-01');
  statement.totalAmount = 1700000;
  statement.pdfUrl = null;
  statement.createdAt = new Date('2024-11-01T00:00:00.000Z');
  statement.status = StatementStatus.Draft;
  return statement;
}
describe('Statement.export — FR11', () => {
  it('moves a draft to issued', () => {
    const statement = aDraftStatement();
    statement.export();
    expect(statement.status).toBe(StatementStatus.Issued);
  });
  it('rejects exporting a statement that is already issued', () => {
    const statement = aDraftStatement();
    statement.export();
    const error = captureDomainError(() => statement.export());
    expect(error).toBeInstanceOf(StatementImmutableException);
  });
  it('rejects exporting a statement that has been sent', () => {
    const statement = aDraftStatement();
    statement.export();
    statement.send();
    expect(() => statement.export()).toThrow(StatementImmutableException);
  });
});
describe('Statement.send — FR12', () => {
  it('moves an issued statement to sent', () => {
    const statement = aDraftStatement();
    statement.export();
    statement.send();
    expect(statement.status).toBe(StatementStatus.Sent);
  });
  it('rejects sending a draft (no PDF yet)', () => {
    const statement = aDraftStatement();
    const error = captureDomainError(() => statement.send());
    expect(error).toBeInstanceOf(StatementNotIssuedException);
  });
  it('rejects sending twice (idempotent per US-16)', () => {
    const statement = aDraftStatement();
    statement.export();
    statement.send();
    expect(() => statement.send()).toThrow(StatementNotIssuedException);
  });
});
