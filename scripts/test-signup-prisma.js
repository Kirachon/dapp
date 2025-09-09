(async () => {
  const email = 'augster+test2@local.dev';
  try {
    const res = await fetch('http://127.0.0.1:8080/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', rid: 'emailpassword' },
      body: JSON.stringify({ formFields: [ { id: 'email', value: email }, { id: 'password', value: 'Password123!' } ]})
    });
    console.log('SIGNUP', res.status, await res.text());
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const u = await prisma.user.findUnique({ where: { email } });
    console.log('DB', u ? { id: u.id, email: u.email } : null);
    await prisma.$disconnect();
  } catch (e) {
    console.error('ERR', e);
  }
})();

