import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient, MatchStatus } from '@prisma/client';
import { Session, EmailPassword } from '../auth/supertokens';
import { RecipeUserId } from 'supertokens-node';

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
  roles,
}: {
  email: string;
  password: string;
  profile?: Partial<{
    name: string;
    age: number;
    gender?: string;
    orientation?: string;
    bio?: string;
    interests?: string[];
    education?: string;
    photos?: string[];
  }>;
  preferences?: Partial<{ minAge: number; maxAge: number; distanceKm: number; showMe?: string }>;
  stUserId?: string;
  roles?: string[];
}) {
  // NOTE: dev-only password handling (do NOT use in production)
  const passwordHash = password || 'dev_only_hash';

  // Create SuperTokens user first to get the correct user ID
  let finalUserId = stUserId;
  if (!stUserId) {
    try {
      const stResult = await EmailPassword.signUp('public', email, password || 'dev-password');
      if (stResult.status === 'OK') {
        finalUserId = stResult.user.id;
        console.log(`✅ SuperTokens user created: ${finalUserId}`);
      }
    } catch (e: any) {
      console.log('SuperTokens user creation (might already exist):', e?.message || String(e));
      // If user already exists, try to get their ID
      try {
        const stSignInResult = await EmailPassword.signIn(
          'public',
          email,
          password || 'dev-password',
        );
        if (stSignInResult.status === 'OK') {
          finalUserId = stSignInResult.user.id;
          console.log(`✅ SuperTokens user found: ${finalUserId}`);
        }
      } catch (signInError: any) {
        console.log('SuperTokens signin also failed:', signInError?.message || String(signInError));
      }
    }
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: roles && roles.length ? { roles } : {},
    create: {
      ...(finalUserId ? { id: finalUserId } : {}),
      email,
      passwordHash,
      roles: roles && roles.length ? roles : ['user'],
    },
    select: { id: true, email: true },
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
        interests: profile.interests ?? ['coffee', 'hiking'],
        education: profile.education,
        photos: profile.photos ?? [],
        isAdmin: Array.isArray(roles) ? roles.includes('admin') : undefined,
      },
      create: {
        userId: user.id,
        name: profile.name ?? 'Test User',
        age: profile.age ?? 25,
        gender: profile.gender,
        orientation: profile.orientation,
        bio: profile.bio,
        interests: profile.interests ?? ['coffee', 'hiking'],
        education: profile.education,
        photos: profile.photos ?? [],
        isAdmin: Array.isArray(roles) ? roles.includes('admin') : false,
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
    const { email, password, profile, preferences, stUserId, roles } = request.body as any;
    if (!email) return reply.code(400).send({ error: 'email required' });
    const user = await upsertUserWithProfile({
      email,
      password,
      profile,
      preferences,
      stUserId,
      roles,
    });
    try {
      const p = await prisma.profile.findUnique({ where: { userId: user.id } });
      console.log('🧪 /test/users upsert result', {
        userId: user.id,
        email: user.email,
        profileName: p?.name,
        hasProfile: !!p,
        roles,
      });
    } catch {}
    return reply.send({ ok: true, user });
  });

  fastify.post('/auth/signin', async (request: FastifyRequest, reply: FastifyReply) => {
    ensureNonProd();
    const { email, password } = request.body as any;
    if (!email) return reply.code(400).send({ error: 'email required' });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, roles: true },
    });
    if (!user) {
      return reply.code(404).send({ error: 'user not found' });
    }

    // Create SuperTokens session cookies for this user (Fastify: pass request & reply)
    try {
      await Session.createNewSession(request, reply, 'public', new RecipeUserId(user.id), {}, {});
    } catch (e: any) {
      console.error('❌ /test/auth/signin session create failed:', e);
      return reply
        .code(500)
        .send({ error: 'session-create-failed', message: e?.message || String(e) });
    }

    // Also return Set-Cookie headers so tests can programmatically set cookies in browser context
    const rawSetCookie = reply.getHeader('set-cookie');
    const setCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : rawSetCookie
        ? [rawSetCookie]
        : [];

    return reply.send({ ok: true, user: { id: user.id, email: user.email }, setCookie });
  });

  // Browser-friendly signin endpoint for E2E: sets cookies via real navigation
  fastify.get('/auth/signin-web', async (request: FastifyRequest, reply: FastifyReply) => {
    ensureNonProd();
    const { email } = (request.query as any) ?? {};
    if (!email) return reply.code(400).send('email required');

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, roles: true },
    });
    if (!user) {
      return reply.code(404).send('user not found');
    }

    try {
      await Session.createNewSession(request, reply, 'public', new RecipeUserId(user.id), {}, {});
    } catch (e: any) {
      console.error('❌ /test/auth/signin-web session create failed:', e);
      return reply.code(500).send('session-create-failed');
    }

    // Redirect back to frontend root where AuthProvider will pick up the session
    const frontendUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001/';
    return reply.redirect(frontendUrl);
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
        const a = await prisma.user.findUnique({
          where: { email: m.aEmail },
          select: { id: true, email: true },
        });
        const b = await prisma.user.findUnique({
          where: { email: m.bEmail },
          select: { id: true, email: true },
        });
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

  // Seed moderation items for tests
  fastify.post('/moderation-items', async (request: FastifyRequest, reply: FastifyReply) => {
    ensureNonProd();
    const { items } = (request.body as any) ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ error: 'items array required' });
    }

    const created: string[] = [];
    for (const it of items) {
      const {
        userEmail,
        reportedByEmail,
        type = 'PROFILE',
        content = 'Test content',
        reason = 'Test reason',
        priority = 'MEDIUM',
        status = 'PENDING',
      } = it || {};

      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) continue;

      const reportedBy = reportedByEmail
        ? await prisma.user.findUnique({ where: { email: reportedByEmail } })
        : null;

      const rec = await prisma.moderationItem.create({
        data: {
          userId: user.id,
          type,
          content,
          reason,
          priority,
          status,
          ...(reportedBy ? { reportedById: reportedBy.id } : {}),
        },
        select: { id: true },
      });
      created.push(rec.id);
    }

    return reply.send({ ok: true, created });
  });
}

export default testRoutes;
