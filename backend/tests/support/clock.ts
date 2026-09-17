import { IClock } from '../../Services/AccessControl/clock';

export class FakeClock implements IClock {
  constructor(private current: Date = new Date('2024-10-14T10:00:00.000Z')) {}

  now(): Date {
    return this.current;
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
