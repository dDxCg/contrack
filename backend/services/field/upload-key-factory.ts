import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface IUploadKeyFactory {
  next(): string;
}

export const UPLOAD_KEY_FACTORY = Symbol('UPLOAD_KEY_FACTORY');

@Injectable()
export class RandomUploadKeyFactory implements IUploadKeyFactory {
  next(): string {
    return randomUUID();
  }
}
