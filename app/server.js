// FMSuperScout — lokale server (geen dependencies nodig)
// Serveert de web-app en de meest recente data-dump van de BepInEx-plugin.
'use strict';

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');

const PORT = Number(process.env.PORT) || 8765;
const APP_DIR = __dirname;
// De plugin schrijft dumps hierheen:
const DATA_DIR = path.join(os.homedir(), 'AppData', 'Local', 'FMSuperScout');

// App-modus (standalone venster): server sluit zichzelf af zodra het venster dicht is.
// Het sluiten van het venster wordt betrouwbaar gemeld via /api/bye (pagehide-beacon).
// De heartbeat is alleen een vangnet als dat beacon niet aankwam. De drempel staat ruim
// (90s): browsers knijpen timers in een achtergrondvenster af tot ~1×/min, en een te
// strakke drempel liet de server dan tijdens het spelen sneuvelen → "Nieuwe data" gaf
// daarna een fout omdat de server weg was. Elke API-aanvraag telt ook als teken van leven.
const APP_MODE = process.env.FMSS_APP === '1';
let lastBeat = Date.now();
let pendingExit = null;
if (APP_MODE) {
  setInterval(() => {
    if (Date.now() - lastBeat > 90000) { console.log('Venster gesloten (geen heartbeat), server stopt.'); process.exit(0); }
  }, 5000);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// ---------- zelf-update ----------
// POST /api/update-install downloadt de nieuwste Setup.exe uit onze GitHub-release,
// verifieert de SHA-256 tegen het .sha256-asset uit dezelfde release en start dan de
// installer. Daarna stopt de server zichzelf, zodat de installer node.exe en de
// app-bestanden kan vervangen. GET /api/update-status geeft de voortgang aan de pagina.
let updState = { phase: 'idle' };

function httpsGet(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'FMSuperScout-updater' }, timeout: 30000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(httpsGet(res.headers.location, redirects - 1));
      } else if (res.statusCode !== 200) {
        res.resume(); reject(new Error('HTTP ' + res.statusCode));
      } else resolve(res);
    }).on('error', reject);
    // Zonder time-out blijft de update-pill eeuwig op "downloaden" hangen bij een
    // stille verbinding; nu valt hij netjes terug op de releasepagina-link.
    req.on('timeout', () => req.destroy(new Error('netwerk-time-out')));
  });
}
async function readAll(res) { const chunks = []; for await (const c of res) chunks.push(c); return Buffer.concat(chunks); }

async function runUpdate() {
  updState = { phase: 'downloading', pct: 0 };
  const rel = JSON.parse((await readAll(await httpsGet('https://api.github.com/repos/mavarobli/FMSuperScout/releases/latest'))).toString('utf8'));
  const exeAsset = (rel.assets || []).find(a => a.name === 'FMSuperScout-Setup.exe');
  const shaAsset = (rel.assets || []).find(a => a.name === 'FMSuperScout-Setup.exe.sha256');
  // Zonder hash-asset niet installeren: de hash-check is de enige integriteitscontrole.
  if (!exeAsset || !shaAsset) throw new Error('Release-assets onvolledig (exe of .sha256 ontbreekt)');

  const dir = path.join(DATA_DIR, 'update');
  fs.mkdirSync(dir, { recursive: true });
  const exePath = path.join(dir, 'FMSuperScout-Setup.exe');
  const res = await httpsGet(exeAsset.browser_download_url);
  const total = Number(res.headers['content-length']) || exeAsset.size || 0;
  const hash = crypto.createHash('sha256');
  let got = 0;
  const out = fs.createWriteStream(exePath);
  await new Promise((resolve, reject) => {
    res.on('data', c => {
      got += c.length; hash.update(c);
      if (total) updState = { phase: 'downloading', pct: Math.min(99, Math.round(100 * got / total)) };
    });
    res.pipe(out);
    out.on('finish', resolve);
    res.on('error', reject); out.on('error', reject);
  });

  updState = { phase: 'verifying' };
  const expect = (await readAll(await httpsGet(shaAsset.browser_download_url))).toString('utf8').trim().split(/\s+/)[0].toLowerCase();
  if (hash.digest('hex') !== expect) {
    try { fs.unlinkSync(exePath); } catch { }
    throw new Error('SHA-256 komt niet overeen, download verwijderd');
  }

  updState = { phase: 'launching' };
  // 'spawn'-event afwachten: pas als Windows het proces echt gestart heeft mag de
  // server zichzelf afsluiten. Een spawn-fout (SmartScreen-block, ontbrekend bestand)
  // wordt zo een nette foutstatus in plaats van een app die zomaar verdwijnt.
  await new Promise((resolve, reject) => {
    const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
    child.once('spawn', () => { child.unref(); resolve(); });
    child.once('error', reject);
  });
  // Korte adempauze zodat de pagina de eindstatus nog kan ophalen, dan vrij baan
  // voor de installer (die node.exe moet kunnen vervangen).
  setTimeout(() => { console.log('Installer gestart, server stopt voor de update.'); process.exit(0); }, 1500);
}

