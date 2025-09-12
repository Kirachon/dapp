import { ensureMockAuthDisabledInProd } from '../src/lib/security/mock-auth-guard';

describe('ensureMockAuthDisabledInProd', () => {
  it('throws in production when ALLOW_MOCK_AUTH is true', () => {
    expect(() =>
      ensureMockAuthDisabledInProd({ NODE_ENV: 'production', ALLOW_MOCK_AUTH: 'true' } as any),
    ).toThrow(/Mock authentication cannot be enabled in production/i);
  });

  it('does not throw in production when ALLOW_MOCK_AUTH is false', () => {
    expect(() =>
      ensureMockAuthDisabledInProd({ NODE_ENV: 'production', ALLOW_MOCK_AUTH: 'false' } as any),
    ).not.toThrow();
  });

  it('does not throw in development even when ALLOW_MOCK_AUTH is true', () => {
    expect(() =>
      ensureMockAuthDisabledInProd({ NODE_ENV: 'development', ALLOW_MOCK_AUTH: 'true' } as any),
    ).not.toThrow();
  });
});
