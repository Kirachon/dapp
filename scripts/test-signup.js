// Simple signup test against local API
(async () => {
  try {
    const email = `e2e+${Date.now()}@example.com`;
    const body = {
      formFields: [
        { id: 'email', value: email },
        { id: 'password', value: 'StrongPass1!' }
      ]
    };
    const res = await fetch('http://localhost:8080/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
    process.exit(res.ok ? 0 : 1);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();

