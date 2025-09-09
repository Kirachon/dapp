(async () => {
  try {
    const res = await fetch('http://127.0.0.1:8080/auth/recipe/session/handshake', {
      method: 'GET',
      headers: { rid: 'session' }
    });
    console.log('HANDSHAKE', res.status, await res.text());

    const res2 = await fetch('http://127.0.0.1:8080/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', rid: 'emailpassword' },
      body: JSON.stringify({ formFields: [ { id: 'email', value: 'augster+test@local.dev' }, { id: 'password', value: 'Password123!' } ]})
    });
    console.log('SIGNUP', res2.status, await res2.text());
  } catch (e) {
    console.error('ERR', e);
  }
})();

