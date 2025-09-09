const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.findUnique({ where: { email: 'augster+test@local.dev' } });
    console.log('USER', u ? { id: u.id, email: u.email, createdAt: u.createdAt } : null);
  } catch (e) { console.error(e); }
  finally { await prisma.$disconnect(); }
})();