// ---------- ontwikkel-historie (trends) ----------
// De app stuurt na elke geladen dump een compacte momentopname (uid → [ca, pa, waarde]).
// Opslag is delta-only: het eerste punt per speler is de basislijn; daarna komt er alleen
// een punt bij als CA of PA veranderd is, of de waarde meer dan 2,5% verschoven is (FM
// herberekent waardes voortdurend een beetje — dat geruis slaan we bewust niet op).
// Een oudere in-game datum dan de laatste (save teruggeladen) gooit de "toekomst" weg.
// Bestand per manager (carrière) in DATA_DIR\history; datums yyyy-mm-dd sorteren als tekst.
const HIST_DIR = path.join(DATA_DIR, 'history');
const HIST_MAX_DATES = 120;   // ~2+ seizoenen wekelijks dumpen; daarboven oudste samenvouwen
let histCache = null, histCacheFile = null;

function histSlug(manager) {
  const s = String(manager || 'default').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (s || 'default').slice(0, 60);
}
function histFile(manager) { return path.join(HIST_DIR, histSlug(manager) + '.json'); }
function loadHist(manager) {
  const file = histFile(manager);
  if (histCacheFile === file && histCache) return histCache;
  let h = { manager: String(manager || 'default'), dates: [], players: {} };
  try { h = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* nog geen historie */ }
  histCache = h; histCacheFile = file;
  return h;
}
// Laatst bekende [ca,pa,waarde] van een speler, in datumvolgorde.
function histLastPoint(entries, dates) {
  for (let i = dates.length - 1; i >= 0; i--) { const e = entries[dates[i]]; if (e) return e; }
  return null;
}
function mergeSnapshot(manager, gameDate, players) {
  const h = loadHist(manager);

  // Rewind of her-dump op dezelfde datum: alle punten vanaf die datum vervallen.
  if (h.dates.length && h.dates[h.dates.length - 1] >= gameDate) {
    const drop = new Set(h.dates.filter(d => d >= gameDate));
    h.dates = h.dates.filter(d => d < gameDate);
    for (const uid of Object.keys(h.players)) {
      const e = h.players[uid];
      for (const d of drop) delete e[d];
      if (!Object.keys(e).length) delete h.players[uid];
    }
  }

  let added = 0;
  for (const uid in players) {
    const [ca, pa, val] = players[uid];
    const entries = h.players[uid];
    const prev = entries ? histLastPoint(entries, h.dates) : null;
    const valJump = prev ? Math.abs((val ?? 0) - (prev[2] ?? 0)) > Math.max(10000, (prev[2] ?? 0) * 0.025) : true;
    if (prev && prev[0] === ca && prev[1] === pa && !valJump) continue;
    (h.players[uid] || (h.players[uid] = {}))[gameDate] = [ca, pa, val];
    added++;
  }
  h.dates.push(gameDate);

  // Snoeien: oudste datums samenvouwen tot een nieuwe basislijn zodat het bestand
  // begrensd blijft. Per speler blijft zijn laatst bekende stand vóór de zaaglijn
  // bewaard als basispunt, dus geen reeks raakt zijn startwaarde kwijt.
  if (h.dates.length > HIST_MAX_DATES) {
    const cut = h.dates.length - HIST_MAX_DATES;
    const dropped = h.dates.slice(0, cut), newBase = h.dates[cut];
    for (const uid of Object.keys(h.players)) {
      const e = h.players[uid];
      let base = null;
      for (const d of dropped) if (e[d]) { base = e[d]; delete e[d]; }
      if (base && !e[newBase]) e[newBase] = base;
      if (!Object.keys(e).length) delete h.players[uid];
    }
    h.dates = h.dates.slice(cut);
  }

  // Atomair wegschrijven: eerst .tmp, dan hernoemen — een crash halverwege laat de
  // bestaande historie intact in plaats van een half JSON-bestand achter.
  fs.mkdirSync(HIST_DIR, { recursive: true });
  const file = histFile(manager);
  fs.writeFileSync(file + '.tmp', JSON.stringify(h));
  fs.renameSync(file + '.tmp', file);
  histCache = h; histCacheFile = file;
  return { ok: true, dates: h.dates.length, added };
}

