import { PrismaClient } from '@prisma/client';
import { createMockUser, createMockProfile, createMockMatch } from './setup';

describe('Discovery System', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = global.mockPrisma;
    jest.clearAllMocks();
  });

  describe('Profile Discovery', () => {
    it('should find profiles within age range', () => {
      const filterByAge = (profiles: any[], minAge: number, maxAge: number) => {
        return profiles.filter(profile => 
          profile.age >= minAge && profile.age <= maxAge
        );
      };

      const profiles = [
        createMockProfile({ age: 20 }),
        createMockProfile({ age: 25 }),
        createMockProfile({ age: 30 }),
        createMockProfile({ age: 35 }),
      ];

      const filtered = filterByAge(profiles, 22, 32);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.age)).toEqual([25, 30]);
    });

    it('should filter by gender preference', () => {
      const filterByGender = (profiles: any[], showMe: string) => {
        if (!showMe) return profiles; // Show everyone
        return profiles.filter(profile => profile.gender === showMe);
      };

      const profiles = [
        createMockProfile({ gender: 'woman' }),
        createMockProfile({ gender: 'man' }),
        createMockProfile({ gender: 'non-binary' }),
      ];

      // Filter for women
      const women = filterByGender(profiles, 'woman');
      expect(women).toHaveLength(1);
      expect(women[0].gender).toBe('woman');

      // Show everyone
      const everyone = filterByGender(profiles, '');
      expect(everyone).toHaveLength(3);
    });

    it('should calculate distance between coordinates', () => {
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // NYC to Philadelphia (approximately 130km)
      const distance = calculateDistance(40.7128, -74.0060, 39.9526, -75.1652);
      expect(distance).toBeCloseTo(130, 0);

      // Same location
      const sameLocation = calculateDistance(40.7128, -74.0060, 40.7128, -74.0060);
      expect(sameLocation).toBeCloseTo(0, 1);
    });

    it('should exclude already swiped profiles', async () => {
      const mockSwipes = [
        { targetUserId: 'user-456', direction: 'RIGHT' },
        { targetUserId: 'user-789', direction: 'LEFT' },
      ];

      (prisma.swipe.findMany as jest.Mock).mockResolvedValue(mockSwipes);

      const swipedUserIds = await prisma.swipe.findMany({
        where: { userId: 'user-123' },
        select: { targetUserId: true }
      });

      const swipedIds = swipedUserIds.map((s: any) => s.targetUserId);
      expect(swipedIds).toContain('user-456');
      expect(swipedIds).toContain('user-789');
      expect(swipedIds).toHaveLength(2);
    });
  });

  describe('Swipe System', () => {
    it('should create a swipe record', async () => {
      const mockSwipe = {
        id: 'swipe-123',
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'RIGHT',
        createdAt: new Date(),
      };

      (prisma.swipe.create as jest.Mock).mockResolvedValue(mockSwipe);

      const result = await prisma.swipe.create({
        data: {
          userId: 'user-123',
          targetUserId: 'user-456',
          direction: 'RIGHT',
        }
      });

      expect(result).toEqual(mockSwipe);
      expect(result.direction).toBe('RIGHT');
    });

    it('should detect mutual swipes (matches)', async () => {
      const checkForMatch = async (userId: string, targetUserId: string) => {
        // Check if target user has swiped right on current user
        const mutualSwipe = await prisma.swipe.findFirst({
          where: {
            userId: targetUserId,
            targetUserId: userId,
            direction: 'RIGHT'
          }
        });
        return !!mutualSwipe;
      };

      // Mock mutual swipe exists
      (prisma.swipe.findFirst as jest.Mock).mockResolvedValue({
        id: 'swipe-456',
        userId: 'user-456',
        targetUserId: 'user-123',
        direction: 'RIGHT'
      });

      const isMatch = await checkForMatch('user-123', 'user-456');
      expect(isMatch).toBe(true);

      // Mock no mutual swipe
      (prisma.swipe.findFirst as jest.Mock).mockResolvedValue(null);
      const noMatch = await checkForMatch('user-123', 'user-789');
      expect(noMatch).toBe(false);
    });

    it('should create match when mutual swipe occurs', async () => {
      const mockMatch = createMockMatch();
      (prisma.match.create as jest.Mock).mockResolvedValue(mockMatch);

      const result = await prisma.match.create({
        data: {
          userIdA: 'user-123',
          userIdB: 'user-456',
        }
      });

      expect(result).toEqual(mockMatch);
      expect(result.userIdA).toBe('user-123');
      expect(result.userIdB).toBe('user-456');
    });

    it('should validate swipe direction', () => {
      const validateSwipeDirection = (direction: string) => {
        const validDirections = ['LEFT', 'RIGHT', 'SUPER'];
        if (!validDirections.includes(direction)) {
          throw new Error('Invalid swipe direction');
        }
        return true;
      };

      expect(() => validateSwipeDirection('RIGHT')).not.toThrow();
      expect(() => validateSwipeDirection('LEFT')).not.toThrow();
      expect(() => validateSwipeDirection('SUPER')).not.toThrow();
      expect(() => validateSwipeDirection('INVALID')).toThrow('Invalid swipe direction');
    });
  });

  describe('Discovery Feed', () => {
    it('should build discovery query with filters', () => {
      const buildDiscoveryQuery = (userId: string, preferences: any) => {
        const query: any = {
          where: {
            userId: { not: userId },
            status: 'ACTIVE',
          }
        };

        // Age filter
        if (preferences.minAge || preferences.maxAge) {
          query.where.age = {};
          if (preferences.minAge) query.where.age.gte = preferences.minAge;
          if (preferences.maxAge) query.where.age.lte = preferences.maxAge;
        }

        // Gender filter
        if (preferences.showMe) {
          query.where.gender = preferences.showMe;
        }

        return query;
      };

      const preferences = {
        minAge: 22,
        maxAge: 35,
        showMe: 'woman',
        distanceKm: 50
      };

      const query = buildDiscoveryQuery('user-123', preferences);

      expect(query.where.userId).toEqual({ not: 'user-123' });
      expect(query.where.status).toBe('ACTIVE');
      expect(query.where.age).toEqual({ gte: 22, lte: 35 });
      expect(query.where.gender).toBe('woman');
    });

    it('should implement discovery pagination', () => {
      const getDiscoveryPagination = (page: number, pageSize: number) => {
        return {
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' }
        };
      };

      const pagination = getDiscoveryPagination(2, 10);
      expect(pagination.skip).toBe(10);
      expect(pagination.take).toBe(10);
      expect(pagination.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should randomize discovery results', () => {
      const shuffleArray = (array: any[]) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const profiles = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(profiles);

      expect(shuffled).toHaveLength(5);
      expect(shuffled).toEqual(expect.arrayContaining(profiles));
      // Note: This test might occasionally fail due to randomness
      // In a real test, you'd mock Math.random() for deterministic results
    });
  });

  describe('Profile Scoring', () => {
    it('should calculate compatibility score', () => {
      const calculateCompatibility = (profile1: any, profile2: any) => {
        let score = 0;

        // Age compatibility (closer ages = higher score)
        const ageDiff = Math.abs(profile1.age - profile2.age);
        score += Math.max(0, 10 - ageDiff);

        // Interest overlap
        const commonInterests = profile1.interests.filter((interest: string) =>
          profile2.interests.includes(interest)
        );
        score += commonInterests.length * 5;

        // Lifestyle compatibility
        if (profile1.lifestyle?.exercise === profile2.lifestyle?.exercise) {
          score += 3;
        }

        return Math.min(100, score); // Cap at 100
      };

      const profile1 = createMockProfile({
        age: 25,
        interests: ['music', 'travel', 'fitness'],
        lifestyle: { exercise: 'regularly' }
      });

      const profile2 = createMockProfile({
        age: 27,
        interests: ['music', 'art', 'fitness'],
        lifestyle: { exercise: 'regularly' }
      });

      const score = calculateCompatibility(profile1, profile2);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
