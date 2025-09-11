/* Global setup: wait for API (8080) and Frontend before tests */
export default async function globalSetup() {
  const apiUrl = process.env.PLAYWRIGHT_API_BASE || 'http://localhost:8080/health';
  const frontBase = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
  const frontUrl = frontBase.endsWith('/') ? frontBase : frontBase + '/';

  async function waitFor(url: string, timeoutMs = 60000, intervalMs = 1000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url, { method: 'GET' } as any);
        if (res.ok) return;
      } catch {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Service not ready: ${url}`);
  }

  await waitFor(apiUrl, 60000, 1000);
  await waitFor(frontUrl, 60000, 1000);
}
