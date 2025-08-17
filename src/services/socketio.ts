import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Session } from '../auth/supertokens';
import { PrismaClient } from '@prisma/client';

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
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
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
        
        console.log(`✅ Socket authenticated for user: ${socket.userId}`);
        next();
      } catch (error) {
        console.error('❌ Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 User connected: ${socket.userId}`);

      // Join user to their personal room for notifications
      socket.join(`user:${socket.userId}`);

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

          // Send push notification to the other user
          const otherUserId = conversation.match.userIdA === socket.userId 
            ? conversation.match.userIdB 
            : conversation.match.userIdA;

          this.io.to(`user:${otherUserId}`).emit('new_message_notification', {
            conversationId,
            senderId: socket.userId,
            preview: content?.substring(0, 100) || 'Media message',
          });

          console.log(`💬 Message sent in conversation ${conversationId}`);
        } catch (error) {
          console.error('❌ Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
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

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.userId}`);
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
}

export let socketService: SocketIOService;
