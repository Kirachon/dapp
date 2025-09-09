const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  const email = 'augster_optA_local.dev@local.dev';
  try {
    const u = await prisma.user.findUnique({ where: { email } });
    console.log('USER', u ? { id: u.id, email: u.email } : null);
  } catch (e) { console.error(e); }
  finally { await prisma.$disconnect(); }
})();

