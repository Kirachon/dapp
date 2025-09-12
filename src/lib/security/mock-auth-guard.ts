export function ensureMockAuthDisabledInProd(env: NodeJS.ProcessEnv = process.env): void {
  const isProduction = env.NODE_ENV === 'production';
  const allowMockAuth = env.ALLOW_MOCK_AUTH === 'true';
  if (isProduction && allowMockAuth) {
    throw new Error(
      'SECURITY: Mock authentication cannot be enabled in production. Remove ALLOW_MOCK_AUTH or set it to false.',
    );
  }
}
