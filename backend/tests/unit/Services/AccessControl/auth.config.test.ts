import { loadAuthConfig } from '../../../../Services/AccessControl/auth.config';

describe('loadAuthConfig', () => {
  it('refuses to start without a signing secret', () => {
    expect(() => loadAuthConfig({})).toThrow(/JWT_SECRET/);
  });

  it('defaults to the lifetimes stated in 05-api.md §2', () => {
    const config = loadAuthConfig({ JWT_SECRET: 'test-secret' });

    expect(config).toEqual({
      jwtSecret: 'test-secret',
      accessTtlSeconds: 1800,
      refreshTtlSeconds: 43200,
      fieldTtlSeconds: 86400,
      bcryptRounds: 10,
    });
  });

  it('reads every value from the environment when given', () => {
    const config = loadAuthConfig({
      JWT_SECRET: 'test-secret',
      JWT_ACCESS_TTL_SECONDS: '60',
      JWT_REFRESH_TTL_SECONDS: '600',
      JWT_FIELD_TTL_SECONDS: '7200',
      BCRYPT_ROUNDS: '4',
    });

    expect(config).toEqual({
      jwtSecret: 'test-secret',
      accessTtlSeconds: 60,
      refreshTtlSeconds: 600,
      fieldTtlSeconds: 7200,
      bcryptRounds: 4,
    });
  });

  it('refuses a non-positive lifetime instead of silently issuing never-expiring tokens', () => {
    expect(() => loadAuthConfig({ JWT_SECRET: 'test-secret', JWT_ACCESS_TTL_SECONDS: '0' })).toThrow(
      /JWT_ACCESS_TTL_SECONDS/,
    );
    expect(() => loadAuthConfig({ JWT_SECRET: 'test-secret', JWT_REFRESH_TTL_SECONDS: 'nope' })).toThrow(
      /JWT_REFRESH_TTL_SECONDS/,
    );
  });
});
