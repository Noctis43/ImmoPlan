const http = require('http');
const https = require('https');

/**
 * Vérifie que le backend Express répond (GET /api/health).
 * @param {string} healthUrl
 * @param {{ timeoutMs?: number, intervalMs?: number }} [options]
 * @returns {Promise<boolean>}
 */
async function waitForBackend(healthUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const intervalMs = options.intervalMs ?? 1_500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await pingOnce(healthUrl);
    if (ok) return true;
    // eslint-disable-next-line no-await-in-loop
    await sleep(intervalMs);
  }
  return false;
}

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
function pingOnce(url) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve(false);
      return;
    }

    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        timeout: 4_000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { waitForBackend, pingOnce };
