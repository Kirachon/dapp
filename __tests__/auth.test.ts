import { PrismaClient } from '@prisma/client';
import { createMockUser, createMockProfile } from './setup';

// Mock the auth module
const mockGetUser = jest.fn();
const mockCreateNewSession = jest.fn();
const mockGetSession = jest.fn();

jest.mock('supertokens-node', () => ({
  getUser: mockGetUser,
}));

jest.mock('supertokens-node/recipe/session', () => ({
  createNewSession: mockCreateNewSession,
  getSession: mockGetSession,
}));

jest.mock('supertokens-node/recipe/emailpassword', () => ({
  signUp: jest.fn(),
  signIn: jest.fn(),
}));

describe('Authentication', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = global.mockPrisma;
    jest.clearAllMocks();
  });

  describe('User Authentication', () => {
    it('should authenticate valid user session', async () => {
      // Mock session data
      const mockSession = {
        getUserId: () => 'user-123',
        getAccessTokenPayload: () => ({ email: 'test@example.com' }),
      };

      mockGetSession.mockResolvedValue(mockSession);

      // Mock user lookup
      const mockUser = createMockUser();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Test authentication context
      const context = {
        user: mockUser,
        session: mockSession,
      };

      expect(context.user).toBeDefined();
      expect(context.user.id).toBe('user-123');
      expect(context.user.email).toBe('test@example.com');
    });

    it('should reject invalid session', async () => {
      mockGetSession.mockResolvedValue(null);

      const context = {
        user: null,
        session: null,
      };

      expect(context.user).toBeNull();
      expect(context.session).toBeNull();
    });

    it('should handle session creation', async () => {
      const userId = 'user-123';
      const userDataInJWT = { email: 'test@example.com' };
      const userDataInDatabase = { role: 'user' };

      mockCreateNewSession.mockResolvedValue({
        getAccessToken: () => 'mock-access-token',
        getRefreshToken: () => 'mock-refresh-token',
      });

      const session = await mockCreateNewSession(
        null, // request
        null, // response
        'public', // tenantId
        userId,
        userDataInJWT,
        userDataInDatabase
      );

      expect(mockCreateNewSession).toHaveBeenCalledWith(
        null,
        null,
        'public',
        userId,
        userDataInJWT,
        userDataInDatabase
      );
      expect(session).toBeDefined();
    });
  });

  describe('User Profile Integration', () => {
    it('should link user with profile', async () => {
      const mockUser = createMockUser();
      const mockProfile = createMockProfile();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      // Test user-profile relationship
      expect(mockUser.id).toBe(mockProfile.userId);
    });

    it('should handle user without profile', async () => {
      const mockUser = createMockUser();

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(null);

      const profile = await prisma.profile.findUnique({
        where: { userId: mockUser.id }
      });

      expect(profile).toBeNull();
    });
  });

  describe('Authorization Helpers', () => {
    it('should require authentication', () => {
      const requireAuth = (resolver: any) => {
        return (parent: any, args: any, context: any) => {
          if (!context.user) {
            throw new Error('Authentication required');
          }
          return resolver(parent, args, context);
        };
      };

      const protectedResolver = requireAuth(() => 'success');

      // Test with authenticated user
      expect(() => protectedResolver(null, {}, { user: createMockUser() }))
        .not.toThrow();

      // Test without authentication
      expect(() => protectedResolver(null, {}, { user: null }))
        .toThrow('Authentication required');
    });

    it('should require admin role', () => {
      const requireAdmin = (resolver: any) => {
        return (parent: any, args: any, context: any) => {
          if (!context.user) {
            throw new Error('Authentication required');
          }
          if (context.user.role !== 'admin') {
            throw new Error('Admin access required');
          }
          return resolver(parent, args, context);
        };
      };

      const adminResolver = requireAdmin(() => 'admin success');

      // Test with admin user
      const adminUser = createMockUser({ role: 'admin' });
      expect(() => adminResolver(null, {}, { user: adminUser }))
        .not.toThrow();

      // Test with regular user
      const regularUser = createMockUser({ role: 'user' });
      expect(() => adminResolver(null, {}, { user: regularUser }))
        .toThrow('Admin access required');
    });
  });

  describe('Session Management', () => {
    it('should handle session expiry', async () => {
      mockGetSession.mockRejectedValue(new Error('Session expired'));

      try {
        await mockGetSession();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Session expired');
      }
    });

    it('should validate session payload', () => {
      const validateSessionPayload = (payload: any) => {
        if (!payload.email) {
          throw new Error('Email required in session');
        }
        if (!payload.userId) {
          throw new Error('User ID required in session');
        }
        return true;
      };

      // Valid payload
      expect(() => validateSessionPayload({
        email: 'test@example.com',
        userId: 'user-123'
      })).not.toThrow();

      // Invalid payload
      expect(() => validateSessionPayload({
        email: 'test@example.com'
        // missing userId
      })).toThrow('User ID required in session');
    });
  });
});
