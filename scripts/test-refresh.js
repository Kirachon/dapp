(async () => {
  const email = 'augster_opta_local.dev@local.dev';
  const pw = 'Password123!';
  const base = 'http://127.0.0.1:8080';
  const headers = { 'content-type': 'application/json', rid: 'emailpassword' };
  const body = JSON.stringify({ formFields: [{ id: 'email', value: email }, { id: 'password', value: pw }] });
  const s = await fetch(base + '/auth/signin', { method: 'POST', headers, body });
  const stRefresh = s.headers.get('st-refresh-token');
  const antiCsrf = s.headers.get('anti-csrf');
  const access = s.headers.get('st-access-token');
  console.log('SIGNIN', s.status, { hasRefresh: !!stRefresh, hasAntiCsrf: !!antiCsrf, hasAccess: !!access });
  if (!stRefresh) { console.error('Missing st-refresh-token'); process.exit(1); }
  const r = await fetch(base + '/auth/session/refresh', {
    method: 'POST',
    headers: { rid: 'session', 'anti-csrf': antiCsrf || '', authorization: 'Bearer ' + stRefresh },
  });
  console.log('REFRESH', r.status, { newAccess: r.headers.get('st-access-token') ? true : false, newRefresh: r.headers.get('st-refresh-token') ? true : false });
})().catch(e => { console.error(e); process.exit(1); });

