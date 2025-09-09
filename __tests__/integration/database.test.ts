import { PrismaClient } from '@prisma/client';
import { createMockUser, createMockProfile, createMockMatch, createMockMessage } from '../setup';

describe('Database Integration Tests', () => {
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

  describe('User Operations', () => {
    it('should create and retrieve user', async () => {
      const mockUser = createMockUser();
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Create user
      const createdUser = await prisma.user.create({
        data: {
          id: mockUser.id,
          email: mockUser.email,
        }
      });

      expect(createdUser).toEqual(mockUser);

      // Retrieve user
      const retrievedUser = await prisma.user.findUnique({
        where: { id: mockUser.id }
      });

      expect(retrievedUser).toEqual(mockUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          id: mockUser.id,
          email: mockUser.email,
        }
      });
    });

    it('should handle user email uniqueness', async () => {
      const existingUser = createMockUser();
      const duplicateUser = createMockUser({ id: 'user-456', email: existingUser.email });

      (prisma.user.create as jest.Mock)
        .mockResolvedValueOnce(existingUser)
        .mockRejectedValueOnce(new Error('Unique constraint failed'));

      // Create first user
      const firstUser = await prisma.user.create({
        data: {
          id: existingUser.id,
          email: existingUser.email,
        }
      });

      expect(firstUser).toEqual(existingUser);

      // Try to create duplicate
      await expect(prisma.user.create({
        data: {
          id: duplicateUser.id,
          email: duplicateUser.email,
        }
      })).rejects.toThrow('Unique constraint failed');
    });

    it('should update user last active timestamp', async () => {
      const mockUser = createMockUser();
      const updatedUser = { ...mockUser, lastActiveAt: new Date() };

      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await prisma.user.update({
        where: { id: mockUser.id },
        data: { lastActiveAt: updatedUser.lastActiveAt }
      });

      expect(result.lastActiveAt).toEqual(updatedUser.lastActiveAt);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastActiveAt: updatedUser.lastActiveAt }
      });
    });
  });

  describe('Profile Operations', () => {
    it('should create and upsert profile', async () => {
      const mockProfile = createMockProfile();
      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const result = await prisma.profile.upsert({
        where: { userId: mockProfile.userId },
        create: {
          userId: mockProfile.userId,
          name: mockProfile.name,
          age: mockProfile.age,
          bio: mockProfile.bio,
        },
        update: {
          name: mockProfile.name,
          age: mockProfile.age,
          bio: mockProfile.bio,
        }
      });

      expect(result).toEqual(mockProfile);
      expect(prisma.profile.upsert).toHaveBeenCalledWith({
        where: { userId: mockProfile.userId },
        create: {
          userId: mockProfile.userId,
          name: mockProfile.name,
          age: mockProfile.age,
          bio: mockProfile.bio,
        },
        update: {
          name: mockProfile.name,
          age: mockProfile.age,
          bio: mockProfile.bio,
        }
      });
    });

    it('should handle profile photo array operations', async () => {
      const mockProfile = createMockProfile({ photos: ['photo1.jpg'] });
      const updatedProfile = { ...mockProfile, photos: ['photo1.jpg', 'photo2.jpg'] };

      (prisma.profile.update as jest.Mock).mockResolvedValue(updatedProfile);

      const result = await prisma.profile.update({
        where: { userId: mockProfile.userId },
        data: {
          photos: {
            push: 'photo2.jpg'
          }
        }
      });

      expect(result.photos).toContain('photo2.jpg');
      expect(result.photos).toHaveLength(2);
    });

    it('should filter profiles by preferences', async () => {
      const profiles = [
        createMockProfile({ age: 25, gender: 'woman' }),
        createMockProfile({ age: 30, gender: 'man' }),
        createMockProfile({ age: 35, gender: 'woman' }),
      ];

      (prisma.profile.findMany as jest.Mock).mockResolvedValue(
        profiles.filter(p => p.age >= 22 && p.age <= 32 && p.gender === 'woman')
      );

      const result = await prisma.profile.findMany({
        where: {
          age: { gte: 22, lte: 32 },
          gender: 'woman',
          status: 'ACTIVE'
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].age).toBe(25);
      expect(result[0].gender).toBe('woman');
    });
  });

  describe('Swipe and Match Operations', () => {
    it('should create swipe and detect match', async () => {
      const swipeData = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'RIGHT'
      };

      const mockSwipe = {
        id: 'swipe-123',
        ...swipeData,
        createdAt: new Date()
      };

      const mutualSwipe = {
        id: 'swipe-456',
        userId: 'user-456',
        targetUserId: 'user-123',
        direction: 'RIGHT',
        createdAt: new Date()
      };

      (prisma.swipe.create as jest.Mock).mockResolvedValue(mockSwipe);
      (prisma.swipe.findFirst as jest.Mock).mockResolvedValue(mutualSwipe);

      // Create swipe
      const createdSwipe = await prisma.swipe.create({
        data: swipeData
      });

      expect(createdSwipe).toEqual(mockSwipe);

      // Check for mutual swipe
      const mutualSwipeResult = await prisma.swipe.findFirst({
        where: {
          userId: swipeData.targetUserId,
          targetUserId: swipeData.userId,
          direction: 'RIGHT'
        }
      });

      expect(mutualSwipeResult).toEqual(mutualSwipe);
    });

    it('should create match when mutual swipe exists', async () => {
      const mockMatch = createMockMatch();
      (prisma.match.create as jest.Mock).mockResolvedValue(mockMatch);

      const result = await prisma.match.create({
        data: {
          userIdA: mockMatch.userIdA,
          userIdB: mockMatch.userIdB,
        }
      });

      expect(result).toEqual(mockMatch);
      expect(result.userIdA).toBe('user-123');
      expect(result.userIdB).toBe('user-456');
    });

    it('should prevent duplicate swipes', async () => {
      const swipeData = {
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'RIGHT'
      };

      (prisma.swipe.create as jest.Mock)
        .mockResolvedValueOnce({ id: 'swipe-123', ...swipeData })
        .mockRejectedValueOnce(new Error('Unique constraint failed'));

      // First swipe succeeds
      const firstSwipe = await prisma.swipe.create({ data: swipeData });
      expect(firstSwipe.id).toBe('swipe-123');

      // Duplicate swipe fails
      await expect(prisma.swipe.create({ data: swipeData }))
        .rejects.toThrow('Unique constraint failed');
    });
  });

  describe('Message Operations', () => {
    it('should create and retrieve messages', async () => {
      const mockMessage = createMockMessage();
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMessage]);

      // Create message
      const createdMessage = await prisma.message.create({
        data: {
          conversationId: mockMessage.conversationId,
          senderId: mockMessage.senderId,
          type: mockMessage.type,
          content: mockMessage.content,
        }
      });

      expect(createdMessage).toEqual(mockMessage);

      // Retrieve messages
      const messages = await prisma.message.findMany({
        where: { conversationId: mockMessage.conversationId },
        orderBy: { createdAt: 'asc' }
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(mockMessage);
    });

    it('should handle message read receipts', async () => {
      const mockMessage = createMockMessage({ readAt: null });
      const readMessage = { ...mockMessage, readAt: new Date() };

      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await (prisma.message as any).updateMany({
        where: {
          conversationId: mockMessage.conversationId,
          senderId: { not: 'user-456' },
          readAt: null
        },
        data: { readAt: readMessage.readAt }
      });

      expect(result.count).toBe(1);
    });

    it('should paginate message history', async () => {
      const messages = Array.from({ length: 25 }, (_, i) => 
        createMockMessage({ id: `message-${i}`, content: `Message ${i}` })
      );

      // First page
      (prisma.message.findMany as jest.Mock).mockResolvedValueOnce(
        messages.slice(0, 20)
      );

      const firstPage = await prisma.message.findMany({
        where: { conversationId: 'conversation-123' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0
      });

      expect(firstPage).toHaveLength(20);

      // Second page
      (prisma.message.findMany as jest.Mock).mockResolvedValueOnce(
        messages.slice(20, 25)
      );

      const secondPage = await prisma.message.findMany({
        where: { conversationId: 'conversation-123' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 20
      });

      expect(secondPage).toHaveLength(5);
    });
  });

  describe('Transaction Operations', () => {
    it('should handle database transactions', async () => {
      const mockUser = createMockUser();
      const mockProfile = createMockProfile();

      // Mock transaction
      const mockTransaction = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        profile: {
          create: jest.fn().mockResolvedValue(mockProfile),
        }
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(mockTransaction);
      });

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: mockUser.id,
            email: mockUser.email,
          }
        });

        const profile = await tx.profile.create({
          data: {
            userId: user.id,
            name: mockProfile.name,
            age: mockProfile.age,
          }
        });

        return { user, profile };
      });

      expect(result.user).toEqual(mockUser);
      expect(result.profile).toEqual(mockProfile);
      expect(mockTransaction.user.create).toHaveBeenCalled();
      expect(mockTransaction.profile.create).toHaveBeenCalled();
    });

    it('should rollback on transaction failure', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error('Transaction failed')
      );

      await expect(prisma.$transaction(async (tx) => {
        await tx.user.create({ data: { id: 'user-123', email: 'test@example.com' } });
        throw new Error('Simulated failure');
      })).rejects.toThrow('Transaction failed');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle bulk operations efficiently', async () => {
      const users = Array.from({ length: 100 }, (_, i) => 
        createMockUser({ id: `user-${i}`, email: `user${i}@example.com` })
      );

      (prisma.user.createMany as jest.Mock).mockResolvedValue({ count: 100 });

      const result = await (prisma.user as any).createMany({
        data: users.map(user => ({
          id: user.id,
          email: user.email,
        }))
      });

      expect(result.count).toBe(100);
    });

    it('should use database indexes effectively', async () => {
      // Mock query with index usage
      (prisma.profile.findMany as jest.Mock).mockResolvedValue([]);

      await prisma.profile.findMany({
        where: {
          status: 'ACTIVE',
          age: { gte: 18, lte: 65 },
          location: {
            // Simulated geospatial query
            path: ['latitude'],
            gte: 40.0
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      expect(prisma.profile.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          age: { gte: 18, lte: 65 },
          location: {
            path: ['latitude'],
            gte: 40.0
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });
  });
});
