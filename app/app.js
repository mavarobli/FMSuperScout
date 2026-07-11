// FMSuperScout frontend — vanilla JS, gevirtualiseerde tabel voor 50k+ rijen.
'use strict';

const $ = id => document.getElementById(id);

const state = {
  mode: 'players',        // 'players' | 'staff'
  players: [],
  staff: [],
  meta: null,
  filtered: [],
  sortKey: 'ca',
  sortDir: -1,
  selected: null,
};

// ---------- kolomdefinities ----------
const fmtMoney = v => {
  if (v == null) return '–';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + ' mld';
  if (abs >= 1e6) return (v / 1e6).toFixed(1) + ' M';
  if (abs >= 1e3) return Math.round(v / 1e3) + ' K';
  return String(Math.round(v));
};
const fmtDate = v => v ? String(v).slice(0, 10) : '–';

const PLAYER_COLS = [
  { key: 'name', label: 'Naam', get: p => p.name },
  { key: 'age', label: 'Lft', num: true, get: p => p.age },
  { key: 'pos', label: 'Positie', get: p => p.pos || '–' },
  { key: 'club', label: 'Club', get: p => p.club || 'Clubloos' },
  { key: 'nat', label: 'Nat', get: p => (p.nat || []).join(', ') },
  { key: 'ca', label: 'CA', num: true, cls: 'ca-bar', get: p => p.ca },
  { key: 'pa', label: 'PA', num: true, cls: 'pa-bar', get: p => p.pa },
  { key: 'value', label: 'Waarde', num: true, get: p => p.value, fmt: fmtMoney },
  { key: 'askingPrice', label: 'Vraagprijs', num: true, get: p => p.askingPrice, fmt: fmtMoney },
  { key: 'wage', label: 'Salaris p/w', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'wageDemand', label: 'Salariseis p/w', num: true, get: p => p.wageDemand, fmt: fmtMoney },
  { key: 'expires', label: 'Contract tot', get: p => p.expires, fmt: fmtDate },
  { key: 'interest', label: 'Interesse', get: p => p.interest },
];

const STAFF_COLS = [
  { key: 'name', label: 'Naam', get: p => p.name },
  { key: 'age', label: 'Lft', num: true, get: p => p.age },
  { key: 'job', label: 'Rol', get: p => p.job || '–' },
  { key: 'club', label: 'Club', get: p => p.club || 'Clubloos' },
  { key: 'nat', label: 'Nat', get: p => (p.nat || []).join(', ') },
  { key: 'ca', label: 'CA', num: true, cls: 'ca-bar', get: p => p.ca },
  { key: 'pa', label: 'PA', num: true, cls: 'pa-bar', get: p => p.pa },
  { key: 'wage', label: 'Salaris p/w', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'expires', label: 'Contract tot', get: p => p.expires, fmt: fmtDate },
];

const POSITIONS = ['GK', 'DR', 'DC', 'DL', 'WBR', 'WBL', 'DM', 'MR', 'MC', 'ML', 'AMR', 'AMC', 'AML', 'ST'];

