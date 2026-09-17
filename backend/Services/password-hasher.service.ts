import { compare, hash } from 'bcryptjs';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, storedHash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.rounds);
  }

  verify(plain: string, storedHash: string): Promise<boolean> {
    return compare(plain, storedHash);
  }
}
