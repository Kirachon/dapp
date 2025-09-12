/* Global setup: wait for API (8080) and Frontend before tests */
export default async function globalSetup() {
  const apiUrl = (process.env.PLAYWRIGHT_API_BASE || 'http://localhost:8080/health').trim();
  const frontBaseRaw = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
  const frontBase = frontBaseRaw.trim();
  const frontUrl = frontBase.endsWith('/') ? frontBase : frontBase + '/';
  console.log(`[global-setup] API: ${apiUrl}, Frontend: ${frontUrl}`);

  async function waitFor(url: string, timeoutMs = 60000, intervalMs = 1000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url, { method: 'GET' } as any);
        // Consider the service "ready" if it responds (any non-5xx status)
        if (res.status >= 200 && res.status < 500) return;
      } catch {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Service not ready: ${url}`);
  }

  // Phase 8: Enhanced service readiness checks with retries
  try {
    await waitFor(apiUrl, 60000, 1000);
    console.log('[global-setup] ✅ API service ready');
  } catch (error) {
    console.error(`[global-setup] ❌ API service failed to start: ${error}`);
    throw error;
  }

  try {
    // Try the default frontend port first (3000)
    const defaultFrontendUrl = 'http://localhost:3000/';
    await waitFor(defaultFrontendUrl, 60000, 1000);
    console.log('[global-setup] ✅ Frontend service ready at http://localhost:3000');
  } catch (error) {
    console.error(`[global-setup] ❌ Frontend service failed to start: ${error}`);
    // In development, frontend might be on a different port - try common alternatives
    const alternativePorts = ['3001', '3002', '3003', '3004'];
    for (const port of alternativePorts) {
      const altUrl = `http://localhost:${port}/`;
      try {
        await waitFor(altUrl, 10000, 1000);
        console.log(`[global-setup] ✅ Frontend found on alternative port: ${altUrl}`);
        process.env.PLAYWRIGHT_BASE_URL = altUrl.slice(0, -1); // Remove trailing slash
        return;
      } catch {
        // Continue to next port
      }
    }
    throw error;
  }

  console.log('[global-setup] ✅ All services ready');
}
