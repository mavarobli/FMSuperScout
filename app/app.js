// FMSuperScout frontend — vanilla JS, gevirtualiseerde tabel voor 50k+ rijen.
'use strict';
const $ = id => document.getElementById(id);

const state = {
  mode: 'players',
  players: [], staff: [], meta: {},
  filtered: [],
  sortKey: 'ca', sortDir: -1,
  selected: null,
  cur: localStorage.getItem('fmss_cur') || '£',
  shortlist: new Set(JSON.parse(localStorage.getItem('fmss_shortlist') || '[]')),
};

const GBP_TO_EUR = 1.16;

// ---------- EU/EEA-landen (FM toont Nederlandse namen) ----------
const EU_NATIONS = new Set([
  'Nederland', 'België', 'Duitsland', 'Frankrijk', 'Italië', 'Spanje', 'Portugal', 'Ierland',
  'Oostenrijk', 'Polen', 'Zweden', 'Denemarken', 'Finland', 'Tsjechië', 'Slowakije', 'Hongarije',
  'Roemenië', 'Bulgarije', 'Griekenland', 'Kroatië', 'Slovenië', 'Luxemburg', 'Estland', 'Letland',
  'Litouwen', 'Malta', 'Cyprus',
  // EEA + Zwitserland (voor werkvergunning gelijkgesteld)
  'Noorwegen', 'IJsland', 'Liechtenstein', 'Zwitserland',
].map(s => s.toLowerCase()));

const isEu = p => (p.nat || []).some(n => EU_NATIONS.has((n || '').toLowerCase()));

// ---------- geld ----------
function fmtMoney(v) {
  if (v == null) return '–';
  let val = v, sym = '£';
  if (state.cur === '€') { val = v * GBP_TO_EUR; sym = '€'; }
  if (val === 0) return sym + '0';
  const abs = Math.abs(val);
  if (abs >= 1e9) return sym + (val / 1e9).toFixed(2) + ' mld';
  if (abs >= 1e6) return sym + (val / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sym + Math.round(val / 1e3) + 'K';
  return sym + Math.round(val);
}
const fmtDate = v => v ? String(v).slice(0, 10) : '–';

// ---------- kolommen ----------
const PLAYER_COLS = [
  { key: 'sl', label: '★', star: true },
  { key: 'name', label: 'Naam', get: p => p.name },
  { key: 'age', label: 'Lft', num: true, get: p => p.age },
  { key: 'pos', label: 'Positie', get: p => p.pos || '–' },
  { key: 'club', label: 'Club', get: p => p.club, dimNull: true },
  { key: 'nat', label: 'Nat', get: p => (p.nat || []).join(', ') },
  { key: 'eu', label: 'EU', get: p => isEu(p) ? 1 : 0, render: p => isEu(p) ? '<span class="eu-yes">✓</span>' : '<span class="dim">–</span>' },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca) },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa) },
  { key: 'value', label: 'Waarde', num: true, get: p => p.value, fmt: fmtMoney },
  { key: 'wage', label: 'Salaris p/w', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'expires', label: 'Contract tot', get: p => p.expires, fmt: fmtDate },
  { key: 'interest', label: 'Interesse', get: p => { const i = interestEstimate(p); return i ? i.score : -1; }, render: p => intHtml(p) },
  { key: 'status', label: 'Status', get: p => statusText(p), render: p => statusHtml(p) },
];
const qClass = v => v == null ? '' : v >= 150 ? 'q5' : v >= 120 ? 'q4' : v >= 90 ? 'q3' : v >= 60 ? 'q2' : 'q1';
const qHtml = v => v == null ? '–' : `<span class="${qClass(v)}">${v}</span>`;

