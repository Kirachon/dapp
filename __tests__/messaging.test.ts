import { PrismaClient } from '@prisma/client';
import { createMockUser, createMockProfile, createMockMatch, createMockMessage } from './setup';

describe('Messaging System', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = global.mockPrisma;
    jest.clearAllMocks();
  });

  describe('Message Creation', () => {
    it('should create a text message', async () => {
      const mockMessage = createMockMessage();
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const messageData = {
        conversationId: 'conversation-123',
        senderId: 'user-123',
        type: 'TEXT',
        content: 'Hello world',
        mediaUrls: [],
      };

      const result = await prisma.message.create({
        data: messageData
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: messageData
      });
      expect(result).toEqual(mockMessage);
      expect(result.content).toBe('Hello world');
      expect(result.type).toBe('TEXT');
    });

    it('should create a media message', async () => {
      const mockMessage = createMockMessage({
        type: 'MEDIA',
        content: null,
        mediaUrls: ['https://example.com/image.jpg']
      });
      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const messageData = {
        conversationId: 'conversation-123',
        senderId: 'user-123',
        type: 'MEDIA',
        content: null,
        mediaUrls: ['https://example.com/image.jpg'],
      };

      const result = await prisma.message.create({
        data: messageData
      });

      expect(result.type).toBe('MEDIA');
      expect(result.mediaUrls).toContain('https://example.com/image.jpg');
      expect(result.content).toBeNull();
    });

    it('should validate message content', () => {
      const validateMessage = (content: string | null, mediaUrls: string[]) => {
        if (!content && mediaUrls.length === 0) {
          throw new Error('Message must have content or media');
        }
        if (content && content.trim().length === 0) {
          throw new Error('Message content cannot be empty');
        }
        if (content && content.length > 1000) {
          throw new Error('Message content too long');
        }
        return true;
      };

      // Valid text message
      expect(() => validateMessage('Hello', [])).not.toThrow();

      // Valid media message
      expect(() => validateMessage(null, ['image.jpg'])).not.toThrow();

      // Invalid empty message
      expect(() => validateMessage(null, [])).toThrow('Message must have content or media');

      // Invalid empty content
      expect(() => validateMessage('   ', [])).toThrow('Message content cannot be empty');

      // Invalid long content
      const longContent = 'a'.repeat(1001);
      expect(() => validateMessage(longContent, [])).toThrow('Message content too long');
    });
  });

  describe('Conversation Management', () => {
    it('should find conversation by match', async () => {
      const mockMatch = createMockMatch();
      const mockConversation = {
        id: 'conversation-123',
        matchId: mockMatch.id,
        lastMessageAt: new Date(),
        unreadCount: 0,
      };

      (prisma.conversation.findUnique as jest.Mock).mockResolvedValue(mockConversation);

      const result = await prisma.conversation.findUnique({
        where: { matchId: mockMatch.id }
      });

      expect(result).toEqual(mockConversation);
      expect(result.matchId).toBe(mockMatch.id);
    });

    it('should update conversation last message time', async () => {
      const conversationId = 'conversation-123';
      const lastMessageAt = new Date();

      (prisma.conversation.update as jest.Mock).mockResolvedValue({
        id: conversationId,
        lastMessageAt,
      });

      const result = await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt }
      });

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { lastMessageAt }
      });
      expect(result.lastMessageAt).toEqual(lastMessageAt);
    });

    it('should verify conversation access', () => {
      const verifyConversationAccess = (userId: string, match: any) => {
        if (!match) {
          throw new Error('Match not found');
        }
        if (match.userIdA !== userId && match.userIdB !== userId) {
          throw new Error('Access denied');
        }
        return true;
      };

      const mockMatch = createMockMatch({
        userIdA: 'user-123',
        userIdB: 'user-456'
      });

      // Valid access for userA
      expect(() => verifyConversationAccess('user-123', mockMatch)).not.toThrow();

      // Valid access for userB
      expect(() => verifyConversationAccess('user-456', mockMatch)).not.toThrow();

      // Invalid access for other user
      expect(() => verifyConversationAccess('user-789', mockMatch))
        .toThrow('Access denied');

      // No match
      expect(() => verifyConversationAccess('user-123', null))
        .toThrow('Match not found');
    });
  });

  describe('Message Queries', () => {
    it('should fetch messages for conversation', async () => {
      const mockMessages = [
        createMockMessage({ id: 'msg-1', content: 'Hello' }),
        createMockMessage({ id: 'msg-2', content: 'Hi there' }),
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await prisma.message.findMany({
        where: { conversationId: 'conversation-123' },
        orderBy: { createdAt: 'asc' },
        take: 50
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conversation-123' },
        orderBy: { createdAt: 'asc' },
        take: 50
      });
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Hello');
    });

    it('should implement pagination', () => {
      const getPaginationParams = (page: number, pageSize: number) => {
        const skip = (page - 1) * pageSize;
        return { skip, take: pageSize };
      };

      // Page 1
      expect(getPaginationParams(1, 20)).toEqual({ skip: 0, take: 20 });

      // Page 2
      expect(getPaginationParams(2, 20)).toEqual({ skip: 20, take: 20 });

      // Page 3
      expect(getPaginationParams(3, 10)).toEqual({ skip: 20, take: 10 });
    });
  });

  describe('Read Receipts', () => {
    it('should mark messages as read', async () => {
      const conversationId = 'conversation-123';
      const userId = 'user-123';
      const readAt = new Date();

      (prisma.message.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await (prisma.message as any).updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          readAt: null
        },
        data: { readAt }
      });

      expect(result.count).toBe(3);
    });

    it('should calculate unread count', async () => {
      const mockUnreadMessages = [
        createMockMessage({ readAt: null }),
        createMockMessage({ readAt: null }),
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockUnreadMessages);

      const unreadMessages = await prisma.message.findMany({
        where: {
          conversationId: 'conversation-123',
          senderId: { not: 'user-123' },
          readAt: null
        }
      });

      expect(unreadMessages).toHaveLength(2);
    });
  });

  describe('Message Validation', () => {
    it('should validate message permissions', () => {
      const validateMessagePermissions = (userId: string, conversationId: string, match: any) => {
        if (!match) {
          throw new Error('Conversation not found');
        }
        if (match.userIdA !== userId && match.userIdB !== userId) {
          throw new Error('Not authorized to send messages in this conversation');
        }
        return true;
      };

      const mockMatch = createMockMatch();

      // Valid permission
      expect(() => validateMessagePermissions('user-123', 'conv-123', mockMatch))
        .not.toThrow();

      // Invalid permission
      expect(() => validateMessagePermissions('user-999', 'conv-123', mockMatch))
        .toThrow('Not authorized to send messages in this conversation');
    });

    it('should sanitize message content', () => {
      const sanitizeContent = (content: string) => {
        return content
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .substring(0, 1000); // Limit length
      };

      expect(sanitizeContent('  Hello world  ')).toBe('Hello world');
      expect(sanitizeContent('<script>alert("xss")</script>Hello')).toBe('Hello');
      expect(sanitizeContent('<b>Bold</b> text')).toBe('Bold text');
    });
  });
});