// Attributen gegroepeerd voor het detailpaneel (sleutels zoals de plugin ze dumpt)
const ATTR_GROUPS_PLAYER = {
  'Techniek': ['Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'FreeKicks', 'Heading', 'LongShots', 'LongThrows', 'Marking', 'Passing', 'PenaltyTaking', 'Tackling', 'Technique'],
  'Mentaal': ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'],
  'Fysiek': ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength'],
  'Keeper': ['AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'Handling', 'Kicking', 'OneOnOnes', 'Punching', 'Reflexes', 'RushingOut', 'Throwing'],
};
const ATTR_NL = {
  Corners: 'Corners', Crossing: 'Voorzetten', Dribbling: 'Dribbelen', Finishing: 'Afmaken', FirstTouch: 'Eerste balcontact', FreeKicks: 'Vrije trappen', Heading: 'Koppen', LongShots: 'Afstandsschoten', LongThrows: 'Verre inworpen', Marking: 'Mandekking', Passing: 'Passen', PenaltyTaking: 'Strafschoppen', Tackling: 'Tackelen', Technique: 'Techniek',
  Aggression: 'Agressie', Anticipation: 'Anticiperen', Bravery: 'Moed', Composure: 'Kalmte', Concentration: 'Concentratie', Decisions: 'Beslissingen', Determination: 'Vastberadenheid', Flair: 'Flair', Leadership: 'Leiderschap', OffTheBall: 'Vrijlopen', Positioning: 'Positiespel', Teamwork: 'Teamwork', Vision: 'Inzicht', WorkRate: 'Arbeidsethos',
  Acceleration: 'Acceleratie', Agility: 'Behendigheid', Balance: 'Evenwicht', JumpingReach: 'Sprongkracht', NaturalFitness: 'Natuurlijke fitheid', Pace: 'Snelheid', Stamina: 'Uithoudingsvermogen', Strength: 'Kracht',
  AerialReach: 'Reikwijdte', CommandOfArea: 'Strafschopgebied', Communication: 'Communicatie', Eccentricity: 'Excentriciteit', Handling: 'Vangen', Kicking: 'Uittrappen', OneOnOnes: 'Één-op-één', Punching: 'Stompen', Reflexes: 'Reflexen', RushingOut: 'Uitkomen', Throwing: 'Uitwerpen',
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
    const gameDate = state.meta.gameDate ? ` · in-game: ${fmtDate(state.meta.gameDate)}` : '';
    $('dump-info').textContent = `${state.players.length.toLocaleString('nl-NL')} spelers · ${state.staff.length.toLocaleString('nl-NL')} staf · dump: ${when}${gameDate}`;
    $('empty-state').classList.add('hidden');
    buildStaffRoles();
    applyFilters();
  } catch (e) {
    $('dump-info').textContent = 'fout bij laden';
    console.error(e);
  }
}

function buildStaffRoles() {
  const sel = $('f-staffrole');
  const jobs = [...new Set(state.staff.map(s => s.job).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Alle rollen</option>' + jobs.map(j => `<option>${j}</option>`).join('');
}

// ---------- filters ----------
const parseMoney = s => {
  if (!s) return null;
  s = s.trim().toUpperCase().replace(',', '.');
  const m = s.match(/^([\d.]+)\s*(K|M|MLD|B)?/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (m[2] === 'K') v *= 1e3;
  else if (m[2] === 'M') v *= 1e6;
  else if (m[2] === 'MLD' || m[2] === 'B') v *= 1e9;
  return isNaN(v) ? null : v;
};

const activePos = new Set();

function applyFilters() {
  const rows = state.mode === 'players' ? state.players : state.staff;
  const name = $('f-name').value.trim().toLowerCase();
  const ageMin = +$('f-age-min').value || 0, ageMax = +$('f-age-max').value || 99;
  const caMin = +$('f-ca-min').value || 0, caMax = +$('f-ca-max').value || 999;
  const paMin = +$('f-pa-min').value || 0, paMax = +$('f-pa-max').value || 999;
  const price = parseMoney($('f-price').value);
  const wage = parseMoney($('f-wage').value);
  const nat = $('f-nat').value.trim().toLowerCase();
  const club = $('f-club').value.trim().toLowerCase();
  const wantInterest = $('f-interest').checked;
  const wantListed = $('f-listed').checked;
  const wantLoan = $('f-loan').checked;
  const wantExpiring = $('f-expiring').checked;
  const wantFree = $('f-free').checked;
  const staffRole = $('f-staffrole').value;
  const now = state.meta && state.meta.gameDate ? new Date(state.meta.gameDate) : new Date();
  const inOneYear = new Date(now); inOneYear.setFullYear(inOneYear.getFullYear() + 1);

  state.filtered = rows.filter(p => {
    if (name && !(p.searchName || p.name || '').toLowerCase().includes(name)) return false;
    if (p.age < ageMin || p.age > ageMax) return false;
    if ((p.ca ?? 0) < caMin || (p.ca ?? 0) > caMax) return false;
    if ((p.pa ?? 0) < paMin || (p.pa ?? 0) > paMax) return false;
    if (price != null && (p.askingPrice ?? p.value ?? 0) > price) return false;
    if (wage != null && (p.wageDemand ?? p.wage ?? 0) > wage) return false;
    if (nat && !(p.nat || []).some(n => n.toLowerCase().includes(nat))) return false;
    if (club && !((p.club || '').toLowerCase().includes(club) || (p.div || '').toLowerCase().includes(club))) return false;
    if (activePos.size && !(p.posArr || []).some(x => activePos.has(x))) return false;
    if (wantInterest && !p.interested) return false;
    if (wantListed && !p.listed) return false;
    if (wantLoan && !p.loanListed) return false;
    if (wantExpiring && !(p.expires && new Date(p.expires) < inOneYear)) return false;
    if (wantFree && p.club) return false;
    if (state.mode === 'staff' && staffRole && p.job !== staffRole) return false;
    return true;
  });

  sortRows();
  $('result-count').textContent = state.filtered.length.toLocaleString('nl-NL') + ' resultaten';
  renderTable();
}

function sortRows() {
  const cols = state.mode === 'players' ? PLAYER_COLS : STAFF_COLS;
  const col = cols.find(c => c.key === state.sortKey) || cols[0];
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
  const cols = state.mode === 'players' ? PLAYER_COLS : STAFF_COLS;
  const head = $('grid-head');
  head.innerHTML = cols.map(c =>
    `<th data-key="${c.key}" class="${c.key === state.sortKey ? 'sorted' : ''}">${c.label}${c.key === state.sortKey ? (state.sortDir < 0 ? ' ▼' : ' ▲') : ''}</th>`
  ).join('');
  head.querySelectorAll('th').forEach(th => th.onclick = () => {
    const k = th.dataset.key;
    if (state.sortKey === k) state.sortDir *= -1;
    else { state.sortKey = k; state.sortDir = -1; }
    sortRows(); renderTable();
  });
  $('grid-spacer').style.height = (state.filtered.length * ROW_H) + 'px';
  renderVisible();
}

function renderVisible() {
  const wrap = $('table-wrap');
  const cols = state.mode === 'players' ? PLAYER_COLS : STAFF_COLS;
  const first = Math.max(0, Math.floor(wrap.scrollTop / ROW_H) - 10);
  const count = Math.ceil(wrap.clientHeight / ROW_H) + 20;
  const slice = state.filtered.slice(first, first + count);
  const body = $('grid-body');
  body.style.transform = `translateY(${first * ROW_H}px)`;
  body.innerHTML = slice.map((p, i) => {
    const idx = first + i;
    const tds = cols.map(c => {
      let v = c.get(p);
      if (c.fmt) v = c.fmt(v);
      if (v == null) v = '–';
      if (c.key === 'interest') {
        v = p.interested ? `<span class="tag yes">JA</span>` : '';
        if (p.listed) v += `<span class="tag listed">lijst</span>`;
      }
      return `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${v}</td>`;
    }).join('');
    return `<tr data-i="${idx}" class="${state.selected === p ? 'sel' : ''}" style="height:${ROW_H}px">${tds}</tr>`;
  }).join('');
  body.querySelectorAll('tr').forEach(tr => tr.onclick = () => showDetail(state.filtered[+tr.dataset.i]));
}

$('table-wrap').addEventListener('scroll', () => {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderVisible(); });
});

// ---------- detailpaneel ----------
function attrClass(v) {
  if (v >= 17) return 'g5';
  if (v >= 14) return 'g4';
  if (v >= 10) return 'g3';
  if (v >= 6) return 'g2';
  return 'g1';
}

function showDetail(p) {
  state.selected = p;
  renderVisible();
  const d = $('detail');
  d.classList.remove('hidden');
  const isPlayer = state.mode === 'players';

  let html = `<h2>${p.name}</h2>
  <div class="sub">${p.age} jaar · ${(p.nat || []).join(', ')} · ${p.club || 'Clubloos'}${p.div ? ' (' + p.div + ')' : ''}</div>
  <div class="kv">
    <div><b>CA</b> <span class="ca-bar">${p.ca ?? '–'}</span></div>
    <div><b>PA</b> <span class="pa-bar">${p.pa ?? '–'}</span></div>
    ${isPlayer ? `<div><b>Positie</b> ${p.pos || '–'}</div><div><b>Voet</b> ${p.foot || '–'}</div>` : `<div><b>Rol</b> ${p.job || '–'}</div>`}
    <div><b>Waarde</b> ${fmtMoney(p.value)}</div>
    <div><b>Vraagprijs</b> ${fmtMoney(p.askingPrice)}</div>
    <div><b>Salaris</b> ${fmtMoney(p.wage)} p/w</div>
    <div><b>Salariseis</b> ${fmtMoney(p.wageDemand)} p/w</div>
    <div><b>Contract tot</b> ${fmtDate(p.expires)}</div>
    <div><b>Geboren</b> ${fmtDate(p.dob)}</div>
    ${p.height ? `<div><b>Lengte</b> ${p.height} cm</div>` : ''}
    ${p.persona ? `<div><b>Persoonlijkheid</b> ${p.persona}</div>` : ''}
  </div>`;

  const flags = [];
  if (p.interested) flags.push('Wil naar jouw club');
  if (p.listed) flags.push('Op transferlijst');
  if (p.loanListed) flags.push('Te huur');
  if (!p.club) flags.push('Transfervrij');
  if (flags.length) html += '<div>' + flags.map(f => `<span class="pill">${f}</span>`).join('') + '</div>';

  if (p.attrs) {
    const groups = ATTR_GROUPS_PLAYER;
    const isGk = (p.posArr || []).includes('GK');
    html += '<div class="attr-cols">';
    for (const [g, keys] of Object.entries(groups)) {
      if (isPlayer && g === 'Keeper' && !isGk) continue;
      if (isPlayer && g === 'Techniek' && isGk) continue;
      const rows = keys.filter(k => p.attrs[k] != null);
      if (!rows.length) continue;
      html += `<div class="attr-col"><h3>${g}</h3>` + rows.map(k =>
        `<div class="attr-row"><span>${ATTR_NL[k] || k}</span><span class="v ${attrClass(p.attrs[k])}">${p.attrs[k]}</span></div>`
      ).join('') + '</div>';
    }
    html += '</div>';
  }
  if (p.staffAttrs) {
    html += '<div class="attr-cols"><div class="attr-col"><h3>Staf-attributen</h3>' +
      Object.entries(p.staffAttrs).map(([k, v]) =>
        `<div class="attr-row"><span>${k}</span><span class="v ${attrClass(v)}">${v}</span></div>`
      ).join('') + '</div></div>';
  }
  $('detail-body').innerHTML = html;
}

$('detail-close').onclick = () => { $('detail').classList.add('hidden'); state.selected = null; renderVisible(); };

// ---------- UI wiring ----------
POSITIONS.forEach(pos => {
  const b = document.createElement('button');
  b.textContent = pos;
  b.onclick = () => {
    if (activePos.has(pos)) { activePos.delete(pos); b.classList.remove('on'); }
    else { activePos.add(pos); b.classList.add('on'); }
    applyFilters();
  };
  $('f-pos').appendChild(b);
});

['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-price', 'f-wage', 'f-nat', 'f-club'].forEach(id => {
  let t;
  $(id).addEventListener('input', () => { clearTimeout(t); t = setTimeout(applyFilters, 150); });
});
['f-interest', 'f-listed', 'f-loan', 'f-expiring', 'f-free'].forEach(id => $(id).addEventListener('change', applyFilters));
$('f-staffrole').addEventListener('change', applyFilters);

$('btn-clear').onclick = () => {
  document.querySelectorAll('#filters input[type=text], #filters input[type=number]').forEach(i => i.value = '');
  document.querySelectorAll('#filters input[type=checkbox]').forEach(i => i.checked = false);
  $('f-staffrole').value = '';
  activePos.clear();
  document.querySelectorAll('.poschips button').forEach(b => b.classList.remove('on'));
  applyFilters();
};

function setMode(mode) {
  state.mode = mode;
  $('tab-players').classList.toggle('active', mode === 'players');
  $('tab-staff').classList.toggle('active', mode === 'staff');
  $('fg-pos').style.display = mode === 'players' ? '' : 'none';
  $('fg-staffrole').style.display = mode === 'staff' ? '' : 'none';
  state.selected = null;
  $('detail').classList.add('hidden');
  if (!['name', 'age', 'ca', 'pa', 'club', 'wage', 'expires'].includes(state.sortKey)) { state.sortKey = 'ca'; state.sortDir = -1; }
  applyFilters();
}
$('tab-players').onclick = () => setMode('players');
$('tab-staff').onclick = () => setMode('staff');
$('btn-reload').onclick = loadDump;

loadDump();