// Interesse-inschatting (HEURISTIEK, geen exacte FM-waarde): reputatie jouw club vs
// hun club is de hoofdfactor, plus beschikbaarheid, contract en leeftijd.
function interestEstimate(p) {
  const myRep = state.meta.myClubRep || 0;
  if (!myRep) return null;              // onbekend zonder jouw clubreputatie
  const their = p.clubRep || 0;
  let score = 50; const why = [];
  if (isFree(p)) { score = 78; why.push('clubloos'); }
  else {
    const d = myRep - their;
    if (d >= 500) { score = 82; why.push('stap omhoog'); }
    else if (d >= -500) { score = 66; why.push('gelijkwaardig'); }
    else if (d >= -2000) { score = 45; why.push('kleinere club'); }
    else if (d >= -4000) { score = 26; why.push('veel kleiner'); }
    else { score = 10; why.push('jouw club te klein'); }
  }
  if (p.listed || p.setForRelease) { score += 18; why.push('beschikbaar'); }
  const m = monthsUntil(p.expires);
  if (m != null && m <= 6) { score += 12; why.push('aflopend contract'); }
  if (p.notForSale) { score -= 28; why.push('niet te koop'); }
  if (p.worldRep && p.worldRep > myRep + 1500 && !isFree(p)) { score -= 18; why.push('grotere naam dan club'); }
  if (p.age <= 15) { score = Math.min(score, 8); why.push('te jong (<16)'); }
  else if (p.age <= 17 && !isFree(p)) { score -= 8; why.push('jong, wacht vaak'); }
  if (p.pa >= 155 && their >= myRep && p.age < 24 && !isFree(p)) { score -= 12; why.push('talent, zit goed'); }
  score = Math.max(0, Math.min(100, score));
  const label = score >= 70 ? 'Groot' : score >= 45 ? 'Redelijk' : score >= 25 ? 'Klein' : 'Nee';
  const cls = score >= 70 ? 'int-g' : score >= 45 ? 'int-r' : score >= 25 ? 'int-k' : 'int-n';
  return { score, label, cls, why };
}
function intHtml(p) {
  const i = interestEstimate(p);
  if (!i) return '<span class="dim">?</span>';
  return `<span class="int ${i.cls}" title="${i.why.join(', ')}">${i.label}</span>`;
}
const STAFF_COLS = [
  { key: 'sl', label: '★', star: true },
  { key: 'name', label: 'Naam', get: p => p.name },
  { key: 'age', label: 'Lft', num: true, get: p => p.age },
  { key: 'job', label: 'Rol', get: p => p.job || '–' },
  { key: 'club', label: 'Club', get: p => p.club, dimNull: true },
  { key: 'nat', label: 'Nat', get: p => (p.nat || []).join(', ') },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca) },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa) },
  { key: 'wage', label: 'Salaris p/w', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'expires', label: 'Contract tot', get: p => p.expires, fmt: fmtDate },
];

function statusText(p) { return (p.listed ? 'lijst ' : '') + (p.setForRelease ? 'vrij ' : '') + (isFree(p) ? 'clubloos' : ''); }
function statusHtml(p) {
  let h = '';
  if (isFree(p)) h += '<span class="tag free">clubloos</span>';
  if (p.listed) h += '<span class="tag listed">transferlijst</span>';
  if (p.setForRelease) h += '<span class="tag rel">vrijgegeven</span>';
  if (p.notForSale) h += '<span class="tag nfs">niet te koop</span>';
  return h || '<span class="dim">–</span>';
}
const isFree = p => !p.club;
// Haalbaar = op de lijst, vrijgegeven, clubloos of aflopend contract (<12 mnd), en niet 'niet te koop'.
function isAttainable(p) {
  if (p.notForSale) return false;
  const m = monthsUntil(p.expires);
  return p.listed || p.setForRelease || isFree(p) || (m != null && m <= 12);
}

// ---------- posities & veld ----------
const PITCH = [
  ['ST', 50, 9], ['AML', 17, 24], ['AMC', 50, 24], ['AMR', 83, 24],
  ['ML', 11, 42], ['MC', 50, 42], ['MR', 89, 42], ['DM', 50, 57],
  ['WBL', 11, 64], ['WBR', 89, 64], ['DL', 24, 78], ['DC', 50, 80],
  ['DR', 76, 78], ['GK', 50, 93],
];
const activePos = new Set();

