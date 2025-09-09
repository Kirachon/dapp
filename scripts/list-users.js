const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true }, orderBy: { createdAt: 'desc' } });
    console.log('USERS', users);
  } catch (e) { console.error(e); }
  finally { await prisma.$disconnect(); }
})();