// Request-body inlezen (JSON), met limiet: een mega-save-snapshot is ~10 MB.
function readBody(req, limit = 64 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('te groot')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

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
  // DNS-rebinding-bescherming: alleen echte localhost-hosts accepteren. Een kwaadaardige
  // website kan zijn domein naar 127.0.0.1 laten wijzen en wordt dan same-origin met deze
  // server; met een gepinde Host-header (dé standaardremedie) ketst dat af op een 403.
  const host = String(req.headers.host || '').toLowerCase();
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
    res.writeHead(403); res.end('Forbidden');
    return;
  }
  // Cross-site-bescherming bovenop de Host-check: een externe website die met fetch()
  // naar localhost praat stuurt zijn eigen Origin mee — alles wat niet van onze eigen
  // pagina komt (geen Origin = same-origin navigatie, of een localhost-Origin) ketst af.
  // Zonder dit kon een kwaadwillende site een update-install of dump triggeren.
  const origin = String(req.headers.origin || '').toLowerCase();
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.writeHead(403); res.end('Forbidden');
    return;
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // Elke aanvraag is een teken dat het venster nog leeft (naast de expliciete heartbeat),
  // behalve het afscheidsbeacon zelf.
  if (url.pathname !== '/api/bye') lastBeat = Date.now();

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

  if (url.pathname === '/api/bye' && req.method === 'POST') {   // sendBeacon = POST; GET mag de server nooit stoppen
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

  if (url.pathname === '/api/history' && req.method === 'POST') {
    readBody(req).then(buf => {
      const { manager, gameDate, players } = JSON.parse(buf.toString('utf8'));
      if (!gameDate || !players) throw new Error('gameDate/players ontbreekt');
      const r = mergeSnapshot(manager, String(gameDate), players);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(r));
    }).catch(e => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    });
    return;
  }

  if (url.pathname === '/api/history/series') {
    const h = loadHist(url.searchParams.get('manager'));
    const uid = String(url.searchParams.get('uid') || '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ dates: h.dates, entries: h.players[uid] || {} }));
    return;
  }

  if (url.pathname === '/api/update-install' && req.method === 'POST') {
    if (updState.phase === 'idle' || updState.phase === 'error')
      runUpdate().catch(e => { updState = { phase: 'error', error: String(e.message || e) }; });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === '/api/update-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(updState));
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
