require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Basic reachability
    await prisma.$queryRaw`SELECT 1`;

    // 1) Seed sanity: at least two users exist
    const users = await prisma.user.count();
    if (users < 2) {
      throw new Error(`Expected >= 2 users after seed, found ${users}`);
    }

    // 2) Basic query sanity: ensure at least one moderation item lookup works
    await prisma.moderationItem.findMany({ take: 1 });

    console.log('✅ Data validation passed');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Data validation failed:', e?.message || e);
  process.exit(1);
});
