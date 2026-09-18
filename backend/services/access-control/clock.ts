import { Injectable } from '@nestjs/common';
export interface IClock {
  now(): Date;
}
export const CLOCK = Symbol('CLOCK');
@Injectable()
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
