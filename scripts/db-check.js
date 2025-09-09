// Quick DB check using Prisma $queryRaw to avoid model dependency
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  const tables = ['User','Profile','Match','Message','Conversation'];
  try {
    const existence = {};
    for (const t of tables) {
      const [row] = await prisma.$queryRawUnsafe(
        `SELECT to_regclass('public."${t}"')::text as exists`);
      existence[t] = row && row.exists ? 'present' : 'missing';
    }

    const counts = {};
    for (const t of tables) {
      if (existence[t] === 'present') {
        try {
          const [row] = await prisma.$queryRawUnsafe(
            `SELECT count(*)::int AS c FROM "${t}"`);
          counts[t] = row ? row.c : null;
        } catch (e) {
          counts[t] = 'error';
        }
      } else {
        counts[t] = null;
      }
    }

    console.log('TABLE_EXISTENCE', existence);
    console.log('ROW_COUNTS', counts);
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('DB_CHECK_ERROR', e);
    await prisma.$disconnect();
    process.exit(1);
  }
})();

