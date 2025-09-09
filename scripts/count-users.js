const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const n = await prisma.user.count();
    console.log('COUNT', n);
  } catch (e) { console.error(e); }
  finally { await prisma.$disconnect(); }
})();

