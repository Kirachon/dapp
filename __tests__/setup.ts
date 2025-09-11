import { PrismaClient } from '@prisma/client';

// Mock Prisma for tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    match: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    swipe: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    message: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $disconnect: jest.fn(),
    $connect: jest.fn(),
    $transaction: jest.fn(),
  })),
}));

// Mock SuperTokens
jest.mock('supertokens-node', () => ({
  init: jest.fn(),
  getUser: jest.fn(),
}));

jest.mock('supertokens-node/recipe/session', () => ({
  init: jest.fn(),
  getSession: jest.fn(),
  createNewSession: jest.fn(),
}));

jest.mock('supertokens-node/recipe/emailpassword', () => ({
  init: jest.fn(),
  signUp: jest.fn(),
  signIn: jest.fn(),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

// Mock Socket.IO
jest.mock('socket.io', () => ({
  Server: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
  })),
}));

// Global test utilities
declare global {
  var mockPrisma: PrismaClient;
}

(global as any).mockPrisma = new PrismaClient();

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastActiveAt: new Date(),
  ...overrides,
});

export const createMockProfile = (overrides = {}) => ({
  id: 'profile-123',
  userId: 'user-123',
  name: 'Test User',
  age: 25,
  gender: 'woman',
  orientation: 'straight',
  bio: 'Test bio',
  photos: ['photo1.jpg', 'photo2.jpg'],
  interests: ['music', 'travel'],
  job: 'Software Engineer',
  education: 'University',
  lifestyle: {
    drinking: 'socially',
    smoking: 'never',
    exercise: 'regularly',
  },
  prompts: [{ question: 'My ideal Sunday involves...', answer: 'Relaxing and coding' }],
  location: {
    latitude: 40.7128,
    longitude: -74.006,
  },
  preferences: {
    minAge: 22,
    maxAge: 35,
    distanceKm: 50,
    showMe: 'man',
  },
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockMatch = (overrides = {}) => ({
  id: 'match-123',
  userIdA: 'user-123',
  userIdB: 'user-456',
  createdAt: new Date(),
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  id: 'message-123',
  conversationId: 'conversation-123',
  senderId: 'user-123',
  type: 'TEXT',
  content: 'Hello world',
  mediaUrls: [],
  createdAt: new Date(),
  readAt: null,
  ...overrides,
});

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup any resources
});
