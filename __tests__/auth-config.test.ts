import { jest } from '@jest/globals';

// Capture calls to supertokens.init and recipe inits
const initSpy = jest.fn();
const sessionInitSpy = jest.fn();
const emailPasswordInitSpy = jest.fn();
const emailVerificationInitSpy = jest.fn();

jest.mock('supertokens-node', () => ({
  __esModule: true,
  default: { init: initSpy },
}));

jest.mock('supertokens-node/recipe/session', () => ({
  __esModule: true,
  default: { init: sessionInitSpy },
  // also export a function style for code that imports Session from '.../session'
  init: sessionInitSpy,
}));

jest.mock('supertokens-node/recipe/emailpassword', () => ({
  __esModule: true,
  default: { init: emailPasswordInitSpy },
  init: emailPasswordInitSpy,
}));

jest.mock('supertokens-node/recipe/emailverification', () => ({
  __esModule: true,
  default: { init: emailVerificationInitSpy },
  init: emailVerificationInitSpy,
}));

// Mock Prisma for the signUpPOST override path
const upsertMock = jest.fn().mockResolvedValue(undefined);
const disconnectMock = jest.fn().mockResolvedValue(undefined);
class MockPrisma {
  user = { upsert: upsertMock } as any;
  $disconnect = disconnectMock as any;
}

jest.mock('@prisma/client', () => ({
  PrismaClient: MockPrisma,
}));

// Helper to reload module with fresh env and cleared spies
async function loadInit() {
  jest.resetModules();
  initSpy.mockClear();
  sessionInitSpy.mockClear();
  emailPasswordInitSpy.mockClear();
  emailVerificationInitSpy.mockClear();
  upsertMock.mockClear();
  disconnectMock.mockClear();
  const mod = await import('../src/auth/supertokens');
  return mod.initSuperTokens;
}

describe('SuperTokens config', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('uses dev-friendly cookie and CSRF settings in development', async () => {
    process.env.NODE_ENV = 'development';
    const init = await loadInit();
    await init();

    // Ensure Session recipe configured with dev flags
    expect(sessionInitSpy).toHaveBeenCalled();
    const sessionArgs = sessionInitSpy.mock.calls[0][0];
    expect(sessionArgs.cookieSecure).toBe(false);
    expect(sessionArgs.cookieSameSite).toBe('none');
    expect(sessionArgs.antiCsrf).toBe('NONE');

    // Email verification optional in dev
    expect(emailVerificationInitSpy).toHaveBeenCalled();
    const evArgs = emailVerificationInitSpy.mock.calls[0][0];
    expect(evArgs.mode).toBe('OPTIONAL');
  });

  it('uses secure cookie and CSRF settings in production', async () => {
    process.env.NODE_ENV = 'production';
    const init = await loadInit();
    await init();

    expect(sessionInitSpy).toHaveBeenCalled();
    const sessionArgs = sessionInitSpy.mock.calls[0][0];
    expect(sessionArgs.cookieSecure).toBe(true);
    expect(sessionArgs.cookieSameSite).toBe('lax');
    expect(sessionArgs.antiCsrf).toBe('VIA_TOKEN');

    expect(emailVerificationInitSpy).toHaveBeenCalled();
    const evArgs = emailVerificationInitSpy.mock.calls[0][0];
    expect(evArgs.mode).toBe('REQUIRED');
  });

  it('signUpPOST override upserts Prisma user on success', async () => {
    process.env.NODE_ENV = 'development';
    const init = await loadInit();
    await init();

    // Extract the signUpPOST override from the EmailPassword.init call
    const epArgs = emailPasswordInitSpy.mock.calls[0][0];
    expect(epArgs.override).toBeDefined();
    const overridden = epArgs.override.apis({
      signUpPOST: async (_input: any) => ({
        status: 'OK',
        user: { id: 'u1', emails: ['dev@example.com'] },
      }),
    });

    const resp = await overridden.signUpPOST({} as any);
    expect(resp.status).toBe('OK');
    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: 'u1' },
      update: { email: 'dev@example.com' },
      create: { id: 'u1', email: 'dev@example.com', passwordHash: '' },
    });
    expect(disconnectMock).toHaveBeenCalled();
  });
});
