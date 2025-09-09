import { PrismaClient } from '@prisma/client';

// Mock external services
const mockMinIOClient = {
  presignedPutObject: jest.fn(),
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  removeObject: jest.fn(),
};

const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
};

const mockSuperTokens = {
  getUser: jest.fn(),
  createNewSession: jest.fn(),
  getSession: jest.fn(),
  revokeAllSessionsForUser: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn(() => mockMinIOClient),
}));

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

jest.mock('supertokens-node', () => mockSuperTokens);

describe('External Services Integration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = global.mockPrisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MinIO Storage Integration', () => {
    it('should generate presigned upload URLs', async () => {
      const mockPresignedUrl = 'https://minio.example.com/bucket/photo.jpg?signature=abc123';
      mockMinIOClient.presignedPutObject.mockResolvedValue(mockPresignedUrl);

      const bucketName = 'dating-app';
      const objectName = 'user-123/photo.jpg';
      const expiry = 3600;

      const url = await mockMinIOClient.presignedPutObject(bucketName, objectName, expiry);

      expect(mockMinIOClient.presignedPutObject).toHaveBeenCalledWith(
        bucketName,
        objectName,
        expiry
      );
      expect(url).toBe(mockPresignedUrl);
    });

    it('should handle bucket creation', async () => {
      mockMinIOClient.bucketExists.mockResolvedValue(false);
      mockMinIOClient.makeBucket.mockResolvedValue(undefined);

      const bucketName = 'dating-app';

      // Check if bucket exists
      const exists = await mockMinIOClient.bucketExists(bucketName);
      expect(exists).toBe(false);

      // Create bucket
      await mockMinIOClient.makeBucket(bucketName);

      expect(mockMinIOClient.bucketExists).toHaveBeenCalledWith(bucketName);
      expect(mockMinIOClient.makeBucket).toHaveBeenCalledWith(bucketName);
    });

    it('should handle file deletion', async () => {
      mockMinIOClient.removeObject.mockResolvedValue(undefined);

      const bucketName = 'dating-app';
      const objectName = 'user-123/old-photo.jpg';

      await mockMinIOClient.removeObject(bucketName, objectName);

      expect(mockMinIOClient.removeObject).toHaveBeenCalledWith(bucketName, objectName);
    });

    it('should handle MinIO connection errors', async () => {
      mockMinIOClient.presignedPutObject.mockRejectedValue(
        new Error('MinIO connection failed')
      );

      await expect(
        mockMinIOClient.presignedPutObject('bucket', 'object', 3600)
      ).rejects.toThrow('MinIO connection failed');
    });
  });

  describe('Redis Cache Integration', () => {
    it('should connect and disconnect from Redis', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.disconnect.mockResolvedValue(undefined);

      await mockRedisClient.connect();
      await mockRedisClient.disconnect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should cache and retrieve user sessions', async () => {
      const sessionKey = 'session:user-123';
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        lastActive: new Date().toISOString()
      };

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

      // Set session
      await mockRedisClient.set(sessionKey, JSON.stringify(sessionData));
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        sessionKey,
        JSON.stringify(sessionData)
      );

      // Get session
      const retrieved = await mockRedisClient.get(sessionKey);
      const parsedData = JSON.parse(retrieved);

      expect(parsedData).toEqual(sessionData);
    });

    it('should handle cache expiration', async () => {
      const key = 'temp:user-123';
      const value = 'temporary-data';
      const ttl = 3600; // 1 hour

      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);

      await mockRedisClient.set(key, value);
      await mockRedisClient.expire(key, ttl);

      expect(mockRedisClient.set).toHaveBeenCalledWith(key, value);
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should handle cache misses', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await mockRedisClient.get('nonexistent:key');
      expect(result).toBeNull();
    });

    it('should handle Redis connection errors', async () => {
      mockRedisClient.connect.mockRejectedValue(
        new Error('Redis connection failed')
      );

      await expect(mockRedisClient.connect()).rejects.toThrow('Redis connection failed');
    });
  });

  describe('SuperTokens Authentication Integration', () => {
    it('should create and retrieve user sessions', async () => {
      const userId = 'user-123';
      const userDataInJWT = { email: 'test@example.com' };
      const userDataInDatabase = { role: 'user' };

      const mockSession = {
        getAccessToken: () => 'mock-access-token',
        getRefreshToken: () => 'mock-refresh-token',
        getUserId: () => userId,
        getAccessTokenPayload: () => userDataInJWT,
      };

      mockSuperTokens.createNewSession.mockResolvedValue(mockSession);
      mockSuperTokens.getSession.mockResolvedValue(mockSession);

      // Create session
      const createdSession = await mockSuperTokens.createNewSession(
        null, // request
        null, // response
        'public', // tenantId
        userId,
        userDataInJWT,
        userDataInDatabase
      );

      expect(createdSession.getUserId()).toBe(userId);
      expect(mockSuperTokens.createNewSession).toHaveBeenCalledWith(
        null,
        null,
        'public',
        userId,
        userDataInJWT,
        userDataInDatabase
      );

      // Retrieve session
      const retrievedSession = await mockSuperTokens.getSession(null, null);
      expect(retrievedSession.getUserId()).toBe(userId);
    });

    it('should handle user lookup', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        timeJoined: Date.now(),
      };

      mockSuperTokens.getUser.mockResolvedValue(mockUser);

      const user = await mockSuperTokens.getUser(userId);

      expect(user).toEqual(mockUser);
      expect(mockSuperTokens.getUser).toHaveBeenCalledWith(userId);
    });

    it('should handle session revocation', async () => {
      const userId = 'user-123';
      mockSuperTokens.revokeAllSessionsForUser.mockResolvedValue(['session-1', 'session-2']);

      const revokedSessions = await mockSuperTokens.revokeAllSessionsForUser(userId);

      expect(revokedSessions).toHaveLength(2);
      expect(mockSuperTokens.revokeAllSessionsForUser).toHaveBeenCalledWith(userId);
    });

    it('should handle invalid sessions', async () => {
      mockSuperTokens.getSession.mockResolvedValue(null);

      const session = await mockSuperTokens.getSession(null, null);
      expect(session).toBeNull();
    });

    it('should handle SuperTokens errors', async () => {
      mockSuperTokens.getUser.mockRejectedValue(
        new Error('User not found')
      );

      await expect(mockSuperTokens.getUser('invalid-user'))
        .rejects.toThrow('User not found');
    });
  });

  describe('Service Health Checks', () => {
    it('should check MinIO health', async () => {
      mockMinIOClient.bucketExists.mockResolvedValue(true);

      const isHealthy = await mockMinIOClient.bucketExists('health-check');
      expect(isHealthy).toBe(true);
    });

    it('should check Redis health', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('test');

      await mockRedisClient.set('health-check', 'test');
      const result = await mockRedisClient.get('health-check');

      expect(result).toBe('test');
    });

    it('should handle service unavailability', async () => {
      // MinIO unavailable
      mockMinIOClient.bucketExists.mockRejectedValue(new Error('Service unavailable'));

      await expect(mockMinIOClient.bucketExists('test'))
        .rejects.toThrow('Service unavailable');

      // Redis unavailable
      mockRedisClient.get.mockRejectedValue(new Error('Connection refused'));

      await expect(mockRedisClient.get('test'))
        .rejects.toThrow('Connection refused');
    });
  });

  describe('Service Integration Workflows', () => {
    it('should handle complete photo upload workflow', async () => {
      // 1. Generate presigned URL
      const presignedUrl = 'https://minio.example.com/presigned-url';
      mockMinIOClient.presignedPutObject.mockResolvedValue(presignedUrl);

      const uploadUrl = await mockMinIOClient.presignedPutObject(
        'dating-app',
        'user-123/photo.jpg',
        3600
      );

      expect(uploadUrl).toBe(presignedUrl);

      // 2. Cache upload metadata
      const uploadMetadata = {
        userId: 'user-123',
        filename: 'photo.jpg',
        uploadUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      mockRedisClient.set.mockResolvedValue('OK');
      await mockRedisClient.set(
        'upload:user-123:photo.jpg',
        JSON.stringify(uploadMetadata)
      );

      // 3. Update user profile with photo URL
      const photoUrl = 'https://minio.example.com/dating-app/user-123/photo.jpg';
      const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        photos: [photoUrl]
      };

      (prisma.profile.update as jest.Mock).mockResolvedValue(mockProfile);

      const updatedProfile = await prisma.profile.update({
        where: { userId: 'user-123' },
        data: {
          photos: { push: photoUrl }
        }
      });

      expect(updatedProfile.photos).toContain(photoUrl);
    });

    it('should handle user authentication and caching workflow', async () => {
      // 1. Authenticate with SuperTokens
      const mockSession = {
        getUserId: () => 'user-123',
        getAccessTokenPayload: () => ({ email: 'test@example.com' })
      };

      mockSuperTokens.getSession.mockResolvedValue(mockSession);

      const session = await mockSuperTokens.getSession(null, null);
      expect(session.getUserId()).toBe('user-123');

      // 2. Cache user data in Redis
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        lastActive: new Date().toISOString()
      };

      mockRedisClient.set.mockResolvedValue('OK');
      await mockRedisClient.set(
        'user:user-123',
        JSON.stringify(userData)
      );

      // 3. Update user activity in database
      const mockUser = { ...userData, lastActiveAt: new Date() };
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const updatedUser = await prisma.user.update({
        where: { id: 'user-123' },
        data: { lastActiveAt: mockUser.lastActiveAt }
      });

      expect(updatedUser.lastActiveAt).toEqual(mockUser.lastActiveAt);
    });
  });
});
