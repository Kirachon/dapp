import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Session } from '../auth/supertokens';
import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

interface TypingData {
  conversationId: string;
  isTyping: boolean;
}

interface JoinRoomData {
  conversationId: string;
}

interface MessageData {
  conversationId: string;
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'VIDEO';
  mediaUrls?: string[];
}

export class SocketIOService {
  private io: SocketIOServer;
  private redisClient: any;
  private redisSubscriber: any;
  private connectedUsers: Set<string> = new Set();

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.initializeRedis();
    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('Socket.IO service initialized', {
      operation: 'socketio_init',
      metadata: {
        cors_origin: process.env.FRONTEND_URL || "http://localhost:3000",
        transports: ['websocket', 'polling']
      }
    });
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
      console.log(`🔌 Socket.IO Redis URL: ${redisUrl}`);
      
      this.redisClient = createClient({ url: redisUrl });
      this.redisSubscriber = this.redisClient.duplicate();

      await this.redisClient.connect();
      await this.redisSubscriber.connect();

      // Set up Redis adapter for Socket.IO
      this.io.adapter(createAdapter(this.redisClient, this.redisSubscriber));
      
      console.log('✅ Socket.IO Redis adapter initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Redis for Socket.IO:', error);
    }
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        // Check if this is a test connection (for development/testing)
        const isTestConnection = socket.handshake.query?.test === 'true' ||
                                socket.handshake.headers?.origin?.includes('localhost:3000');

        if (isTestConnection && process.env.NODE_ENV !== 'production') {
          console.log('🧪 Allowing test Socket.IO connection without authentication');
          socket.userId = 'test-user-socket';
          socket.userEmail = 'test@socket.io';
          return next();
        }

        // Extract session from socket handshake
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
          return next(new Error('No cookies provided'));
        }

        // Create a mock request object for SuperTokens
        const mockRequest = {
          headers: { cookie: cookies },
          method: 'GET',
          url: '/',
        };

        const session = await Session.getSession(mockRequest as any, undefined, {
          sessionRequired: false,
        });

        if (!session) {
          return next(new Error('Authentication required'));
        }

        socket.userId = session.getUserId();
        socket.userEmail = session.getAccessTokenPayload().email;

        logger.info('Socket authenticated', {
          operation: 'socket_auth',
          userId: socket.userId,
          metadata: { socketId: socket.id }
        });
        next();
      } catch (error) {
        logger.error('Socket authentication failed', {
          operation: 'socket_auth',
          metadata: { socketId: socket.id }
        }, error as Error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('User connected via Socket.IO', {
        operation: 'socket_connect',
        userId: socket.userId,
        metadata: { socketId: socket.id }
      });

      // Track connected users for monitoring
      this.connectedUsers.add(socket.userId!);
      this.recordConnectionMetrics(true);

      // Join user to their personal room for notifications
      socket.join(`user:${socket.userId}`);

      // Update user's online status and last active time
      this.updateUserPresence(socket.userId!, true);

      // Handle joining conversation rooms
      socket.on('join_conversation', async (data: JoinRoomData) => {
        try {
          const { conversationId } = data;
          
          // Verify user has access to this conversation
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true },
          });

          if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          const hasAccess = conversation.match.userIdA === socket.userId || 
                           conversation.match.userIdB === socket.userId;

          if (!hasAccess) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          socket.join(`conversation:${conversationId}`);
          socket.emit('joined_conversation', { conversationId });
          
          console.log(`👥 User ${socket.userId} joined conversation ${conversationId}`);
        } catch (error) {
          console.error('❌ Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle leaving conversation rooms
      socket.on('leave_conversation', (data: JoinRoomData) => {
        const { conversationId } = data;
        socket.leave(`conversation:${conversationId}`);
        socket.emit('left_conversation', { conversationId });
        console.log(`👋 User ${socket.userId} left conversation ${conversationId}`);
      });

      // Handle typing indicators
      socket.on('typing', async (data: TypingData) => {
        try {
          const { conversationId, isTyping } = data;
          
          // Verify access to conversation
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true },
          });

          if (!conversation) return;

          const hasAccess = conversation.match.userIdA === socket.userId || 
                           conversation.match.userIdB === socket.userId;
          if (!hasAccess) return;

          // Broadcast typing status to other users in the conversation
          socket.to(`conversation:${conversationId}`).emit('user_typing', {
            userId: socket.userId,
            conversationId,
            isTyping,
          });

          // Set typing timeout
          if (isTyping) {
            setTimeout(() => {
              socket.to(`conversation:${conversationId}`).emit('user_typing', {
                userId: socket.userId,
                conversationId,
                isTyping: false,
              });
            }, 3000); // Stop typing after 3 seconds
          }
        } catch (error) {
          console.error('❌ Error handling typing:', error);
        }
      });

      // Handle real-time message sending
      socket.on('send_message', async (data: MessageData) => {
        try {
          const { conversationId, content, type = 'TEXT', mediaUrls = [] } = data;
          
          // Verify access and create message
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true },
          });

          if (!conversation) {
            socket.emit('error', { message: 'Conversation not found' });
            return;
          }

          const hasAccess = conversation.match.userIdA === socket.userId || 
                           conversation.match.userIdB === socket.userId;
          if (!hasAccess) {
            socket.emit('error', { message: 'Access denied' });
            return;
          }

          // Create the message
          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: socket.userId!,
              type,
              content: content?.trim() || null,
              mediaUrls,
            },
          });

          // Update conversation last message time
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          });

          // Broadcast message to all users in the conversation
          this.io.to(`conversation:${conversationId}`).emit('new_message', {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            type: message.type,
            content: message.content,
            mediaUrls: message.mediaUrls,
            createdAt: message.createdAt,
            readAt: message.readAt,
          });

          // Record message metrics
          this.recordMessageMetrics();

          // Send confirmation to sender
          socket.emit('message_sent', {
            messageId: message.id,
            conversationId: message.conversationId,
            timestamp: message.createdAt,
          });

          // Send push notification to the other user
          const otherUserId = conversation.match.userIdA === socket.userId
            ? conversation.match.userIdB
            : conversation.match.userIdA;

          this.io.to(`user:${otherUserId}`).emit('new_message_notification', {
            conversationId,
            senderId: socket.userId,
            preview: content?.substring(0, 100) || 'Media message',
          });

          logger.info('Message sent via Socket.IO', {
            operation: 'socket_message',
            userId: socket.userId,
            metadata: {
              conversationId,
              messageId: message.id,
              type: message.type
            }
          });

          console.log(`💬 Message sent in conversation ${conversationId} (ID: ${message.id})`);
        } catch (error) {
          console.error('❌ Error sending message:', error);

          // Send specific error feedback to sender
          socket.emit('message_error', {
            conversationId: data.conversationId,
            message: error instanceof Error ? error.message : 'Failed to send message',
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Handle message read receipts
      socket.on('mark_read', async (data: { conversationId: string; messageId?: string }) => {
        try {
          const { conversationId, messageId } = data;
          
          // Verify access
          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true },
          });

          if (!conversation) return;

          const hasAccess = conversation.match.userIdA === socket.userId || 
                           conversation.match.userIdB === socket.userId;
          if (!hasAccess) return;

          // Mark messages as read
          if (messageId) {
            // Mark specific message as read
            await prisma.message.update({
              where: { id: messageId },
              data: { readAt: new Date() },
            });
          } else {
            // Mark all unread messages in conversation as read
            await prisma.message.updateMany({
              where: {
                conversationId,
                senderId: { not: socket.userId },
                readAt: null,
              },
              data: { readAt: new Date() },
            });
          }

          // Broadcast read receipt
          socket.to(`conversation:${conversationId}`).emit('messages_read', {
            conversationId,
            readBy: socket.userId,
            messageId,
            readAt: new Date(),
          });
        } catch (error) {
          console.error('❌ Error marking messages as read:', error);
        }
      });

      // Handle test messages (for development/testing)
      socket.on('test-message', (data: { message: string; timestamp: string; sender?: string }) => {
        console.log(`🧪 Test message received from ${socket.userId}:`, data);

        // Broadcast test message to all connected clients
        this.io.emit('test-message', {
          message: data.message,
          timestamp: data.timestamp,
          sender: data.sender || socket.userId,
          socketId: socket.id
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info('User disconnected from Socket.IO', {
          operation: 'socket_disconnect',
          userId: socket.userId,
          metadata: { socketId: socket.id }
        });

        // Remove from connected users tracking
        this.connectedUsers.delete(socket.userId!);
        this.recordConnectionMetrics(false);

        // Update user's offline status
        this.updateUserPresence(socket.userId!, false);
      });
    });
  }

  // Method to send match notifications
  public async sendMatchNotification(userIdA: string, userIdB: string, matchId: string) {
    const matchData = {
      matchId,
      message: 'You have a new match! 🎉',
      timestamp: new Date(),
    };

    this.io.to(`user:${userIdA}`).emit('new_match', matchData);
    this.io.to(`user:${userIdB}`).emit('new_match', matchData);
    
    console.log(`💕 Match notification sent to users ${userIdA} and ${userIdB}`);
  }

  // Method to get online users count
  public async getOnlineUsersCount(): Promise<number> {
    const sockets = await this.io.fetchSockets();
    return sockets.length;
  }

  // Method to check if user is online
  public async isUserOnline(userId: string): Promise<boolean> {
    const sockets = await this.io.in(`user:${userId}`).fetchSockets();
    return sockets.length > 0;
  }

  // Method to update user presence in database
  private async updateUserPresence(userId: string, isOnline: boolean) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastActiveAt: new Date(),
          // Note: We could add an 'isOnline' field to the User model if needed
        }
      });

      // Broadcast presence update to user's contacts
      this.broadcastPresenceUpdate(userId, isOnline);
    } catch (error) {
      console.error('❌ Error updating user presence:', error);
    }
  }

  // Method to broadcast presence updates to user's contacts
  private async broadcastPresenceUpdate(userId: string, isOnline: boolean) {
    try {
      // Find all conversations this user is part of
      const conversations = await prisma.conversation.findMany({
        where: {
          match: {
            OR: [
              { userIdA: userId },
              { userIdB: userId }
            ]
          }
        },
        include: { match: true }
      });

      // Notify other users in these conversations about presence change
      for (const conversation of conversations) {
        const otherUserId = conversation.match.userIdA === userId
          ? conversation.match.userIdB
          : conversation.match.userIdA;

        this.io.to(`user:${otherUserId}`).emit('user_presence_changed', {
          userId,
          isOnline,
          lastSeen: new Date()
        });
      }
    } catch (error) {
      console.error('❌ Error broadcasting presence update:', error);
    }
  }

  // Broadcast match notification
  async broadcastMatchNotification(matchId: string, userIdA: string, userIdB: string) {
    try {
      // Send to both users
      this.io.to(`user:${userIdA}`).emit('new_match', { matchId, otherUserId: userIdB });
      this.io.to(`user:${userIdB}`).emit('new_match', { matchId, otherUserId: userIdA });

      console.log(`🎉 Match notification sent for match ${matchId}`);
    } catch (error) {
      console.error('❌ Failed to broadcast match notification:', error);
    }
  }

  // Verify message persistence and synchronization
  async verifyMessagePersistence(conversationId: string, messageId: string): Promise<boolean> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: { conversation: true }
      });

      if (!message) {
        console.error(`❌ Message ${messageId} not found in database`);
        return false;
      }

      if (message.conversationId !== conversationId) {
        console.error(`❌ Message ${messageId} conversation mismatch`);
        return false;
      }

      console.log(`✅ Message ${messageId} verified in database`);
      return true;
    } catch (error) {
      console.error('❌ Error verifying message persistence:', error);
      return false;
    }
  }

  // Get message synchronization status for a conversation
  async getMessageSyncStatus(conversationId: string, limit: number = 10) {
    try {
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          senderId: true,
          content: true,
          type: true
        }
      });

      return {
        conversationId,
        messageCount: messages.length,
        latestMessage: messages[0] || null,
        messages: messages.reverse(), // Return in chronological order
        syncedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting message sync status', {
        operation: 'message_sync',
        metadata: { conversationId }
      }, error as Error);
      return null;
    }
  }

  // Monitoring methods
  private recordConnectionMetrics(connected: boolean): void {
    const monitoringService = (global as any).monitoringService;
    if (monitoringService) {
      monitoringService.recordConnection(connected);
    }
  }

  private recordMessageMetrics(): void {
    const monitoringService = (global as any).monitoringService;
    if (monitoringService) {
      monitoringService.recordMessage();
    }
  }

  // Get current connection count for monitoring
  getConnectionCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected user IDs for monitoring
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers);
  }
}

export let socketService: SocketIOService;
