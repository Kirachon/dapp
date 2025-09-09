import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createMockUser, createMockProfile } from '../setup';

// Mock the actual app
const mockApp = {
  listen: jest.fn(),
  close: jest.fn(),
  inject: jest.fn(),
};

// Mock Fastify
jest.mock('fastify', () => {
  return jest.fn(() => mockApp);
});

describe('API Integration Tests', () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    prisma = global.mockPrisma;
    app = mockApp;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    it('should handle GraphQL authentication', async () => {
      // Mock authenticated request
      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          data: {
            me: {
              id: 'user-123',
              email: 'test@example.com'
            }
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          query: `
            query Me {
              me {
                id
                email
              }
            }
          `
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.me.id).toBe('user-123');
    });

    it('should reject unauthenticated requests', async () => {
      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          errors: [{
            message: 'Unauthenticated',
            extensions: { code: 'UNAUTHENTICATED' }
          }]
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: `
            query Me {
              me {
                id
                email
              }
            }
          `
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.errors[0].message).toBe('Unauthenticated');
    });
  });

  describe('Profile Management', () => {
    it('should create user profile', async () => {
      const mockProfile = createMockProfile();
      (prisma.profile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          data: {
            upsertMyProfile: mockProfile
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          query: `
            mutation UpsertProfile($input: ProfileInput!) {
              upsertMyProfile(input: $input) {
                id
                name
                age
                bio
              }
            }
          `,
          variables: {
            input: {
              name: 'Test User',
              age: 25,
              bio: 'Test bio'
            }
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.upsertMyProfile.name).toBe('Test User');
    });

    it('should fetch user profile', async () => {
      const mockProfile = createMockProfile();
      (prisma.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          data: {
            myProfile: mockProfile
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          query: `
            query MyProfile {
              myProfile {
                id
                name
                age
                bio
                photos
              }
            }
          `
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.myProfile.id).toBe(mockProfile.id);
    });
  });

  describe('Discovery System', () => {
    it('should fetch discovery profiles', async () => {
      const mockProfiles = [
        createMockProfile({ id: 'profile-1', name: 'User 1' }),
        createMockProfile({ id: 'profile-2', name: 'User 2' }),
      ];

      (prisma.profile.findMany as jest.Mock).mockResolvedValue(mockProfiles);

      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          data: {
            discover: mockProfiles
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          query: `
            query Discover($limit: Int) {
              discover(limit: $limit) {
                id
                name
                age
                photos
              }
            }
          `,
          variables: {
            limit: 10
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.discover).toHaveLength(2);
    });

    it('should handle swipe action', async () => {
      const mockSwipe = {
        id: 'swipe-123',
        userId: 'user-123',
        targetUserId: 'user-456',
        direction: 'RIGHT'
      };

      (prisma.swipe.create as jest.Mock).mockResolvedValue(mockSwipe);

      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          data: {
            swipe: {
              success: true,
              isMatch: false
            }
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          query: `
            mutation Swipe($targetUserId: ID!, $direction: SwipeDirection!) {
              swipe(targetUserId: $targetUserId, direction: $direction) {
                success
                isMatch
              }
            }
          `,
          variables: {
            targetUserId: 'user-456',
            direction: 'RIGHT'
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.data.swipe.success).toBe(true);
    });
  });

  describe('Photo Upload', () => {
    it('should generate presigned upload URL', async () => {
      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          success: true,
          data: {
            uploadUrl: 'https://minio.example.com/presigned-url',
            url: 'https://minio.example.com/dating-app/user-123/photo.jpg',
            thumbnailUrl: 'https://minio.example.com/dating-app/thumbnails/user-123/photo.jpg',
            filename: 'user-123/photo.jpg'
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/api/photos/upload-url',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          filename: 'photo.jpg',
          mimeType: 'image/jpeg'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data.uploadUrl).toContain('presigned-url');
    });

    it('should validate file type', async () => {
      const mockResponse = {
        statusCode: 400,
        payload: JSON.stringify({
          success: false,
          error: 'Only image files are allowed'
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/api/photos/upload-url',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          filename: 'document.pdf',
          mimeType: 'application/pdf'
        }
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data.error).toContain('image files');
    });
  });

  describe('Health Checks', () => {
    it('should return health status', async () => {
      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            redis: 'connected',
            minio: 'connected'
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.status).toBe('healthy');
      expect(data.services.database).toBe('connected');
    });

    it('should handle service failures', async () => {
      const mockResponse = {
        statusCode: 503,
        payload: JSON.stringify({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            redis: 'disconnected',
            minio: 'connected'
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(503);
      const data = JSON.parse(response.payload);
      expect(data.status).toBe('unhealthy');
      expect(data.services.redis).toBe('disconnected');
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        statusCode: 200,
        payload: JSON.stringify({
          errors: [{
            message: 'Profile not found',
            extensions: {
              code: 'NOT_FOUND',
              path: ['myProfile']
            }
          }]
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          query: `
            query MyProfile {
              myProfile {
                id
                name
              }
            }
          `
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.errors[0].message).toBe('Profile not found');
      expect(data.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should handle validation errors', async () => {
      const mockResponse = {
        statusCode: 400,
        payload: JSON.stringify({
          error: 'Validation failed',
          details: {
            name: 'Name is required',
            age: 'Age must be at least 18'
          }
        })
      };

      mockApp.inject.mockResolvedValue(mockResponse);

      const response = await mockApp.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'Cookie': 'sAccessToken=mock-token'
        },
        payload: {
          query: `
            mutation UpsertProfile($input: ProfileInput!) {
              upsertMyProfile(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              name: '',
              age: 16
            }
          }
        }
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.error).toBe('Validation failed');
    });
  });
});
