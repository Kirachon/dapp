require('dotenv').config();
const { PrismaClient, VerificationLevel, ProfileVisibility, SwipeDirection, MatchStatus, MessageType } = require('@prisma/client');
const { Client } = require('pg');

async function checkPg() {
  const url = process.env.DATABASE_URL;
  console.log('DATABASE_URL =', url);
  const client = new Client({ connectionString: url });
  await client.connect();
  const res = await client.query('select current_user, current_database()');
  console.log('PG ok:', res.rows[0]);
  await client.end();
}

async function run() {
  await checkPg();
  const prisma = new PrismaClient();
  try {
    const alice = await prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        email: 'alice@example.com',
        passwordHash: 'dev_only_hash',
        roles: ['user'],
        verificationLevel: VerificationLevel.BASIC,
        profile: { create: { name: 'Alice', age: 26, bio: 'Hello, I am Alice', interests: ['hiking','photography'], visibility: ProfileVisibility.PUBLIC } },
        preferences: { create: { minAge: 22, maxAge: 35, distanceKm: 50 } },
        location: { create: { latitude: 37.7749, longitude: -122.4194 } },
      },
    });

    const bob = await prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        email: 'bob@example.com',
        passwordHash: 'dev_only_hash',
        roles: ['user'],
        verificationLevel: VerificationLevel.BASIC,
        profile: { create: { name: 'Bob', age: 28, bio: 'I am Bob', interests: ['music','cooking'], visibility: ProfileVisibility.PUBLIC } },
        preferences: { create: { minAge: 24, maxAge: 34, distanceKm: 30 } },
        location: { create: { latitude: 37.775, longitude: -122.418 } },
      },
    });

    await prisma.swipe.create({ data: { userId: alice.id, targetUserId: bob.id, direction: SwipeDirection.RIGHT } });
    await prisma.swipe.create({ data: { userId: bob.id, targetUserId: alice.id, direction: SwipeDirection.RIGHT } });

    const match = await prisma.match.create({ data: { userIdA: alice.id, userIdB: bob.id, status: MatchStatus.ACTIVE } });
    const conversation = await prisma.conversation.create({ data: { matchId: match.id } });
    await prisma.message.create({ data: { conversationId: conversation.id, senderId: alice.id, type: MessageType.TEXT, content: 'Hi Bob!' } });

    const counts = {
      users: await prisma.user.count(),
      swipes: await prisma.swipe.count(),
      matches: await prisma.match.count(),
      messages: await prisma.message.count(),
    };
    console.log('Seed OK:', counts);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });

