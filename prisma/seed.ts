import { PrismaClient, VerificationLevel, ProfileVisibility, SwipeDirection, MatchStatus, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // basic fixture users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      passwordHash: 'dev_only_hash',
      roles: ['user'],
      verificationLevel: VerificationLevel.BASIC,
      profile: {
        create: {
          name: 'Alice',
          age: 26,
          bio: 'Hello, I am Alice',
          interests: ['hiking', 'photography'],
          visibility: ProfileVisibility.PUBLIC,
        },
      },
      preferences: {
        create: { minAge: 22, maxAge: 35, distanceKm: 50 },
      },
      location: {
        create: { latitude: 37.7749, longitude: -122.4194 },
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash: 'dev_only_hash',
      roles: ['user'],
      verificationLevel: VerificationLevel.BASIC,
      profile: {
        create: {
          name: 'Bob',
          age: 28,
          bio: 'I am Bob',
          interests: ['music', 'cooking'],
          visibility: ProfileVisibility.PUBLIC,
        },
      },
      preferences: {
        create: { minAge: 24, maxAge: 34, distanceKm: 30 },
      },
      location: {
        create: { latitude: 37.775, longitude: -122.418 },
      },
    },
  });

  // swipes and match
  await prisma.swipe.create({ data: { userId: alice.id, targetUserId: bob.id, direction: SwipeDirection.RIGHT } });
  await prisma.swipe.create({ data: { userId: bob.id, targetUserId: alice.id, direction: SwipeDirection.RIGHT } });

  const match = await prisma.match.create({ data: { userIdA: alice.id, userIdB: bob.id, status: MatchStatus.ACTIVE } });
  const conversation = await prisma.conversation.create({ data: { matchId: match.id } });
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: alice.id,
      type: MessageType.TEXT,
      content: 'Hi Bob!'
    },
  });
}

main()
  .then(async () => {
    console.log('Seed completed');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

