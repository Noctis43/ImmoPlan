const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy');

/** @type {import('http').Server | null} */
let server = null;

/**
 * Sert le build React et proxy /api + /socket.io vers le backend Express.
 * Permet d’utiliser VITE_API_URL=/api sans modifier le backend (CORS).
 *
 * @param {string} distDir
 * @param {{ port: number, proxyTarget: string }} options
 * @returns {Promise<{ port: number, url: string }>}
 */
function startStaticServer(distDir, options) {
  const { port, proxyTarget } = options;
  const absoluteDist = path.resolve(distDir);

  if (!fs.existsSync(path.join(absoluteDist, 'index.html'))) {
    return Promise.reject(
      new Error(
        `Build frontend introuvable : ${path.join(absoluteDist, 'index.html')}. Exécutez « npm run electron:build:frontend ».`
      )
    );
  }

  const proxy = httpProxy.createProxyServer({
    target: proxyTarget,
    changeOrigin: true,
    ws: true,
  });

  proxy.on('error', (err, _req, res) => {
    if (res && !res.headersSent && typeof res.writeHead === 'function') {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        'Backend Express injoignable. Démarrez-le manuellement (port 3000) puis relancez ImmoPlan.'
      );
    }
    console.error('[electron/static-server] Erreur proxy:', err.message);
  });

  return new Promise((resolve, reject) => {
    const instance = http.createServer((req, res) => {
      const url = req.url || '/';

      if (url.startsWith('/api') || url.startsWith('/socket.io')) {
        proxy.web(req, res);
        return;
      }

      serveStaticFile(absoluteDist, url, res);
    });

    instance.on('upgrade', (req, socket, head) => {
      if ((req.url || '').startsWith('/socket.io')) {
        proxy.ws(req, socket, head);
      } else {
        socket.destroy();
      }
    });

    instance.on('error', reject);

    instance.listen(port, '127.0.0.1', () => {
      server = instance;
      const address = instance.address();
      const actualPort =
        address && typeof address === 'object' ? address.port : port;
      resolve({
        port: actualPort,
        url: `http://127.0.0.1:${actualPort}`,
      });
    });
  });
}

/**
 * @param {string} distDir
 * @param {string} urlPath
 * @param {import('http').ServerResponse} res
 */
function serveStaticFile(distDir, urlPath, res) {
  let safePath = decodeURIComponent(urlPath.split('?')[0]);
  if (safePath === '/') safePath = '/index.html';

  const filePath = path.normalize(path.join(distDir, safePath));
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      res.writeHead(200, { 'Content-Type': contentType(filePath) });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
  });
}

/**
 * @param {string} filePath
 */
function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
    '.map': 'application/json',
  };
  return map[ext] || 'application/octet-stream';
}

function stopStaticServer() {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => {
      server = null;
      resolve();
    });
  });
}

module.exports = { startStaticServer, stopStaticServer };
