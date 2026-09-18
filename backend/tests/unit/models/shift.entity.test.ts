import {
  ShiftAlreadyCompletedException,
  ShiftAlreadyDisputedException,
  ShiftNotDisputedException,
} from '../../../models/domain-errors';
import { Shift, ShiftStatus } from '../../../models/shifts/shift.entity';
import { captureDomainError } from '../../support/domain-errors';
function aScheduledShift(): Shift {
  const shift = new Shift();
  shift.id = 1;
  shift.tenantId = 1;
  shift.contractItemId = 1;
  shift.assigneeId = 5;
  shift.scheduledDate = new Date('2024-10-21');
  shift.completedAt = null;
  shift.latitude = null;
  shift.longitude = null;
  shift.capturedAt = null;
  shift.receiptPhotoUrl = null;
  shift.status = ShiftStatus.Scheduled;
  return shift;
}
describe('Shift.complete — FR16, FR24, D7', () => {
  it('captures evidence and server time, marks completed', () => {
    const shift = aScheduledShift();
    const now = new Date('2024-10-21T08:30:00.000Z');
    shift.complete(
      {
        receiptPhotoUrl: 'uploads/9f1c/receipt.jpg',
        latitude: 21.0176,
        longitude: 105.7833,
        geoVerified: true,
      },
      now,
    );
    expect(shift.status).toBe(ShiftStatus.Completed);
    expect(shift.completedAt).toBe(now);
    expect(shift.capturedAt).toBe(now);
    expect(shift.receiptPhotoUrl).toBe('uploads/9f1c/receipt.jpg');
    expect(shift.latitude).toBe(21.0176);
    expect(shift.longitude).toBe(105.7833);
    expect(shift.geoVerified).toBe(true);
  });
  it('completes with null GPS rather than rejecting the submission', () => {
    const shift = aScheduledShift();
    shift.complete(
      { receiptPhotoUrl: 'uploads/x/receipt.jpg', latitude: null, longitude: null, geoVerified: false },
      new Date(),
    );
    expect(shift.status).toBe(ShiftStatus.Completed);
    expect(shift.latitude).toBeNull();
    expect(shift.longitude).toBeNull();
    expect(shift.geoVerified).toBe(false);
  });
  it('rejects a second submission on an already-completed shift', () => {
    const shift = aScheduledShift();
    const firstSubmission = new Date('2024-10-21T08:30:00.000Z');
    shift.complete(
      { receiptPhotoUrl: 'uploads/x/receipt.jpg', latitude: null, longitude: null, geoVerified: false },
      firstSubmission,
    );
    const error = captureDomainError(() =>
      shift.complete(
        { receiptPhotoUrl: 'uploads/y/receipt.jpg', latitude: null, longitude: null, geoVerified: false },
        new Date(),
      ),
    );
    expect(error).toBeInstanceOf(ShiftAlreadyCompletedException);
    expect(shift.receiptPhotoUrl).toBe('uploads/x/receipt.jpg');
  });
  it('rejects completion of a disputed shift', () => {
    const shift = aScheduledShift();
    shift.complete(
      { receiptPhotoUrl: 'uploads/x/receipt.jpg', latitude: null, longitude: null, geoVerified: false },
      new Date(),
    );
    shift.dispute();
    expect(() =>
      shift.complete(
        { receiptPhotoUrl: 'uploads/y/receipt.jpg', latitude: null, longitude: null, geoVerified: false },
        new Date(),
      ),
    ).toThrow(ShiftAlreadyCompletedException);
  });
});
describe('Shift.dispute / resolveDispute — FR8', () => {
  it('marks a shift disputed', () => {
    const shift = aScheduledShift();
    shift.dispute();
    expect(shift.status).toBe(ShiftStatus.Disputed);
  });
  it('rejects disputing an already-disputed shift', () => {
    const shift = aScheduledShift();
    shift.dispute();
    expect(() => shift.dispute()).toThrow(ShiftAlreadyDisputedException);
  });
  it('returns a disputed shift to completed on resolution', () => {
    const shift = aScheduledShift();
    shift.dispute();
    shift.resolveDispute();
    expect(shift.status).toBe(ShiftStatus.Completed);
  });
  it('rejects resolving a shift that is not disputed', () => {
    const shift = aScheduledShift();
    const error = captureDomainError(() => shift.resolveDispute());
    expect(error).toBeInstanceOf(ShiftNotDisputedException);
  });
});
describe('Shift.reassign — FR15', () => {
  it('changes the assignee and, optionally, the scheduled date', () => {
    const shift = aScheduledShift();
    shift.reassign(9, new Date('2024-10-22'));
    expect(shift.assigneeId).toBe(9);
    expect(shift.scheduledDate).toEqual(new Date('2024-10-22'));
  });
  it('unassigns when given null', () => {
    const shift = aScheduledShift();
    shift.reassign(null);
    expect(shift.assigneeId).toBeNull();
  });
  it('keeps the scheduled date when none is given', () => {
    const shift = aScheduledShift();
    const original = shift.scheduledDate;
    shift.reassign(9);
    expect(shift.scheduledDate).toBe(original);
  });
  it('rejects reassigning a completed shift', () => {
    const shift = aScheduledShift();
    shift.complete(
      { receiptPhotoUrl: 'uploads/x/receipt.jpg', latitude: null, longitude: null, geoVerified: false },
      new Date(),
    );
    expect(() => shift.reassign(9)).toThrow(ShiftAlreadyCompletedException);
  });
});
