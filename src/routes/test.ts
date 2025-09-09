import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient, MatchStatus } from '@prisma/client';
import { Session } from '../auth/supertokens';

const prisma = new PrismaClient();

function ensureNonProd() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Test routes are disabled in production');
  }
}

// Helpers
async function upsertUserWithProfile({
  email,
  password,
  profile,
  preferences,
  stUserId,
}: {
  email: string;
  password: string;
  profile?: Partial<{
    name: string; age: number; gender?: string; orientation?: string; bio?: string; interests?: string[]; education?: string; photos?: string[];
  }>;
  preferences?: Partial<{ minAge: number; maxAge: number; distanceKm: number; showMe?: string }>;
  stUserId?: string;
}) {
  // NOTE: dev-only password handling (do NOT use in production)
  const passwordHash = password || 'dev_only_hash';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      ...(stUserId ? { id: stUserId } : {}),
      email,
      passwordHash,
      roles: ['user'],
    },
    select: { id: true, email: true }
  });

  if (profile) {
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        name: profile.name ?? 'Test User',
        age: profile.age ?? 25,
        gender: profile.gender,
        orientation: profile.orientation,
        bio: profile.bio,
        interests: profile.interests ?? ['coffee','hiking'],
        education: profile.education,
        photos: profile.photos ?? [],
      },
      create: {
        userId: user.id,
        name: profile.name ?? 'Test User',
        age: profile.age ?? 25,
        gender: profile.gender,
        orientation: profile.orientation,
        bio: profile.bio,
        interests: profile.interests ?? ['coffee','hiking'],
        education: profile.education,
        photos: profile.photos ?? [],
      },
    });
  }

  if (preferences) {
    await prisma.preferences.upsert({
      where: { userId: user.id },
      update: {
        minAge: preferences.minAge ?? 22,
        maxAge: preferences.maxAge ?? 35,
        distanceKm: preferences.distanceKm ?? 50,
        showMe: preferences.showMe,
      },
      create: {
        userId: user.id,
        minAge: preferences.minAge ?? 22,
        maxAge: preferences.maxAge ?? 35,
        distanceKm: preferences.distanceKm ?? 50,
        showMe: preferences.showMe,
      },
    });
  }

  return user;
}

export async function testRoutes(fastify: FastifyInstance) {
  ensureNonProd();

  fastify.post('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    ensureNonProd();
    const { email, password, profile, preferences, stUserId } = request.body as any;
    if (!email) return reply.code(400).send({ error: 'email required' });
    const user = await upsertUserWithProfile({ email, password, profile, preferences, stUserId });
    try {
      const p = await prisma.profile.findUnique({ where: { userId: user.id } });
      console.log('🧪 /test/users upsert result', { userId: user.id, email: user.email, profileName: p?.name, hasProfile: !!p });
    } catch {}
    return reply.send({ ok: true, user });
  });

  fastify.post('/auth/signin', async (request: FastifyRequest, reply: FastifyReply) => {
    ensureNonProd();
    const { email, password } = request.body as any;
    if (!email) return reply.code(400).send({ error: 'email required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(404).send({ error: 'user not found' });
    }

    // Create SuperTokens session cookies for this user (Fastify: pass request & reply)
    try {
      await Session.createNewSession(request, reply, user.id, {}, {});
    } catch (e: any) {
      console.error('❌ /test/auth/signin session create failed:', e);
      return reply.code(500).send({ error: 'session-create-failed', message: e?.message || String(e) });
    }

    // Also return Set-Cookie headers so tests can programmatically set cookies in browser context
    const rawSetCookie = reply.getHeader('set-cookie');
    const setCookie = Array.isArray(rawSetCookie) ? rawSetCookie : rawSetCookie ? [rawSetCookie] : [];

    return reply.send({ ok: true, user: { id: user.id, email: user.email }, setCookie });
  });

  fastify.post('/auth/signout', async (request: FastifyRequest, reply: FastifyReply) => {
    ensureNonProd();
    try {
      const session = await Session.getSession(request, reply, { sessionRequired: false });
      if (session) {
        await session.revokeSession();
      }
    } catch {}
    return reply.send({ ok: true });
  });

  fastify.post('/seed', async (request: FastifyRequest, reply: FastifyReply) => {
    ensureNonProd();
    const { users, matches } = (request.body as any) ?? {};
    const created: any[] = [];

    if (Array.isArray(users)) {
      for (const u of users) {
        const user = await upsertUserWithProfile(u);
        created.push(user);
      }
    }

    if (Array.isArray(matches)) {
      for (const m of matches) {
        const a = await prisma.user.findUnique({ where: { email: m.aEmail } });
        const b = await prisma.user.findUnique({ where: { email: m.bEmail } });
        if (a && b) {
          await prisma.match.upsert({
            where: { userIdA_userIdB: { userIdA: a.id, userIdB: b.id } },
            update: { status: MatchStatus.ACTIVE },
            create: { userIdA: a.id, userIdB: b.id, status: MatchStatus.ACTIVE },
          });
        }
      }
    }

    return reply.send({ ok: true, users: created.length });
  });
}

export default testRoutes;