function buildPitch() {
  const nodes = PITCH.map(([pos, x, y]) =>
    `<g class="pos-node" data-pos="${pos}" transform="translate(${x},${y})">
       <circle r="8"></circle><text>${pos}</text></g>`).join('');
  $('pitch-wrap').innerHTML =
    `<svg viewBox="0 0 100 104" xmlns="http://www.w3.org/2000/svg">
       <rect x="1" y="1" width="98" height="102" rx="3" fill="#12301c" stroke="#2a3441"/>
       <line x1="1" y1="52" x2="99" y2="52" stroke="#2a4a34"/>
       <circle cx="50" cy="52" r="10" fill="none" stroke="#2a4a34"/>
       <rect x="30" y="1" width="40" height="14" fill="none" stroke="#2a4a34"/>
       <rect x="30" y="89" width="40" height="14" fill="none" stroke="#2a4a34"/>
       ${nodes}
     </svg>`;
  $('pitch-wrap').querySelectorAll('.pos-node').forEach(n => {
    n.onclick = () => {
      const pos = n.dataset.pos;
      if (activePos.has(pos)) { activePos.delete(pos); n.classList.remove('on'); }
      else { activePos.add(pos); n.classList.add('on'); }
      applyFilters();
    };
  });
}

// ---------- attributen in FM-volgorde ----------
const ATTR_OUTFIELD = {
  'Technisch': ['Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'FreeKicks', 'Heading', 'LongShots', 'LongThrows', 'Marking', 'Passing', 'PenaltyTaking', 'Tackling', 'Technique'],
  'Mentaal': ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'],
  'Fysiek': ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength'],
};
const ATTR_GK = {
  'Keeper': ['AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'FirstTouch', 'Handling', 'Kicking', 'OneOnOnes', 'Passing', 'PenaltyTaking', 'Punching', 'Reflexes', 'RushingOut', 'Throwing', 'Technique'],
  'Mentaal': ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'],
  'Fysiek': ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength'],
};
const ATTR_NL = {
  Corners: 'Hoekschoppen', Crossing: 'Voorzetten', Dribbling: 'Dribbelen', Finishing: 'Afronden', FirstTouch: 'Balaanname', FreeKicks: 'Vrije trappen', Heading: 'Koppen', LongShots: 'Schoten van afstand', LongThrows: 'Verre ingooien', Marking: 'Dekken', Passing: 'Passen', PenaltyTaking: 'Strafschoppen', Tackling: 'Tackelen', Technique: 'Techniek',
  Aggression: 'Agressie', Anticipation: 'Anticipatie', Bravery: 'Moed', Composure: 'Kalmte', Concentration: 'Concentratie', Decisions: 'Beslissingen', Determination: 'Wilskracht', Flair: 'Flair', Leadership: 'Leiderschap', OffTheBall: 'Positiekeuze', Positioning: 'Positiespel', Teamwork: 'Teamwork', Vision: 'Passeeroverzicht', WorkRate: 'Inzet',
  Acceleration: 'Acceleratie', Agility: 'Wendbaarheid', Balance: 'Balans', JumpingReach: 'Sprongkracht', NaturalFitness: 'Natuurlijke fitheid', Pace: 'Snelheid', Stamina: 'Uithoudingsvermogen', Strength: 'Kracht',
  AerialReach: 'Uitreiken', CommandOfArea: 'Beheersing strafschopgebied', Communication: 'Communicatie', Eccentricity: 'Excentriciteit', Handling: 'Vangen', Kicking: 'Uittrappen', OneOnOnes: 'Één-op-één', Punching: 'Stompen', Reflexes: 'Reflexen', RushingOut: 'Uitkomen', Throwing: 'Uitwerpen',
};

// ---------- data laden ----------
async function loadDump() {
  $('dump-info').textContent = 'laden…';
  try {
    const st = await (await fetch('/api/status')).json();
    if (!st.hasDump) {
      $('dump-info').textContent = 'geen dump gevonden';
      $('empty-msg').innerHTML = `Start FM26, laad je save en druk op <b>F9</b>.<br>Dumps worden gezocht in <code>${st.dataDir}</code>.`;
      return;
    }
    const data = await (await fetch('/api/dump')).json();
    state.players = data.players || [];
    state.staff = data.staff || [];
    state.meta = data.meta || {};
    const when = new Date(st.dumpTime).toLocaleString('nl-NL');
    $('dump-info').textContent = `${state.players.length.toLocaleString('nl-NL')} spelers · ${state.staff.length.toLocaleString('nl-NL')} staf · ${when}`;
    const mgr = state.meta.manager, club = state.meta.myClub, rep = state.meta.myClubRep;
    $('club-badge').innerHTML = (mgr || club)
      ? `${mgr ? mgr + ' · ' : ''}<b>${club || '?'}</b>${rep ? ` <span class="dim">(rep ${rep})</span>` : ''}` : '';
    $('empty-state').classList.add('hidden');
    buildStaffRoles();
    applyFilters();
  } catch (e) { $('dump-info').textContent = 'fout bij laden'; console.error(e); }
}

function buildStaffRoles() {
  const jobs = [...new Set(state.staff.map(s => s.job).filter(Boolean))].sort();
  $('f-staffrole').innerHTML = '<option value="">Alle rollen</option>' + jobs.map(j => `<option>${j}</option>`).join('');
}

// ---------- filters ----------
const parseMoney = s => {
  if (!s) return null;
  s = s.trim().toUpperCase().replace(',', '.');
  const m = s.match(/^([\d.]+)\s*(K|M|MLD|B)?/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (m[2] === 'K') v *= 1e3; else if (m[2] === 'M') v *= 1e6; else if (m[2] === 'MLD' || m[2] === 'B') v *= 1e9;
  // invoer is in weergavevaluta → terug naar GBP voor vergelijking
  if (state.cur === '€') v /= GBP_TO_EUR;
  return isNaN(v) ? null : v;
};

function monthsUntil(expires) {
  if (!expires) return null;
  const now = state.meta.gameDate ? new Date(state.meta.gameDate) : new Date();
  const exp = new Date(expires);
  if (isNaN(exp)) return null;
  return (exp - now) / (1000 * 60 * 60 * 24 * 30.44);
}

function applyFilters() {
  let rows = state.mode === 'staff' ? state.staff : state.players;
  const name = $('f-name').value.trim().toLowerCase();
  const ageMin = +$('f-age-min').value || 0, ageMax = +$('f-age-max').value || 99;
  const caMin = +$('f-ca-min').value || 0, caMax = +$('f-ca-max').value || 999;
  const paMin = +$('f-pa-min').value || 0, paMax = +$('f-pa-max').value || 999;
  const price = parseMoney($('f-price').value);
  const wage = parseMoney($('f-wage').value);
  const nat = $('f-nat').value.trim().toLowerCase();
  const onlyEu = $('f-eu').checked, onlyMyClub = $('f-myclub').checked;
  const wantAttain = $('f-attain').checked;
  const minInterest = +$('f-interest').value || 0;
  const wantListed = $('f-listed').checked, wantExp6 = $('f-exp6').checked, wantExp12 = $('f-exp12').checked;
  const wantFree = $('f-free').checked, onlySl = $('f-shortlist').checked || state.mode === 'shortlist';
  const staffRole = $('f-staffrole').value;
  const myClub = (state.meta.myClub || '').toLowerCase();

  if (state.mode === 'shortlist') rows = [...state.players, ...state.staff];

  state.filtered = rows.filter(p => {
    if (onlySl && !state.shortlist.has(p.id)) return false;
    if (name && !((p.name || '').toLowerCase().includes(name) || (p.club || '').toLowerCase().includes(name))) return false;
    if (p.age < ageMin || p.age > ageMax) return false;
    if ((p.ca ?? 0) < caMin || (p.ca ?? 0) > caMax) return false;
    if ((p.pa ?? 0) < paMin || (p.pa ?? 0) > paMax) return false;
    if (price != null && (p.value ?? Infinity) > price) return false;
    if (wage != null && (p.wage ?? Infinity) > wage) return false;
    if (nat && !(p.nat || []).some(n => n.toLowerCase().includes(nat))) return false;
    if (onlyEu && !isEu(p)) return false;
    if (onlyMyClub && (!p.club || p.club.toLowerCase() !== myClub)) return false;
    if (wantFree && !isFree(p)) return false;
    if (wantAttain && !isAttainable(p)) return false;
    if (minInterest > 0) { const i = interestEstimate(p); if (!i || i.score < minInterest) return false; }
    if (wantListed && !p.listed) return false;
    if (wantExp6) { const m = monthsUntil(p.expires); if (m == null || m > 6) return false; }
    if (wantExp12) { const m = monthsUntil(p.expires); if (m == null || m > 12) return false; }
    if (activePos.size && !(p.posArr || []).some(x => activePos.has(x))) return false;
    if (state.mode === 'staff' && staffRole && p.job !== staffRole) return false;
    return true;
  });

  sortRows();
  $('result-count').textContent = state.filtered.length.toLocaleString('nl-NL') + ' resultaten';
  renderTable();
}

function activeCols() {
  return state.mode === 'staff' ? STAFF_COLS : PLAYER_COLS;
}

function sortRows() {
  const col = activeCols().find(c => c.key === state.sortKey) || activeCols()[1];
  if (col.star) return;
  const dir = state.sortDir;
  state.filtered.sort((a, b) => {
    const va = col.get(a), vb = col.get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

// ---------- gevirtualiseerde tabel ----------
const ROW_H = 28;
let renderQueued = false;

function renderTable() {
  const cols = activeCols();
  const head = $('grid-head');
  head.innerHTML = cols.map(c =>
    `<th data-key="${c.key}" class="${c.key === state.sortKey ? 'sorted' : ''}">${c.label}${c.key === state.sortKey ? (state.sortDir < 0 ? ' ▼' : ' ▲') : ''}</th>`).join('');
  head.querySelectorAll('th').forEach(th => th.onclick = () => {
    const k = th.dataset.key;
    if (activeCols().find(c => c.key === k)?.star) return;
    if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = -1; }
    sortRows(); renderTable();
  });
  $('grid-spacer').style.height = (state.filtered.length * ROW_H) + 'px';
  renderVisible();
}

function renderVisible() {
  const wrap = $('table-wrap'), cols = activeCols();
  const first = Math.max(0, Math.floor(wrap.scrollTop / ROW_H) - 10);
  const count = Math.ceil(wrap.clientHeight / ROW_H) + 20;
  const slice = state.filtered.slice(first, first + count);
  const body = $('grid-body');
  body.style.transform = `translateY(${first * ROW_H}px)`;
  body.innerHTML = slice.map((p, i) => {
    const idx = first + i;
    const tds = cols.map(c => {
      if (c.star) {
        const on = state.shortlist.has(p.id);
        return `<td class="star-cell ${on ? 'on' : ''}" data-star="${p.id}">${on ? '★' : '☆'}</td>`;
      }
      if (c.render) return `<td class="${c.num ? 'num' : ''}">${c.render(p)}</td>`;
      let v = c.get(p);
      if (c.dimNull && !v) return `<td class="dim">–</td>`;
      if (c.fmt) v = c.fmt(v);
      if (v == null || v === '') v = '–';
      return `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${v}</td>`;
    }).join('');
    return `<tr data-i="${idx}" class="${state.selected === p ? 'sel' : ''}" style="height:${ROW_H}px">${tds}</tr>`;
  }).join('');
  body.querySelectorAll('tr').forEach(tr => {
    tr.onclick = e => {
      const star = e.target.closest('[data-star]');
      if (star) { toggleShortlist(+star.dataset.star); e.stopPropagation(); return; }
      showDetail(state.filtered[+tr.dataset.i]);
    };
  });
}
$('table-wrap').addEventListener('scroll', () => {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderVisible(); });
});

// ---------- shortlist ----------
function toggleShortlist(id) {
  if (state.shortlist.has(id)) state.shortlist.delete(id); else state.shortlist.add(id);
  localStorage.setItem('fmss_shortlist', JSON.stringify([...state.shortlist]));
  $('sl-count').textContent = state.shortlist.size;
  if (state.mode === 'shortlist' || $('f-shortlist').checked) applyFilters(); else renderVisible();
  if (state.selected) refreshDetailStar();
}
function refreshDetailStar() {
  const el = document.querySelector('.detail-star');
  if (el && state.selected) el.classList.toggle('on', state.shortlist.has(state.selected.id));
}

// ---------- detailpaneel ----------
const attrClass = v => v >= 17 ? 'g5' : v >= 14 ? 'g4' : v >= 10 ? 'g3' : v >= 6 ? 'g2' : 'g1';

function showDetail(p) {
  state.selected = p;
  renderVisible();
  const d = $('detail');
  d.classList.remove('hidden');
  const isPlayer = !!p.attrs;
  const on = state.shortlist.has(p.id);

  let html = `<h2>${p.name} <span class="detail-star ${on ? 'on' : ''}" data-star="${p.id}">${on ? '★' : '☆'}</span></h2>
  <div class="sub">${p.age} jr · ${(p.nat || []).join(', ')}${isEu(p) ? ' · <span class="eu-yes">EU</span>' : ''} · ${p.club || 'clubloos'}</div>
  <div class="kv">
    <div><b>CA</b> <span class="ca-bar">${p.ca ?? '–'}</span></div>
    <div><b>PA</b> <span class="pa-bar">${p.pa ?? '–'}</span></div>
    ${isPlayer ? `<div><b>Positie</b> ${p.pos || '–'}</div><div><b>Voet</b> ${p.foot || '–'}</div>` : `<div><b>Rol</b> ${p.job || '–'}</div>`}
    <div><b>Waarde</b> ${fmtMoney(p.value)}</div>
    <div><b>Salaris</b> ${fmtMoney(p.wage)} p/w</div>
    <div><b>Contract tot</b> ${fmtDate(p.expires)}</div>
    ${p.height ? `<div><b>Lengte</b> ${p.height} cm</div>` : ''}
  </div>`;

  const flags = [];
  if (isFree(p)) flags.push('<span class="pill">Clubloos</span>');
  if (p.listed) flags.push('<span class="pill warn">Op transferlijst</span>');
  if (p.setForRelease) flags.push('<span class="pill warn">Vrijgegeven</span>');
  if (p.notForSale) flags.push('<span class="pill">Niet te koop</span>');
  const m = monthsUntil(p.expires);
  if (m != null && m <= 6) flags.push('<span class="pill warn">Contract &lt; 6 mnd</span>');
  if (isAttainable(p)) flags.push('<span class="pill good">Haalbaar</span>');
  if (isEu(p)) flags.push('<span class="pill good">EU/EEA</span>');
  if (flags.length) html += '<div>' + flags.join('') + '</div>';

  if (isPlayer) {
    const i = interestEstimate(p);
    if (i) html += `<div class="interest-box"><b>Interesse-inschatting:</b> <span class="int ${i.cls}">${i.label}</span> <span class="dim">(${i.score}/100 — ${i.why.join(', ')})</span><br><span class="dim">schatting o.b.v. reputatie, contract &amp; leeftijd — geen exacte FM-waarde</span></div>`;
  }

  if (isPlayer) {
    const isGk = (p.posArr || []).includes('GK');
    const groups = isGk ? ATTR_GK : ATTR_OUTFIELD;
    html += '<div class="attr-cols">';
    for (const [g, keys] of Object.entries(groups)) {
      const rows = keys.filter(k => p.attrs[k] != null);
      if (!rows.length) continue;
      html += `<div class="attr-col"><h3>${g}</h3>` + rows.map(k =>
        `<div class="attr-row"><span>${ATTR_NL[k] || k}</span><span class="v ${attrClass(p.attrs[k])}">${p.attrs[k]}</span></div>`).join('') + '</div>';
    }
    html += '</div>';
  } else if (p.staffAttrs) {
    html += '<div class="attr-cols"><div class="attr-col"><h3>Staf-attributen</h3>' +
      Object.entries(p.staffAttrs).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
        `<div class="attr-row"><span>${k.replace(/_/g, ' ')}</span><span class="v ${attrClass(v)}">${v}</span></div>`).join('') + '</div></div>';
  }
  $('detail-body').innerHTML = html;
  document.querySelector('.detail-star').onclick = () => toggleShortlist(p.id);
}
$('detail-close').onclick = () => { $('detail').classList.add('hidden'); state.selected = null; renderVisible(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('detail-close').onclick(); });

// ---------- UI-bediening ----------
['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-price', 'f-wage', 'f-nat'].forEach(id => {
  let t; $(id).addEventListener('input', () => { clearTimeout(t); t = setTimeout(applyFilters, 150); });
});
['f-eu', 'f-myclub', 'f-attain', 'f-listed', 'f-exp6', 'f-exp12', 'f-free', 'f-shortlist'].forEach(id => $(id).addEventListener('change', applyFilters));
$('f-staffrole').addEventListener('change', applyFilters);
$('f-interest').addEventListener('change', applyFilters);
$('pos-clear').onclick = () => { activePos.clear(); document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on')); applyFilters(); };

$('btn-clear').onclick = () => {
  document.querySelectorAll('#filters input[type=text], #filters input[type=number]').forEach(i => i.value = '');
  document.querySelectorAll('#filters input[type=checkbox]').forEach(i => i.checked = false);
  $('f-staffrole').value = '';
  activePos.clear();
  document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on'));
  applyFilters();
};

$('btn-sidebar').onclick = () => document.body.classList.toggle('sidebar-collapsed');
$('btn-cur').onclick = () => {
  state.cur = state.cur === '£' ? '€' : '£';
  localStorage.setItem('fmss_cur', state.cur);
  $('btn-cur').textContent = state.cur === '£' ? '£ → €' : '€ → £';
  renderVisible();
  if (state.selected) showDetail(state.selected);
};

function setMode(mode) {
  state.mode = mode;
  $('tab-players').classList.toggle('active', mode === 'players');
  $('tab-staff').classList.toggle('active', mode === 'staff');
  $('tab-shortlist').classList.toggle('active', mode === 'shortlist');
  $('fg-pitch').style.display = mode === 'staff' ? 'none' : '';
  $('fg-staffrole').style.display = mode === 'staff' ? '' : 'none';
  state.selected = null;
  $('detail').classList.add('hidden');
  if (!activeCols().find(c => c.key === state.sortKey)) { state.sortKey = 'ca'; state.sortDir = -1; }
  applyFilters();
}
$('tab-players').onclick = () => setMode('players');
$('tab-staff').onclick = () => setMode('staff');
$('tab-shortlist').onclick = () => setMode('shortlist');
$('btn-reload').onclick = loadDump;

// ---------- statuspolling (F9-feedback) ----------
let lastPluginState = null, lastDumpTime = null;
async function poll() {
  try {
    const st = await (await fetch('/api/status')).json();
    const b = $('banner');
    const pl = st.plugin;
    if (pl && pl.state === 'scanning') {
      b.className = 'scanning';
      b.textContent = '⏳ FM26 is de database aan het dumpen…';
    } else if (pl && pl.state === 'done') {
      // nieuwe dump beschikbaar?
      if (st.dumpTime && st.dumpTime !== lastDumpTime && lastDumpTime !== null) {
        b.className = 'done';
        b.textContent = `✓ Nieuwe dump klaar: ${pl.players.toLocaleString('nl-NL')} spelers, ${pl.staff.toLocaleString('nl-NL')} staf — klik hier om te laden`;
        b.onclick = () => { loadDump(); b.className = 'hidden'; };
      } else if (lastPluginState === 'scanning') {
        b.className = 'done';
        b.textContent = `✓ Dump klaar: ${pl.players.toLocaleString('nl-NL')} spelers — klik hier om te laden`;
        b.onclick = () => { loadDump(); b.className = 'hidden'; };
      }
    }
    lastPluginState = pl ? pl.state : null;
    if (st.dumpTime) lastDumpTime = st.dumpTime;
  } catch { /* server weg */ }
  setTimeout(poll, 2000);
}

buildPitch();
$('sl-count').textContent = state.shortlist.size;
$('btn-cur').textContent = state.cur === '£' ? '£ → €' : '€ → £';
loadDump().then(() => poll());
