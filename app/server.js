// FMSuperScout — lokale server (geen dependencies nodig)
// Serveert de web-app en de meest recente data-dump van de BepInEx-plugin.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');

const PORT = Number(process.env.PORT) || 8765;
const APP_DIR = __dirname;
// De plugin schrijft dumps hierheen:
const DATA_DIR = path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout');
// Groeiende ijkset: elke dump bevat spelers met een échte in-game waarde; die bewaren we hier
// (dedup op speler-id, laatste waarneming wint) zodat de kalibratieset vanzelf groeit over
// saves/seizoenen/competities heen. Blijft volledig lokaal. Zie docs/value-model.md.
const VALUE_HISTORY = path.join(DATA_DIR, 'value-history.json');
let archivedDumpTime = null;

// App-modus (standalone venster): server sluit zichzelf af zodra het venster dicht is.
// De pagina stuurt elke paar seconden een heartbeat; blijft die te lang uit, dan stoppen we.
const APP_MODE = process.env.FMSS_APP === '1';
let lastBeat = Date.now();
let pendingExit = null;
if (APP_MODE) {
  setInterval(() => {
    if (Date.now() - lastBeat > 12000) { console.log('Venster gesloten, server stopt.'); process.exit(0); }
  }, 3000);
}

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

// Werk de ijkset bij met de spelers uit deze dump die een echte waarde hebben.
// Draait op de achtergrond (setImmediate) zodat het de /api/dump-respons niet ophoudt.
function archiveValues(dumpPath) {
  try {
    const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
    const players = dump.players || [];
    const gd = (dump.meta && dump.meta.gameDate) || null;
    // Bestaande historie inladen en op id indexeren (laatste waarneming wint).
    let byId = new Map();
    try {
      const prev = JSON.parse(fs.readFileSync(VALUE_HISTORY, 'utf8'));
      for (const r of (prev.rows || [])) byId.set(r.id, r);
    } catch { /* nog geen historie */ }
    let added = 0;
    for (const p of players) {
      if (!(p.value > 0) || p.id == null) continue;   // alleen échte in-game waardes
      if (!byId.has(p.id)) added++;
      byId.set(p.id, {
        id: p.id, name: p.name, gd, age: p.age,
        ca: p.ca, pa: p.pa, wrep: p.worldRep, crep: p.clubRep, val: p.value,
      });
    }
    const rows = [...byId.values()];
    fs.writeFileSync(VALUE_HISTORY, JSON.stringify({ updated: new Date().toISOString(), count: rows.length, rows }));
    console.log(`IJkset bijgewerkt: ${rows.length} spelers (${added} nieuw).`);
  } catch (e) {
    console.error('IJkset bijwerken mislukt:', e.message);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/status') {
    const dump = latestDump();
    let plugin = null;
    try {
      const sf = path.join(DATA_DIR, 'status.json');
      if (fs.existsSync(sf)) {
        plugin = JSON.parse(fs.readFileSync(sf, 'utf8'));
        plugin.mtime = fs.statSync(sf).mtimeMs;
      }
    } catch { /* geen status */ }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      dataDir: DATA_DIR,
      hasDump: !!dump,
      dumpFile: dump ? path.basename(dump.full) : null,
      dumpTime: dump ? dump.mtime : null,
      dumpSize: dump ? fs.statSync(dump.full).size : null,
      appMode: APP_MODE,
      plugin,
    }));
    return;
  }

  if (url.pathname === '/api/heartbeat') {
    lastBeat = Date.now();
    if (pendingExit) { clearTimeout(pendingExit); pendingExit = null; }   // herladen: toch openhouden
    res.writeHead(204); res.end();
    return;
  }

  if (url.pathname === '/api/bye') {
    res.writeHead(204); res.end();
    // Venster dicht: stop, tenzij binnen 2,5s een nieuwe heartbeat komt (bij herladen).
    if (APP_MODE && !pendingExit) pendingExit = setTimeout(() => process.exit(0), 2500);
    return;
  }

  if (url.pathname === '/api/fmstatus') {
    // Draait Football Manager? (De plugin leeft in fm.exe, dus zonder draaiende game
    // wordt een data-verzoek nooit opgepikt.)
    execFile('tasklist', ['/FI', 'IMAGENAME eq fm.exe', '/NH'], { windowsHide: true }, (err, out) => {
      const running = !err && /fm\.exe/i.test(out || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ running }));
    });
    return;
  }

  if (url.pathname === '/api/refresh' && req.method === 'POST') {
    // Schrijf een trigger-bestand; de plugin pollt hierop en start een dump.
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(path.join(DATA_DIR, 'request.flag'), String(Date.now()));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(e) }));
    }
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
    // Ijkset bijwerken zodra een nieuwe dump wordt geladen (één keer per dump, op de achtergrond).
    if (dump.mtime !== archivedDumpTime) {
      archivedDumpTime = dump.mtime;
      setImmediate(() => archiveValues(dump.full));
    }
    return;
  }

  if (url.pathname === '/api/value-history') {
    // Groeiende ijkset uitlezen (voor herijking van het waardemodel). ?full=1 geeft alle rijen.
    try {
      const hist = JSON.parse(fs.readFileSync(VALUE_HISTORY, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(url.searchParams.get('full') === '1'
        ? JSON.stringify(hist)
        : JSON.stringify({ updated: hist.updated, count: hist.count }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ updated: null, count: 0 }));
    }
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

const URL_LOCAL = `http://localhost:${PORT}`;

// Open de app in een chromeless Edge-venster (app-modus); anders in de standaardbrowser.
function openApp() {
  const edge = [
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].find(p => { try { return fs.existsSync(p); } catch { return false; } });
  try {
    if (edge) {
      const profile = path.join(DATA_DIR, 'window');
      spawn(edge, [`--app=${URL_LOCAL}`, `--user-data-dir=${profile}`, '--window-size=1440,900', '--no-first-run'],
        { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('cmd', ['/c', 'start', '""', URL_LOCAL], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch { /* browser openen mislukt: gebruiker kan handmatig naar de URL */ }
}

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    // Al een instantie actief: gewoon het venster (opnieuw) openen en afsluiten.
    if (APP_MODE) openApp();
    else console.error(`Poort ${PORT} is al in gebruik; open ${URL_LOCAL}`);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`FMSuperScout draait op ${URL_LOCAL}`);
  console.log(`Data-map: ${DATA_DIR}`);
  if (APP_MODE) openApp();
});
