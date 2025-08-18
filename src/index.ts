import fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import { ApolloServer } from '@apollo/server';
import { fastifyApolloDrainPlugin, fastifyApolloHandler } from '@as-integrations/fastify';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { createServer } from 'http';
import supertokens, { getUser as stGetUser } from 'supertokens-node';
// Import internal core class to access instance methods in TS
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import STCore from 'supertokens-node/lib/build/supertokens';
import { initSuperTokens, Session, EmailPassword, EmailVerification } from './auth/supertokens';
import { PrismaClient } from '@prisma/client';
// @ts-ignore - Fastify plugin shim from SuperTokens
import { plugin as supertokensPlugin, errorHandler, wrapRequest, wrapResponse } from 'supertokens-node/framework/fastify';
import { photoRoutes } from './routes/photos';
import { SocketIOService, socketService } from './services/socketio';
import { PubSub } from 'graphql-subscriptions';

const prisma = new PrismaClient();
const pubsub = new PubSub();

async function start() {
  initSuperTokens();
// Ensure CORS allows SuperTokens headers
const corsConfig = { origin: true, credentials: true, allowedHeaders: [
  'content-type', ...supertokens.getAllCORSHeaders()
] } as const;

  const server = fastify({ logger: { level: 'info', redact: { paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'], remove: true } }, bodyLimit: 1024 * 1024 } as any);

  // Security & CORS
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for development
  });
  await server.register(cors, corsConfig as any);

  // Enhanced rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
    errorResponseBuilder: (request, context) => ({
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
      retryAfter: Math.round(context.ttl / 1000),
    }),
  });
  await server.register(cookie);
  await server.register(formbody);
  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });
  // SuperTokens plugin (preHandler) and NotFound bridge for /auth/*
  await server.register(supertokensPlugin);
  server.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/auth')) {
      const request = wrapRequest(req as any);
      const response = wrapResponse(reply as any);
      const st = (STCore as any).default.getInstanceOrThrowError();
      try {
        const handled = await st.middleware(request, response, {} as any);
        if (!reply.sent && !handled) return reply.code(404).send({ message: 'Not Found' });
      } catch (err) {
        await st.errorHandler(err, request, response, {} as any);
      }
      return;
    }
    reply.code(404).send({ message: 'Not Found' });
  });
  server.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'Unhandled error');
    // Delegate to ST error handler first
    try { return (errorHandler() as any)(err, req as any, reply as any); } catch {}
    reply.status(500).send({ message: 'Internal Server Error' });
  });
  // Basic metrics endpoint
  server.get('/metrics', async () => {
    const uCount = await prisma.user.count();
    const mCount = await prisma.match.count();
    const cCount = await prisma.conversation.count();
    return { users: uCount, matches: mCount, conversations: cCount, ts: new Date().toISOString() };
  });


  // Debug: print mounted routes (moved to after GraphQL registration)

  // REST health endpoints
  server.get('/health', async () => ({ status: 'ok' }));
  server.get('/ready', async () => ({ status: 'ready' }));

  // Photo upload routes
  await server.register(photoRoutes);

  // GraphQL schema
  const typeDefs = /* GraphQL */ `
    scalar DateTime

    enum SwipeDirection { LEFT RIGHT SUPER }
    enum MatchStatus { ACTIVE UNMATCHED BLOCKED }
    enum ProfileVisibility { PUBLIC PRIVATE MATCHES_ONLY }

    type Query {
      health: String!
      me: Me
      myProfile: Profile
      myPreferences: Preferences
      discoveryFeed(page: Int = 1, pageSize: Int = 20): [Profile!]!
      myMatches(status: MatchStatus, page: Int = 1, pageSize: Int = 20): [MatchView!]!
      myConversations(page: Int = 1, pageSize: Int = 20): [ConversationView!]!
      messages(conversationId: ID!, page: Int = 1, pageSize: Int = 50): [Message!]!
      profile(userId: ID!): Profile
    }

    type Me {
      id: ID!
      email: String!
      roles: [String!]!
      profile: MeProfile
    }

    type MeProfile {
      id: ID!
      name: String!
      isAdmin: Boolean!
    }

    type Profile {
      userId: ID!
      name: String!
      age: Int!
      gender: String
      orientation: String
      bio: String
      interests: [String!]!
      lifestyle: String
      education: String
      photos: [String!]!
      videoIntroUrl: String
      prompts: [String!]!
      visibility: ProfileVisibility!
    }

    input ProfileInput {
      name: String!
      age: Int!
      gender: String
      orientation: String
      bio: String
      interests: [String!]
      lifestyle: String
      education: String
      photos: [String!]
      videoIntroUrl: String
      prompts: [String!]
      visibility: ProfileVisibility
    }

    type Preferences {
      userId: ID!
      minAge: Int!
      maxAge: Int!
      distanceKm: Int!
      showMe: String
    }

    input PreferencesInput {
      minAge: Int
      maxAge: Int
      distanceKm: Int
      showMe: String
    }

    type MatchView {
      id: ID!
      status: MatchStatus!
      createdAt: DateTime!
      otherUser: Profile!
    }

    type ConversationView {
      id: ID!
      matchId: ID!
      lastMessageAt: DateTime
      otherUser: Profile!
      unreadCount: Int!
    }

    type Message {
      id: ID!
      conversationId: ID!
      senderId: ID!
      type: String!
      content: String
      mediaUrls: [String!]!
      createdAt: DateTime!
      readAt: DateTime
    }

    type SwipeResult { ok: Boolean!, matched: Boolean!, matchId: ID }

    type MeResult { ok: Boolean!, error: String, user: Me }

    type Mutation {
      signUp(email: String!, password: String!): MeResult!
      signIn(email: String!, password: String!): MeResult!
      signOut: Boolean!
      resetPassword(email: String!): Boolean!
      verifyEmail(token: String!): Boolean!

      upsertMyProfile(input: ProfileInput!): Profile!
      upsertMyPreferences(input: PreferencesInput!): Preferences!
      updateMyLocation(latitude: Float!, longitude: Float!): Boolean!
      swipe(targetUserId: ID!, direction: SwipeDirection!): SwipeResult!
      sendMessage(conversationId: ID!, content: String, mediaUrls: [String!]): Message!
      markConversationRead(conversationId: ID!): Boolean!
    }

    type Subscription {
      messageAdded(conversationId: ID!): Message!
      messageRead(conversationId: ID!): MessageReadEvent!
      userTyping(conversationId: ID!): TypingEvent!
      matchCreated(userId: ID!): MatchView!
    }

    type MessageReadEvent {
      conversationId: ID!
      messageId: ID
      readBy: ID!
      readAt: DateTime!
    }

    type TypingEvent {
      conversationId: ID!
      userId: ID!
      isTyping: Boolean!
    }
  `;

  const resolvers = {
    Query: {
      health: () => {
        console.log('Health resolver called at', new Date().toISOString());
        return 'ok';
      },
      me: async (_: unknown, __: unknown, ctx: { user?: any }) => {
        if (!ctx?.user?.id) return null;

        // Get user with profile to check admin status
        const user = await prisma.user.findUnique({
          where: { id: ctx.user.id },
          include: { profile: true }
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          roles: user.roles,
          profile: user.profile ? {
            id: user.profile.userId,
            name: user.profile.name,
            isAdmin: user.roles.includes('admin')
          } : null
        };
      },
      // Profile
      myProfile: async (_: unknown, __: unknown, ctx: any) => {
        if (!ctx?.user?.id) return null;
        return prisma.profile.findUnique({ where: { userId: ctx.user.id } });
      },
      // Preferences
      myPreferences: async (_: unknown, __: unknown, ctx: any) => {
        if (!ctx?.user?.id) return null;
        return prisma.preferences.findUnique({ where: { userId: ctx.user.id } });
      },
      // Enhanced discovery with location-based filtering
      discoveryFeed: async (_: unknown, args: { page?: number; pageSize?: number }, ctx: any) => {
        if (!ctx?.user?.id) return [];
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));

        // Get user preferences and location
        const [preferences, myLocation] = await Promise.all([
          prisma.preferences.findUnique({ where: { userId: ctx.user.id } }),
          prisma.location.findUnique({ where: { userId: ctx.user.id } }),
        ]);

        const minAge = preferences?.minAge ?? 18;
        const maxAge = preferences?.maxAge ?? 55;
        const maxDistance = preferences?.distanceKm ?? 50;
        const showMe = preferences?.showMe ?? undefined;

        // Base query to exclude already swiped users and self
        const baseWhere = {
          userId: { not: ctx.user.id },
          age: { gte: minAge, lte: maxAge },
          visibility: 'PUBLIC',
          ...(showMe ? { gender: showMe } : {}),
          user: {
            swipedBy: { none: { userId: ctx.user.id } },
          },
        };

        let candidates;

        if (myLocation) {
          // Use PostGIS for location-based discovery
          const distanceQuery = `
            SELECT p.*,
                   ST_Distance(
                     ST_Point($1, $2)::geography,
                     ST_Point(l.longitude, l.latitude)::geography
                   ) / 1000 as distance_km
            FROM "Profile" p
            JOIN "User" u ON p."userId" = u.id
            JOIN "Location" l ON u.id = l."userId"
            WHERE p."userId" != $3
              AND p.age >= $4 AND p.age <= $5
              AND p.visibility = 'PUBLIC'
              ${showMe ? 'AND p.gender = $6' : ''}
              AND NOT EXISTS (
                SELECT 1 FROM "Swipe" s
                WHERE s."userId" = $3 AND s."targetUserId" = p."userId"
              )
              AND ST_Distance(
                ST_Point($1, $2)::geography,
                ST_Point(l.longitude, l.latitude)::geography
              ) / 1000 <= $${showMe ? '7' : '6'}
            ORDER BY distance_km ASC, RANDOM()
            LIMIT $${showMe ? '8' : '7'} OFFSET $${showMe ? '9' : '8'}
          `;

          const params = [
            myLocation.longitude,
            myLocation.latitude,
            ctx.user.id,
            minAge,
            maxAge,
            maxDistance,
            ...(showMe ? [showMe] : []),
            pageSize,
            (page - 1) * pageSize,
          ];

          candidates = await prisma.$queryRawUnsafe(distanceQuery, ...params);
        } else {
          // Fallback to regular query without location filtering
          candidates = await prisma.profile.findMany({
            where: baseWhere,
            take: pageSize,
            skip: (page - 1) * pageSize,
            orderBy: [
              { user: { createdAt: 'desc' } }, // Newer users first
              { userId: 'asc' }, // Consistent ordering
            ],
          });
        }

        return candidates;
      },
      myMatches: async (_: unknown, args: { status?: any; page?: number; pageSize?: number }, ctx: any) => {
        if (!ctx?.user?.id) return [];
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));
        const where = {
          ...(args.status ? { status: args.status } : {}),
          OR: [{ userIdA: ctx.user.id }, { userIdB: ctx.user.id }],
        } as any;
        const matches = await prisma.match.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: { userA: { include: { profile: true } }, userB: { include: { profile: true } } },
        });
        return matches.map((m) => ({
          id: m.id,
          status: m.status,
          createdAt: m.createdAt,
          otherUser: (m.userIdA === ctx.user.id ? m.userB.profile : m.userA.profile)!,
        }));
      },
      myConversations: async (_: unknown, args: { page?: number; pageSize?: number }, ctx: any) => {
        if (!ctx?.user?.id) return [];
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));

        const convos = await prisma.conversation.findMany({
          where: { match: { OR: [{ userIdA: ctx.user.id }, { userIdB: ctx.user.id }] } },
          orderBy: { lastMessageAt: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
          include: {
            match: { include: { userA: { include: { profile: true } }, userB: { include: { profile: true } } } },
            messages: { select: { id: true, senderId: true, readAt: true } },
          },
        });
        return convos.map((c) => {
          const other = c.match.userIdA === ctx.user.id ? c.match.userB.profile : c.match.userA.profile;
          const unreadCount = c.messages.filter((m) => m.readAt == null && m.senderId !== ctx.user.id).length;
          return { id: c.id, matchId: c.matchId, lastMessageAt: c.lastMessageAt, otherUser: other!, unreadCount };
        });
      },
      // Messages in a conversation
      messages: async (_: unknown, args: { conversationId: string; page?: number; pageSize?: number }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 50));

        // Verify user has access to this conversation
        const convo = await prisma.conversation.findUnique({
          where: { id: args.conversationId },
          include: { match: true }
        });
        if (!convo) throw new Error('Conversation not found');
        const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
        if (!participant) throw new Error('Forbidden');

        const messages = await prisma.message.findMany({
          where: { conversationId: args.conversationId },
          orderBy: { createdAt: 'desc' },
          take: pageSize,
          skip: (page - 1) * pageSize,
        });

        return messages.reverse(); // Return in chronological order
      },
      // Get a specific user's profile (for viewing matches)
      profile: async (_: unknown, args: { userId: string }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');

        // Check if the requesting user has access to view this profile
        // Either they matched with this user, or it's in their discovery feed
        const hasMatch = await prisma.match.findFirst({
          where: {
            OR: [
              { userIdA: ctx.user.id, userIdB: args.userId },
              { userIdA: args.userId, userIdB: ctx.user.id },
            ],
          },
        });

        if (!hasMatch) {
          // Check if this user is in their discovery feed (hasn't been swiped on yet)
          const alreadySwiped = await prisma.swipe.findFirst({
            where: { userId: ctx.user.id, targetUserId: args.userId },
          });
          if (alreadySwiped) throw new Error('Profile not accessible');
        }

        const profile = await prisma.profile.findUnique({
          where: { userId: args.userId },
        });

        if (!profile) throw new Error('Profile not found');
        return profile;
      },
    },
    Mutation: {
      signUp: async (_: unknown, args: { email: string; password: string }, ctx: { request: any, reply: any }) => {
        try {
          console.log('SignUp attempt:', args.email);
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          console.log('Calling SuperTokens signUp...');
          const result = await EmailPassword.signUp('public', args.email, args.password, undefined, { request: req, response: res } as any);
          console.log('SuperTokens result:', result);
          if (result.status !== 'OK') {
            console.log('SignUp failed with status:', result.status);
            return { ok: false, error: `signup failed: ${result.status}` };
          }
          console.log('SignUp successful, creating Prisma user...');
          // Upsert Prisma user on successful signup
          await prisma.user.upsert({
            where: { id: result.user.id },
            update: { email: args.email },
            create: { id: result.user.id, email: args.email, passwordHash: '' },
          });
          console.log('Prisma user created successfully');
          return { ok: true, user: { id: result.user.id, email: args.email, roles: [] } };
        } catch (error) {
          console.error('SignUp error:', error);
          return { ok: false, error: `signup error: ${error.message}` };
        }
      },
      signIn: async (_: unknown, args: { email: string; password: string }, ctx: { request: any, reply: any }) => {
        const req = wrapRequest(ctx.request);
        const res = wrapResponse(ctx.reply);
        const result = await EmailPassword.signIn('public', args.email, args.password, undefined, { request: req, response: res } as any);
        if (result.status !== 'OK') return { ok: false, error: 'signin failed' };
        // Ensure Prisma user exists on signin
        await prisma.user.upsert({
          where: { id: result.user.id },
          update: { email: args.email },
          create: { id: result.user.id, email: args.email, passwordHash: '' },
        });
        return { ok: true, user: { id: result.user.id, email: args.email, roles: [] } };
      },
      signOut: async (_: unknown, __: unknown, ctx: { request: any, reply: any }) => {
        const req = wrapRequest(ctx.request);
        const res = wrapResponse(ctx.reply);
        const s = await Session.getSession(req, res, { sessionRequired: false } as any);
        if (!s) return true;
        await s.revokeSession();
        return true;
      },
      // Password reset
      resetPassword: async (_: unknown, { email }: { email: string }, ctx: { request: any, reply: any }) => {
        try {
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          await EmailPassword.createResetPasswordToken('public', email, undefined, { request: req, response: res } as any);
          return true;
        } catch (error) {
          console.error('Password reset error:', error);
          return false;
        }
      },
      // Email verification
      verifyEmail: async (_: unknown, { token }: { token: string }, ctx: { request: any, reply: any }) => {
        try {
          const req = wrapRequest(ctx.request);
          const res = wrapResponse(ctx.reply);
          const result = await EmailVerification.verifyEmailUsingToken('public', token, undefined, { request: req, response: res } as any);
          return result.status === 'OK';
        } catch (error) {
          console.error('Email verification error:', error);
          return false;
        }
      },
      // Upsert my profile
      upsertMyProfile: async (_: unknown, { input }: { input: any }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');
        const sanitize = (s?: string) => (typeof s === 'string' ? s.trim() : null);
        const trimArray = (arr?: string[]) => Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean) : [];
        const name = sanitize(input.name) ?? '';
        const age = Number(input.age);
        if (!name) throw new Error('Invalid name');
        if (!Number.isFinite(age) || age < 18 || age > 100) throw new Error('Invalid age');
        const data = {
          name,
          age,
          gender: sanitize(input.gender),
          orientation: sanitize(input.orientation),
          bio: sanitize(input.bio),
          interests: trimArray(input.interests),
          lifestyle: sanitize(input.lifestyle),
          education: sanitize(input.education),
          photos: trimArray(input.photos).slice(0, 6),
          videoIntroUrl: sanitize(input.videoIntroUrl),
          prompts: trimArray(input.prompts).slice(0, 10),
          visibility: input.visibility ?? 'PUBLIC',
        } as any;
        const profile = await prisma.profile.upsert({
          where: { userId: ctx.user.id },
          update: data,
          create: { userId: ctx.user.id, ...data },
        });
        return profile;
      },
      // Upsert my preferences
      upsertMyPreferences: async (_: unknown, { input }: { input: any }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');
        const minAge = Number.isFinite(Number(input.minAge)) ? Number(input.minAge) : 18;
        const maxAge = Number.isFinite(Number(input.maxAge)) ? Number(input.maxAge) : 55;
        const distanceKm = Number.isFinite(Number(input.distanceKm)) ? Number(input.distanceKm) : 50;
        const showMe = typeof input.showMe === 'string' ? input.showMe.trim() : null;
        if (minAge < 18 || maxAge < minAge || maxAge > 100) throw new Error('Invalid age range');
        if (distanceKm < 1 || distanceKm > 500) throw new Error('Invalid distance');
        const prefs = await prisma.preferences.upsert({
          where: { userId: ctx.user.id },
          update: { minAge, maxAge, distanceKm, showMe },
          create: { userId: ctx.user.id, minAge, maxAge, distanceKm, showMe },
        });
        return prefs;
      },
      // Update location
      updateMyLocation: async (_: unknown, { latitude, longitude }: { latitude: number; longitude: number }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');

        // Validate coordinates
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('Invalid coordinates');
        }
        if (latitude < -90 || latitude > 90) {
          throw new Error('Invalid latitude');
        }
        if (longitude < -180 || longitude > 180) {
          throw new Error('Invalid longitude');
        }

        await prisma.location.upsert({
          where: { userId: ctx.user.id },
          update: { latitude, longitude, updatedAt: new Date() },
          create: { userId: ctx.user.id, latitude, longitude },
        });

        return true;
      },
      // Swipe
      swipe: async (_: unknown, { targetUserId, direction }: { targetUserId: string; direction: 'LEFT'|'RIGHT'|'SUPER' }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');
        if (targetUserId === ctx.user.id) throw new Error('Cannot swipe self');
        if (!['LEFT','RIGHT','SUPER'].includes(direction)) throw new Error('Invalid direction');
        await prisma.swipe.create({ data: { userId: ctx.user.id, targetUserId, direction: direction as any } });
        let matched = false; let matchId: string | undefined;
        if (direction !== 'LEFT') {
          // Check if target liked me before
          const reciprocal = await prisma.swipe.findFirst({ where: { userId: targetUserId, targetUserId: ctx.user.id, direction: { in: ['RIGHT','SUPER'] as any } } });
          if (reciprocal) {
            // Order ids to avoid unique conflict
            const a = ctx.user.id < targetUserId ? ctx.user.id : targetUserId;
            const b = ctx.user.id < targetUserId ? targetUserId : ctx.user.id;
            const m = await prisma.match.upsert({
              where: { userIdA_userIdB: { userIdA: a, userIdB: b } },
              update: { status: 'ACTIVE' },
              create: { userIdA: a, userIdB: b, status: 'ACTIVE' },
            });
            matched = true; matchId = m.id;
            // Ensure conversation exists
            await prisma.conversation.upsert({ where: { matchId: m.id }, update: {}, create: { matchId: m.id } });

            // Send real-time match notification via Socket.IO
            try {
              const socketService = (global as any).socketService;
              if (socketService) {
                await socketService.sendMatchNotification(ctx.user.id, targetUserId, m.id);
              }
            } catch (error) {
              console.error('❌ Failed to send match notification:', error);
            }

            // Publish match to GraphQL subscriptions
            const matchView = {
              id: m.id,
              status: m.status,
              createdAt: m.createdAt,
              otherUser: await prisma.profile.findUnique({ where: { userId: targetUserId } }),
            };

            pubsub.publish(`MATCH_CREATED_${ctx.user.id}`, { matchCreated: matchView });
            pubsub.publish(`MATCH_CREATED_${targetUserId}`, {
              matchCreated: {
                ...matchView,
                otherUser: await prisma.profile.findUnique({ where: { userId: ctx.user.id } }),
              }
            });
          }
        }
        return { ok: true, matched, matchId };
      },
      // Send message
      sendMessage: async (_: unknown, { conversationId, content, mediaUrls }: { conversationId: string; content?: string; mediaUrls?: string[] }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');
        const convo = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { match: true } });
        if (!convo) throw new Error('Conversation not found');
        const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
        if (!participant) throw new Error('Forbidden');
        const text = typeof content === 'string' ? content.trim() : null;
        const media = Array.isArray(mediaUrls) ? mediaUrls.map((u) => String(u).trim()).filter(Boolean).slice(0, 5) : [];
        if (!text && media.length === 0) throw new Error('Empty message');
        const msg = await prisma.message.create({ data: { conversationId, senderId: ctx.user.id, type: 'TEXT', content: text, mediaUrls: media } });
        await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

        // Publish to GraphQL subscription
        pubsub.publish(`MESSAGE_ADDED_${conversationId}`, { messageAdded: msg });

        return msg;
      },
      // Mark read
      markConversationRead: async (_: unknown, { conversationId }: { conversationId: string }, ctx: any) => {
        if (!ctx?.user?.id) throw new Error('Unauthenticated');
        const convo = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { match: true } });
        if (!convo) throw new Error('Conversation not found');
        const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
        if (!participant) throw new Error('Forbidden');
        const readAt = new Date();
        await prisma.message.updateMany({ where: { conversationId, senderId: { not: ctx.user.id }, readAt: null }, data: { readAt } });

        // Publish read receipt to GraphQL subscription
        pubsub.publish(`MESSAGE_READ_${conversationId}`, {
          messageRead: {
            conversationId,
            readBy: ctx.user.id,
            readAt
          }
        });

        return true;
      },
    },
    Subscription: {
      messageAdded: {
        subscribe: async (_: unknown, { conversationId }: { conversationId: string }, ctx: any) => {
          if (!ctx?.user?.id) throw new Error('Unauthenticated');

          // Verify user has access to this conversation
          const convo = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true }
          });
          if (!convo) throw new Error('Conversation not found');
          const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
          if (!participant) throw new Error('Forbidden');

          return pubsub.asyncIterator(`MESSAGE_ADDED_${conversationId}`);
        },
      },
      messageRead: {
        subscribe: async (_: unknown, { conversationId }: { conversationId: string }, ctx: any) => {
          if (!ctx?.user?.id) throw new Error('Unauthenticated');

          // Verify access
          const convo = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true }
          });
          if (!convo) throw new Error('Conversation not found');
          const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
          if (!participant) throw new Error('Forbidden');

          return pubsub.asyncIterator(`MESSAGE_READ_${conversationId}`);
        },
      },
      userTyping: {
        subscribe: async (_: unknown, { conversationId }: { conversationId: string }, ctx: any) => {
          if (!ctx?.user?.id) throw new Error('Unauthenticated');

          // Verify access
          const convo = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { match: true }
          });
          if (!convo) throw new Error('Conversation not found');
          const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
          if (!participant) throw new Error('Forbidden');

          return pubsub.asyncIterator(`USER_TYPING_${conversationId}`);
        },
      },
      matchCreated: {
        subscribe: async (_: unknown, { userId }: { userId: string }, ctx: any) => {
          if (!ctx?.user?.id) throw new Error('Unauthenticated');
          if (userId !== ctx.user.id) throw new Error('Can only subscribe to own matches');

          return pubsub.asyncIterator(`MATCH_CREATED_${userId}`);
        },
      },
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const apollo = new ApolloServer({
    schema,
    plugins: [fastifyApolloDrainPlugin(server)],
  });
  await apollo.start();

  // Register GraphQL route using plugin approach for better compatibility
  await server.register(async function (fastify) {
    fastify.route({
      url: '/graphql',
      method: ['GET', 'POST', 'OPTIONS'],
      handler: fastifyApolloHandler(apollo, {
        context: async ({ request, reply }: any) => {
          try {
            const s = await Session.getSession(request as any, undefined, { sessionRequired: false });
            if (!s) return { user: null, request, reply };
            const userId = s.getUserId();
            // Ensure Prisma user exists and load its data
            let email = '';
            try {
              const stUser = await stGetUser(userId);
              email = stUser?.emails?.[0] ?? '';
              if (email) {
                await prisma.user.upsert({
                  where: { id: userId },
                  update: { email },
                  create: { id: userId, email, passwordHash: '' },
                });
              }
            } catch {}
            const payload = s.getAccessTokenPayload();
            const roles = Array.isArray((payload as any)?.roles) ? (payload as any).roles : [];
            return { user: { id: userId, email, roles }, request, reply };
          } catch {
            return { user: null, request, reply };
          }
        },
      }),
    });
  });

  // Debug: print mounted routes (after all routes are registered)
  server.ready().then(() => {
    server.log.info(server.printRoutes());
  });

  const port = Number(process.env.PORT ?? 8080);
  try {
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`API listening on :${port}`);

    // Initialize Socket.IO after server starts
    const socketIOService = new SocketIOService(server.server);
    // Make it globally available for match notifications
    (global as any).socketService = socketIOService;

    // Initialize GraphQL WebSocket subscriptions
    const wsServer = new WebSocketServer({
      server: server.server as any,
      path: '/graphql',
    });

    const serverCleanup = useServer(
      {
        schema,
        context: async (ctx: any) => {
          // Authentication context for WebSocket
          try {
            // For now, we'll skip authentication for WebSocket subscriptions
            // In production, you'd want to authenticate using connection params
            return {
              user: null, // TODO: Implement WebSocket authentication
              prisma,
            };
          } catch (error) {
            console.error('WebSocket authentication error:', error);
            return { user: null, prisma };
          }
        },
      },
      wsServer
    );

    server.log.info('🔌 Socket.IO initialized');
    server.log.info('📡 GraphQL WebSocket subscriptions initialized');

    // Cleanup on server shutdown
    process.on('SIGTERM', async () => {
      await serverCleanup.dispose();
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

start();

