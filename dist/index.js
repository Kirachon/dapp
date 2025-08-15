"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const cors_1 = __importDefault(require("@fastify/cors"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const formbody_1 = __importDefault(require("@fastify/formbody"));
const server_1 = require("@apollo/server");
const fastify_2 = require("@as-integrations/fastify");
const schema_1 = require("@graphql-tools/schema");
const supertokens_node_1 = __importStar(require("supertokens-node"));
const emailpassword_1 = __importDefault(require("supertokens-node/recipe/emailpassword"));
// Import internal core class to access instance methods in TS
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const supertokens_1 = __importDefault(require("supertokens-node/lib/build/supertokens"));
const supertokens_2 = require("./auth/supertokens");
const prisma_1 = require("./generated/prisma");
// @ts-ignore - Fastify plugin shim from SuperTokens
const fastify_3 = require("supertokens-node/framework/fastify");
const prisma = new prisma_1.PrismaClient();
async function start() {
    (0, supertokens_2.initSuperTokens)();
    // Ensure CORS allows SuperTokens headers
    const corsConfig = { origin: true, credentials: true, allowedHeaders: [
            'content-type', ...supertokens_node_1.default.getAllCORSHeaders()
        ] };
    const server = (0, fastify_1.default)({ logger: true });
    // Security & CORS
    await server.register(helmet_1.default);
    await server.register(cors_1.default, corsConfig);
    // Global and route-specific rate limits
    await server.register(rate_limit_1.default, { max: 100, timeWindow: '1 minute', allowList: ['127.0.0.1'] });
    await server.register(cookie_1.default);
    await server.register(formbody_1.default);
    // SuperTokens plugin (preHandler) and NotFound bridge for /auth/*
    await server.register(fastify_3.plugin);
    server.setNotFoundHandler(async (req, reply) => {
        if (req.url.startsWith('/auth')) {
            const request = (0, fastify_3.wrapRequest)(req);
            const response = (0, fastify_3.wrapResponse)(reply);
            const st = supertokens_1.default.default.getInstanceOrThrowError();
            try {
                const handled = await st.middleware(request, response, {});
                if (!reply.sent && !handled)
                    return reply.code(404).send({ message: 'Not Found' });
            }
            catch (err) {
                await st.errorHandler(err, request, response, {});
            }
            return;
        }
        reply.code(404).send({ message: 'Not Found' });
    });
    server.setErrorHandler((err, req, reply) => {
        req.log.error({ err }, 'Unhandled error');
        // Delegate to ST error handler first
        try {
            return (0, fastify_3.errorHandler)()(err, req, reply);
        }
        catch { }
        reply.status(500).send({ message: 'Internal Server Error' });
    });
    // Basic metrics endpoint
    server.get('/metrics', async () => {
        const uCount = await prisma.user.count();
        const mCount = await prisma.match.count();
        const cCount = await prisma.conversation.count();
        return { users: uCount, matches: mCount, conversations: cCount, ts: new Date().toISOString() };
    });
    // Debug: print mounted routes
    server.ready().then(() => {
        server.log.info(server.printRoutes());
    });
    // REST health endpoints
    server.get('/health', async () => ({ status: 'ok' }));
    server.get('/ready', async () => ({ status: 'ready' }));
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
    }

    type Me {
      id: ID!
      email: String!
      roles: [String!]!
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

      upsertMyProfile(input: ProfileInput!): Profile!
      upsertMyPreferences(input: PreferencesInput!): Preferences!
      swipe(targetUserId: ID!, direction: SwipeDirection!): SwipeResult!
      sendMessage(conversationId: ID!, content: String, mediaUrls: [String!]): Message!
      markConversationRead(conversationId: ID!): Boolean!
    }
  `;
    const resolvers = {
        Query: {
            health: () => 'ok',
            me: (_, __, ctx) => ctx.user ?? null,
            // Profile
            myProfile: async (_, __, ctx) => {
                if (!ctx?.user?.id)
                    return null;
                return prisma.profile.findUnique({ where: { userId: ctx.user.id } });
            },
            // Preferences
            myPreferences: async (_, __, ctx) => {
                if (!ctx?.user?.id)
                    return null;
                return prisma.preferences.findUnique({ where: { userId: ctx.user.id } });
            },
            // Discovery (MVP: no distance filter yet)
            discoveryFeed: async (_, args, ctx) => {
                if (!ctx?.user?.id)
                    return [];
                const page = Math.max(1, args.page ?? 1);
                const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));
                const me = await prisma.preferences.findUnique({ where: { userId: ctx.user.id } });
                const minAge = me?.minAge ?? 18;
                const maxAge = me?.maxAge ?? 55;
                const showMe = me?.showMe ?? undefined;
                const candidates = await prisma.profile.findMany({
                    where: {
                        userId: { not: ctx.user.id },
                        age: { gte: minAge, lte: maxAge },
                        ...(showMe ? { gender: showMe } : {}),
                        user: {
                            swipedBy: { none: { userId: ctx.user.id } },
                        },
                    },
                    take: pageSize,
                    skip: (page - 1) * pageSize,
                    orderBy: { userId: 'asc' },
                });
                return candidates;
            },
            myMatches: async (_, args, ctx) => {
                if (!ctx?.user?.id)
                    return [];
                const page = Math.max(1, args.page ?? 1);
                const pageSize = Math.min(50, Math.max(1, args.pageSize ?? 20));
                const where = {
                    ...(args.status ? { status: args.status } : {}),
                    OR: [{ userIdA: ctx.user.id }, { userIdB: ctx.user.id }],
                };
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
                    otherUser: (m.userIdA === ctx.user.id ? m.userB.profile : m.userA.profile),
                }));
            },
            myConversations: async (_, args, ctx) => {
                if (!ctx?.user?.id)
                    return [];
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
                    return { id: c.id, matchId: c.matchId, lastMessageAt: c.lastMessageAt, otherUser: other, unreadCount };
                });
            },
        },
        Mutation: {
            signUp: async (_, args, ctx) => {
                const req = (0, fastify_3.wrapRequest)(ctx.request);
                const res = (0, fastify_3.wrapResponse)(ctx.reply);
                const result = await emailpassword_1.default.signUp('public', args.email, args.password, undefined, { request: req, response: res });
                if (result.status !== 'OK')
                    return { ok: false, error: 'signup failed' };
                // Upsert Prisma user on successful signup
                await prisma.user.upsert({
                    where: { id: result.user.id },
                    update: { email: args.email },
                    create: { id: result.user.id, email: args.email, passwordHash: '' },
                });
                return { ok: true, user: { id: result.user.id, email: args.email, roles: [] } };
            },
            signIn: async (_, args, ctx) => {
                const req = (0, fastify_3.wrapRequest)(ctx.request);
                const res = (0, fastify_3.wrapResponse)(ctx.reply);
                const result = await emailpassword_1.default.signIn('public', args.email, args.password, undefined, { request: req, response: res });
                if (result.status !== 'OK')
                    return { ok: false, error: 'signin failed' };
                // Ensure Prisma user exists on signin
                await prisma.user.upsert({
                    where: { id: result.user.id },
                    update: { email: args.email },
                    create: { id: result.user.id, email: args.email, passwordHash: '' },
                });
                return { ok: true, user: { id: result.user.id, email: args.email, roles: [] } };
            },
            signOut: async (_, __, ctx) => {
                const req = (0, fastify_3.wrapRequest)(ctx.request);
                const res = (0, fastify_3.wrapResponse)(ctx.reply);
                const s = await supertokens_2.Session.getSession(req, res, { sessionRequired: false });
                if (!s)
                    return true;
                await s.revokeSession();
                return true;
            },
            // Upsert my profile
            upsertMyProfile: async (_, { input }, ctx) => {
                if (!ctx?.user?.id)
                    throw new Error('Unauthenticated');
                const sanitize = (s) => (typeof s === 'string' ? s.trim() : null);
                const trimArray = (arr) => Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean) : [];
                const name = sanitize(input.name) ?? '';
                const age = Number(input.age);
                if (!name)
                    throw new Error('Invalid name');
                if (!Number.isFinite(age) || age < 18 || age > 100)
                    throw new Error('Invalid age');
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
                };
                const profile = await prisma.profile.upsert({
                    where: { userId: ctx.user.id },
                    update: data,
                    create: { userId: ctx.user.id, ...data },
                });
                return profile;
            },
            // Upsert my preferences
            upsertMyPreferences: async (_, { input }, ctx) => {
                if (!ctx?.user?.id)
                    throw new Error('Unauthenticated');
                const minAge = Number.isFinite(Number(input.minAge)) ? Number(input.minAge) : 18;
                const maxAge = Number.isFinite(Number(input.maxAge)) ? Number(input.maxAge) : 55;
                const distanceKm = Number.isFinite(Number(input.distanceKm)) ? Number(input.distanceKm) : 50;
                const showMe = typeof input.showMe === 'string' ? input.showMe.trim() : null;
                if (minAge < 18 || maxAge < minAge || maxAge > 100)
                    throw new Error('Invalid age range');
                if (distanceKm < 1 || distanceKm > 500)
                    throw new Error('Invalid distance');
                const prefs = await prisma.preferences.upsert({
                    where: { userId: ctx.user.id },
                    update: { minAge, maxAge, distanceKm, showMe },
                    create: { userId: ctx.user.id, minAge, maxAge, distanceKm, showMe },
                });
                return prefs;
            },
            // Swipe
            swipe: async (_, { targetUserId, direction }, ctx) => {
                if (!ctx?.user?.id)
                    throw new Error('Unauthenticated');
                if (targetUserId === ctx.user.id)
                    throw new Error('Cannot swipe self');
                if (!['LEFT', 'RIGHT', 'SUPER'].includes(direction))
                    throw new Error('Invalid direction');
                await prisma.swipe.create({ data: { userId: ctx.user.id, targetUserId, direction: direction } });
                let matched = false;
                let matchId;
                if (direction !== 'LEFT') {
                    // Check if target liked me before
                    const reciprocal = await prisma.swipe.findFirst({ where: { userId: targetUserId, targetUserId: ctx.user.id, direction: { in: ['RIGHT', 'SUPER'] } } });
                    if (reciprocal) {
                        // Order ids to avoid unique conflict
                        const a = ctx.user.id < targetUserId ? ctx.user.id : targetUserId;
                        const b = ctx.user.id < targetUserId ? targetUserId : ctx.user.id;
                        const m = await prisma.match.upsert({
                            where: { userIdA_userIdB: { userIdA: a, userIdB: b } },
                            update: { status: 'ACTIVE' },
                            create: { userIdA: a, userIdB: b, status: 'ACTIVE' },
                        });
                        matched = true;
                        matchId = m.id;
                        // Ensure conversation exists
                        await prisma.conversation.upsert({ where: { matchId: m.id }, update: {}, create: { matchId: m.id } });
                    }
                }
                return { ok: true, matched, matchId };
            },
            // Send message
            sendMessage: async (_, { conversationId, content, mediaUrls }, ctx) => {
                if (!ctx?.user?.id)
                    throw new Error('Unauthenticated');
                const convo = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { match: true } });
                if (!convo)
                    throw new Error('Conversation not found');
                const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
                if (!participant)
                    throw new Error('Forbidden');
                const text = typeof content === 'string' ? content.trim() : null;
                const media = Array.isArray(mediaUrls) ? mediaUrls.map((u) => String(u).trim()).filter(Boolean).slice(0, 5) : [];
                if (!text && media.length === 0)
                    throw new Error('Empty message');
                const msg = await prisma.message.create({ data: { conversationId, senderId: ctx.user.id, type: 'TEXT', content: text, mediaUrls: media } });
                await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
                return msg;
            },
            // Mark read
            markConversationRead: async (_, { conversationId }, ctx) => {
                if (!ctx?.user?.id)
                    throw new Error('Unauthenticated');
                const convo = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { match: true } });
                if (!convo)
                    throw new Error('Conversation not found');
                const participant = convo.match.userIdA === ctx.user.id || convo.match.userIdB === ctx.user.id;
                if (!participant)
                    throw new Error('Forbidden');
                await prisma.message.updateMany({ where: { conversationId, senderId: { not: ctx.user.id }, readAt: null }, data: { readAt: new Date() } });
                return true;
            },
        }
    };
    const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers });
    const apollo = new server_1.ApolloServer({
        schema,
        plugins: [(0, fastify_2.fastifyApolloDrainPlugin)(server)],
    });
    await apollo.start();
    server.route({
        url: '/graphql',
        method: ['GET', 'POST', 'OPTIONS'],
        handler: (0, fastify_2.fastifyApolloHandler)(apollo, {
            context: async ({ request, reply }) => {
                try {
                    const s = await supertokens_2.Session.getSession(request, undefined, { sessionRequired: false });
                    if (!s)
                        return { user: null, request, reply };
                    const userId = s.getUserId();
                    // Ensure Prisma user exists and load its data
                    let email = '';
                    try {
                        const stUser = await (0, supertokens_node_1.getUser)(userId);
                        email = stUser?.emails?.[0] ?? '';
                        if (email) {
                            await prisma.user.upsert({
                                where: { id: userId },
                                update: { email },
                                create: { id: userId, email, passwordHash: '' },
                            });
                        }
                    }
                    catch { }
                    const payload = s.getAccessTokenPayload();
                    const roles = Array.isArray(payload?.roles) ? payload.roles : [];
                    return { user: { id: userId, email, roles }, request, reply };
                }
                catch {
                    return { user: null, request, reply };
                }
            },
        }),
    });
    const port = Number(process.env.PORT ?? 8080);
    try {
        await server.listen({ port, host: '0.0.0.0' });
        server.log.info(`API listening on :${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map