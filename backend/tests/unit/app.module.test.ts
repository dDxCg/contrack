import { corsOrigins } from '../../app.module';

describe('corsOrigins', () => {
  it('disables CORS when CORS_ORIGINS is unset', () => {
    expect(corsOrigins({})).toBe(false);
  });

  it('disables CORS when CORS_ORIGINS is blank', () => {
    expect(corsOrigins({ CORS_ORIGINS: '   ' })).toBe(false);
  });

  it('parses a single origin', () => {
    expect(corsOrigins({ CORS_ORIGINS: 'https://app.contrack.vn' })).toEqual(['https://app.contrack.vn']);
  });

  it('parses a comma-separated list, trimming whitespace and empty entries', () => {
    expect(corsOrigins({ CORS_ORIGINS: 'https://app.contrack.vn, https://admin.contrack.vn ,' })).toEqual([
      'https://app.contrack.vn',
      'https://admin.contrack.vn',
    ]);
  });
});
