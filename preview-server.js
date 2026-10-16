const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const DIST = path.join(__dirname, 'frontend/dist');
const BACKEND = { host: 'localhost', port: 5000 };

const MIME = {
  '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
  '.png':'image/png',  '.jpg':'image/jpeg', '.ico':'image/x-icon',
  '.svg':'image/svg+xml', '.json':'application/json', '.woff2':'font/woff2',
};

const server = http.createServer((req, res) => {
  // Proxy /api/* to backend
  if (req.url.startsWith('/api/')) {
    const opts = { host: BACKEND.host, port: BACKEND.port, path: req.url, method: req.method, headers: { ...req.headers, host: `${BACKEND.host}:${BACKEND.port}` } };
    const proxy = http.request(opts, pRes => {
      res.writeHead(pRes.statusCode, pRes.headers);
      pRes.pipe(res);
    });
    proxy.on('error', () => res.writeHead(502) && res.end('Backend unavailable'));
    req.pipe(proxy);
    return;
  }

  // Serve static file or SPA fallback
  let filePath = path.join(DIST, url.parse(req.url).pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(4174, '0.0.0.0', () => console.log('Preview: http://127.0.0.1:4174'));
