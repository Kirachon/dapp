const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'st__%';"
    );
    const tables = rows.map(r => r.tablename);
    console.log('Found ST tables:', tables);
    for (const t of tables) {
      console.log('Dropping table', t);
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    }
    console.log('Done');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('DROP_ERROR', e);
    await prisma.$disconnect();
    process.exit(1);
  }
})();

