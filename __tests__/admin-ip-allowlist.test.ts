import { adminIPRestriction } from '../src/middleware/security';

describe('adminIPRestriction', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function mockReply() {
    const res: any = { codeVal: undefined, payload: undefined };
    res.code = (c: number) => {
      res.codeVal = c;
      return {
        send: (p: any) => {
          res.payload = p;
        },
      };
    };
    return res;
  }

  it('denies in production when allowlist is empty', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ADMIN_IP_WHITELIST;

    const request: any = { ip: '203.0.113.10', url: '/admin', headers: { 'user-agent': 'jest' } };
    const reply = mockReply();

    await adminIPRestriction(request as any, reply as any);

    expect(reply.codeVal).toBe(403);
    expect(reply.payload?.error).toBe('Forbidden');
  });

  it('allows in development when allowlist is empty', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ADMIN_IP_WHITELIST;

    const request: any = { ip: '203.0.113.10', url: '/admin', headers: { 'user-agent': 'jest' } };
    const reply = mockReply();

    await adminIPRestriction(request as any, reply as any);

    expect(reply.codeVal).toBeUndefined();
  });

  it('allows in production when client IP is in allowlist', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_IP_WHITELIST = '203.0.113.10,198.51.100.5';

    const request: any = { ip: '203.0.113.10', url: '/admin', headers: { 'user-agent': 'jest' } };
    const reply = mockReply();

    await adminIPRestriction(request as any, reply as any);

    expect(reply.codeVal).toBeUndefined();
  });
});
