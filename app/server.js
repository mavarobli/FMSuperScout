// FMSuperScout — lokale server (geen dependencies nodig)
// Serveert de web-app en de meest recente data-dump van de BepInEx-plugin.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8765;
const APP_DIR = __dirname;
// De plugin schrijft dumps hierheen:
const DATA_DIR = path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function latestDump() {
  try {
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.startsWith('dump') && f.endsWith('.json'))
      .map(f => {
        const full = path.join(DATA_DIR, f);
        return { full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    return files[0] || null;
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/status') {
    const dump = latestDump();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      dataDir: DATA_DIR,
      hasDump: !!dump,
      dumpFile: dump ? path.basename(dump.full) : null,
      dumpTime: dump ? dump.mtime : null,
      dumpSize: dump ? fs.statSync(dump.full).size : null,
    }));
    return;
  }

  if (url.pathname === '/api/dump') {
    const dump = latestDump();
    if (!dump) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Nog geen dump gevonden. Druk in FM26 op de dump-hotkey (F9).' }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': fs.statSync(dump.full).size,
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(dump.full).pipe(res);
    return;
  }

  // Statische bestanden
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^([.][.][\\/])+/, '');
  const full = path.join(APP_DIR, file);
  if (!full.startsWith(APP_DIR) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
    res.writeHead(404); res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
  fs.createReadStream(full).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`FMSuperScout draait op http://localhost:${PORT}`);
  console.log(`Data-map: ${DATA_DIR}`);
});
