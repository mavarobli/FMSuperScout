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
  lang: localStorage.getItem('fmss_lang') || 'nl',
  showPot: false,
  refYear: new Date().getFullYear(),
  refDoy: 183,
  shortlist: new Set(JSON.parse(localStorage.getItem('fmss_shortlist') || '[]')),
  colCfg: JSON.parse(localStorage.getItem('fmss_cols') || '{}'),  // per modus: {order:[], hidden:[]}
};
const GBP_TO_EUR = 1.16;

// ================= i18n =================
const I18N = {
  nl: {
    players: 'Spelers', staff: 'Staf', shortlist: 'Shortlist', searchph: 'Zoek naam of club',
    settings: 'Instellingen', langLabel: 'Taal', curLabel: 'Valuta',
    position: 'Positie', clear: 'wis', staffrole: 'Staf-rol', quality: 'Kwaliteit & leeftijd',
    age: 'Leeftijd', refyear: 'Peiljaar', financial: 'Financieel', maxvalue: 'Max. waarde', maxwage: 'Max. loon p/w',
    origin: 'Herkomst', nat: 'Nationaliteit', euonly: 'Alleen EU/EEA', availability: 'Beschikbaarheid',
    interestmin: 'Interesse ≥', all: 'Alle', attainable: 'Haalbaar', listed: 'Op transferlijst',
    exp6: 'Contract < 6 mnd', exp12: 'Contract < 1 jaar', free: 'Clubloos', myclub: 'Mijn club',
    onlyshortlist: 'Alleen shortlist', clearfilters: 'Filters wissen', fetch: '⬇ Nieuwe data', reload: '⟳',
    nodata: 'Nog geen data geladen', exportcsv: '⬇ Shortlist exporteren (CSV)',
    results: 'resultaten', c_name: 'Naam', c_age: 'Lft', c_pos: 'Positie', c_club: 'Club', c_nat: 'Nat',
    c_value: 'Waarde', c_wage: 'Salaris p/w', c_expires: 'Contract tot', c_interest: 'Interesse',
    c_status: 'Status', c_role: 'Rol', foot: 'Voet', height: 'Lengte', repLabel: 'Reputatie',
    estval: 'Gesch. waarde', wageLabel: 'Salaris', contractLabel: 'Contract tot', free_l: 'transfervrij',
    int_big: 'Groot', int_ok: 'Redelijk', int_small: 'Klein', int_no: 'Nee', interestTitle: 'Interesse-inschatting',
    ambition: 'Ambitie', loyalty: 'Loyaliteit', professionalism: 'Professionaliteit', adaptability: 'Aanpassing',
    pressure: 'Druk', sportsmanship: 'Sportiviteit', temperament: 'Temperament', controversy: 'Controverse', determination: 'Vastberadenheid',
    personaTitle: 'Persoonlijkheid',
    showPot: 'Toon geschatte potentie', potNote: 'geschatte waarden op potentieel (PA)',
    clubless: 'clubloos', copied: 'Gekopieerd', reqSent: '⏳ Verzoek verstuurd — FM haalt de data op…',
    dumping: '⏳ FM is de database aan het ophalen…', dumpReady: '✓ Nieuwe data klaar — klik om te laden',
    started: 'Start FM26, laad je save en druk op F9 (of gebruik de knop "Nieuwe data").',
    tag_free: 'clubloos', tag_listed: 'transferlijst', tag_rel: 'vrijgegeven', tag_nfs: 'niet te koop',
    colHint: 'Sleep om te verplaatsen · rechtsklik voor kolommen', colsTitle: 'Kolommen tonen', colsReset: 'Standaard herstellen',
    g_technical: 'Technisch', g_setpieces: 'Standaardsituaties', g_mental: 'Mentaal', g_physical: 'Fysiek', g_goalkeeping: 'Keepen',
    staffAttrs: 'Staf-attributen',
    clearAll: 'alles wissen', chipSearch: 'Zoek',
  },
  en: {
    players: 'Players', staff: 'Staff', shortlist: 'Shortlist', searchph: 'Search name or club',
    settings: 'Settings', langLabel: 'Language', curLabel: 'Currency',
    position: 'Position', clear: 'clear', staffrole: 'Staff role', quality: 'Quality & age',
    age: 'Age', refyear: 'Game year', financial: 'Financial', maxvalue: 'Max. value', maxwage: 'Max. wage p/w',
    origin: 'Origin', nat: 'Nationality', euonly: 'EU/EEA only', availability: 'Availability',
    interestmin: 'Interest ≥', all: 'All', attainable: 'Attainable', listed: 'Transfer listed',
    exp6: 'Contract < 6 mo', exp12: 'Contract < 1 yr', free: 'Free agent', myclub: 'My club',
    onlyshortlist: 'Shortlist only', clearfilters: 'Clear filters', fetch: '⬇ New data', reload: '⟳',
    nodata: 'No data loaded yet', exportcsv: '⬇ Export shortlist (CSV)',
    results: 'results', c_name: 'Name', c_age: 'Age', c_pos: 'Position', c_club: 'Club', c_nat: 'Nat',
    c_value: 'Value', c_wage: 'Wage p/w', c_expires: 'Contract until', c_interest: 'Interest',
    c_status: 'Status', c_role: 'Role', foot: 'Foot', height: 'Height', repLabel: 'Reputation',
    estval: 'Est. value', wageLabel: 'Wage', contractLabel: 'Contract until', free_l: 'free',
    int_big: 'High', int_ok: 'Fair', int_small: 'Low', int_no: 'No', interestTitle: 'Interest estimate',
    ambition: 'Ambition', loyalty: 'Loyalty', professionalism: 'Professionalism', adaptability: 'Adaptability',
    pressure: 'Pressure', sportsmanship: 'Sportsmanship', temperament: 'Temperament', controversy: 'Controversy', determination: 'Determination',
    personaTitle: 'Personality',
    showPot: 'Show estimated potential', potNote: 'estimated values at potential (PA)',
    clubless: 'free agent', copied: 'Copied', reqSent: '⏳ Request sent — FM is fetching the data…',
    dumping: '⏳ FM is dumping the database…', dumpReady: '✓ New data ready — click to load',
    started: 'Start FM26, load your save and press F9 (or use the "New data" button).',
    tag_free: 'free', tag_listed: 'listed', tag_rel: 'released', tag_nfs: 'not for sale',
    colHint: 'Drag to reorder · right-click for columns', colsTitle: 'Show columns', colsReset: 'Reset to default',
    g_technical: 'Technical', g_setpieces: 'Set Pieces', g_mental: 'Mental', g_physical: 'Physical', g_goalkeeping: 'Goalkeeping',
    staffAttrs: 'Staff attributes',
    clearAll: 'clear all', chipSearch: 'Search',
  },
};
const t = k => (I18N[state.lang][k] ?? I18N.nl[k] ?? k);

// ================= attributen =================
// Volgorde bepaalt de 2-koloms paring: Technisch|Mentaal boven, Fysiek|Standaardsituaties eronder
// (lange groepen samen, korte groepen samen → minder loze ruimte).
const ATTR_GROUPS_OUTFIELD = [
  ['g_technical', ['Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'Heading', 'LongShots', 'Marking', 'Passing', 'Tackling', 'Technique']],
  ['g_mental', ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate']],
  ['g_physical', ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength']],
  ['g_setpieces', ['Corners', 'FreeKicks', 'PenaltyTaking', 'LongThrows']],
];
const ATTR_GROUPS_GK = [
  ['g_goalkeeping', ['AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'FirstTouch', 'Handling', 'Kicking', 'OneOnOnes', 'Passing', 'Punching', 'Reflexes', 'RushingOut', 'Throwing', 'Technique']],
  ['g_mental', ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate']],
  ['g_physical', ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength']],
  ['g_setpieces', ['Corners', 'FreeKicks', 'PenaltyTaking', 'LongThrows']],
];
const ATTR_LABEL = {
  nl: {
    Corners: 'Hoekschoppen', Crossing: 'Voorzetten', Dribbling: 'Dribbelen', Finishing: 'Afwerken', FirstTouch: 'Eerste balcontact', FreeKicks: 'Vrije trappen', Heading: 'Koppen', LongShots: 'Afstandsschoten', LongThrows: 'Verre inworpen', Marking: 'Mandekking', Passing: 'Passing', PenaltyTaking: 'Strafschoppen', Tackling: 'Tackelen', Technique: 'Techniek',
    Aggression: 'Felheid', Anticipation: 'Anticiperen', Bravery: 'Lef', Composure: 'Kalmte', Concentration: 'Concentratie', Decisions: 'Beslissingen', Determination: 'Vastberadenheid', Flair: 'Flair', Leadership: 'Leiderschap', OffTheBall: 'Zonder bal', Positioning: 'Positie kiezen', Teamwork: 'Teamgeest', Vision: 'Inzicht', WorkRate: 'Inzet',
    Acceleration: 'Versnelling', Agility: 'Behendigheid', Balance: 'Evenwicht', JumpingReach: 'Sprongkracht', NaturalFitness: 'Natuurlijke fitheid', Pace: 'Snelheid', Stamina: 'Uithoudingsvermogen', Strength: 'Kracht',
    AerialReach: 'Uitreiken', CommandOfArea: 'Beheersing strafschopgebied', Communication: 'Communicatie', Eccentricity: 'Excentriciteit', Handling: 'Vangen', Kicking: 'Uittrappen', OneOnOnes: 'Één tegen één', Punching: 'Stompen', Reflexes: 'Reflexen', RushingOut: 'Uitkomen', Throwing: 'Uitwerpen',
  },
  en: {
    Corners: 'Corners', Crossing: 'Crossing', Dribbling: 'Dribbling', Finishing: 'Finishing', FirstTouch: 'First Touch', FreeKicks: 'Free Kicks', Heading: 'Heading', LongShots: 'Long Shots', LongThrows: 'Long Throws', Marking: 'Marking', Passing: 'Passing', PenaltyTaking: 'Penalty Taking', Tackling: 'Tackling', Technique: 'Technique',
    Aggression: 'Aggression', Anticipation: 'Anticipation', Bravery: 'Bravery', Composure: 'Composure', Concentration: 'Concentration', Decisions: 'Decisions', Determination: 'Determination', Flair: 'Flair', Leadership: 'Leadership', OffTheBall: 'Off the Ball', Positioning: 'Positioning', Teamwork: 'Teamwork', Vision: 'Vision', WorkRate: 'Work Rate',
    Acceleration: 'Acceleration', Agility: 'Agility', Balance: 'Balance', JumpingReach: 'Jumping Reach', NaturalFitness: 'Natural Fitness', Pace: 'Pace', Stamina: 'Stamina', Strength: 'Strength',
    AerialReach: 'Aerial Reach', CommandOfArea: 'Command of Area', Communication: 'Communication', Eccentricity: 'Eccentricity', Handling: 'Handling', Kicking: 'Kicking', OneOnOnes: 'One on Ones', Punching: 'Punching', Reflexes: 'Reflexes', RushingOut: 'Rushing Out', Throwing: 'Throwing',
  },
};
const attrName = k => (ATTR_LABEL[state.lang][k] ?? k);

// ---------- EU/EEA-landen ----------
const EU_NATIONS = new Set([
  'Nederland', 'België', 'Duitsland', 'Frankrijk', 'Italië', 'Spanje', 'Portugal', 'Ierland',
  'Oostenrijk', 'Polen', 'Zweden', 'Denemarken', 'Finland', 'Tsjechië', 'Slowakije', 'Hongarije',
  'Roemenië', 'Bulgarije', 'Griekenland', 'Kroatië', 'Slovenië', 'Luxemburg', 'Estland', 'Letland',
  'Litouwen', 'Malta', 'Cyprus', 'Noorwegen', 'IJsland', 'Liechtenstein', 'Zwitserland',
  // EN nation names (voor als FM Engels draait)
  'Netherlands', 'Belgium', 'Germany', 'France', 'Italy', 'Spain', 'Ireland', 'Austria', 'Poland',
  'Sweden', 'Denmark', 'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Croatia',
  'Slovenia', 'Luxembourg', 'Estonia', 'Latvia', 'Lithuania', 'Norway', 'Iceland', 'Switzerland',
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

// ---------- leeftijd o.b.v. peiljaar ----------
function getAge(p) {
  if (p.birthYear) {
    let a = state.refYear - p.birthYear;
    if (p.birthDoy && p.birthDoy > state.refDoy) a -= 1;
    return a;
  }
  return p.age;
}
function gameNow() {
  const g = state.meta.gameDate ? new Date(state.meta.gameDate) : new Date();
  return new Date(state.refYear, g.getMonth(), g.getDate());
}

// ---------- kolommen ----------
const qClass = v => v == null ? '' : v >= 150 ? 'q5' : v >= 120 ? 'q4' : v >= 90 ? 'q3' : v >= 60 ? 'q2' : 'q1';
const qHtml = v => {
  if (v == null) return '–';
  const q = qClass(v), pct = Math.min(100, v / 2);
  return `<span class="qcell"><span class="qnum ${q}">${v}</span><span class="qtrack"><span class="qfill ${q.replace('q', 'qb')}" style="width:${pct}%"></span></span></span>`;
};
// contract-cel: amber als het contract (bijna) afloopt — scouting-signaal
function expiresHtml(p) {
  const m = monthsUntil(p.expires);
  if (m == null) return { cls: 'dim', txt: '–' };
  const txt = fmtDate(p.expires);
  if (m <= 6) return { cls: 'exp-soon', txt };
  if (m <= 12) return { cls: 'exp-year', txt };
  return { cls: '', txt };
}

const PLAYER_COLS = [
  { key: 'sl', label: '★', star: true },
  { key: 'name', label: 'c_name', get: p => p.name, name: true },
  { key: 'age', label: 'c_age', num: true, get: p => getAge(p) },
  { key: 'pos', label: 'c_pos', get: p => p.pos || '–' },
  { key: 'club', label: 'c_club', get: p => p.club, dimNull: true },
  { key: 'nat', label: 'c_nat', get: p => (p.nat || []).join(', ') },
  { key: 'eu', label: 'EU', get: p => isEu(p) ? 1 : 0, render: p => isEu(p) ? '<span class="eu-yes">✓</span>' : '<span class="dim">–</span>' },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca) },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa) },
  { key: 'value', label: 'c_value', num: true, get: p => estValue(p).v, render: p => estHtml(p) },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'expires', label: 'c_expires', get: p => p.expires, fmt: fmtDate, tdCls: p => expiresHtml(p).cls },
  { key: 'interest', label: 'c_interest', get: p => { const i = interestEstimate(p); return i ? i.score : -1; }, render: p => intHtml(p) },
  { key: 'status', label: 'c_status', get: p => 0, render: p => statusHtml(p) },
];
const STAFF_COLS = [
  { key: 'sl', label: '★', star: true },
  { key: 'name', label: 'c_name', get: p => p.name, name: true },
  { key: 'age', label: 'c_age', num: true, get: p => getAge(p) },
  { key: 'job', label: 'c_role', get: p => p.job || '–' },
  { key: 'club', label: 'c_club', get: p => p.club, dimNull: true },
  { key: 'nat', label: 'c_nat', get: p => (p.nat || []).join(', ') },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca) },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa) },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'expires', label: 'c_expires', get: p => p.expires, fmt: fmtDate, tdCls: p => expiresHtml(p).cls },
];

// ---------- geschatte marktwaarde (GBP) ----------
function estValue(p) {
  if (p.value != null && p.value > 0) return { v: p.value, est: false, lo: Math.round(p.value * 0.8), hi: Math.round(p.value * 1.2) };
  if (!p.ca || p.ca < 1) return { v: null, est: false };
  if (!p.club) return { v: 0, est: true };
  const effRep = Math.max(p.worldRep || 0, p.ca * 38, (p.clubRep || 0) * 0.5);
  const base = 860000 * Math.exp(effRep / 2400);
  const fCA = Math.pow(p.ca / 100, 2.2);
  const a = getAge(p) || 25;
  const paHead = Math.max(0, (p.pa || p.ca) - p.ca);
  let fage;
  if (a <= 21) fage = 1.0 + Math.min(1.0, paHead / 45);
  else if (a <= 26) fage = 1.0;
  else if (a <= 30) fage = 0.7;
  else if (a <= 33) fage = 0.4;
  else fage = 0.18;
  const m = monthsUntil(p.expires);
  const yrs = m != null ? m / 12 : 3;
  let fcon = Math.min(1.0, 0.4 + 0.2 * yrs);
  if (m != null && m <= 4) fcon = 0.28;
  const v = Math.round(base * fCA * fage * fcon / 1e5) * 1e5;
  return { v, est: true, lo: Math.round(v * 0.78), hi: Math.round(v * 1.22) };
}
function estHtml(p) {
  const e = estValue(p);
  if (e.v == null) return '<span class="dim">–</span>';
  if (e.v === 0) return '<span class="dim">' + t('free_l') + '</span>';
  return (e.est ? '<span class="dim">~</span>' : '') + fmtMoney(e.v);
}

// ---------- interesse-inschatting (heuristiek) ----------
function interestEstimate(p) {
  const myRep = state.meta.myClubRep || 0;
  if (!myRep) return null;
  const their = p.clubRep || 0;
  const bigger = myRep - their;
  let score = 50;
  if (isFree(p)) score = 76;
  else if (bigger >= 500) score = 80;
  else if (bigger >= -500) score = 62;
  else if (bigger >= -2000) score = 42;
  else if (bigger >= -4000) score = 24;
  else score = 10;
  if (p.ambition) score += (bigger >= 0 ? 1.6 : -1.6) * (p.ambition - 10);
  if (p.listed || p.setForRelease) score += 18;
  const m = monthsUntil(p.expires);
  if (m != null && m <= 6) score += 14;
  if (p.notForSale) score -= 26;
  if (p.worldRep && p.worldRep > myRep + 1500 && !isFree(p)) score -= 16;
  const age = getAge(p);
  if (age <= 15) score = Math.min(score, 8);
  else if (age <= 17 && !isFree(p)) score -= 8;
  if (p.loyalty && !isFree(p)) score *= (1 - 0.40 * (p.loyalty / 20));
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 70 ? t('int_big') : score >= 45 ? t('int_ok') : score >= 25 ? t('int_small') : t('int_no');
  const cls = score >= 70 ? 'int-g' : score >= 45 ? 'int-r' : score >= 25 ? 'int-k' : 'int-n';
  return { score, label, cls };
}
function intHtml(p) {
  const i = interestEstimate(p);
  if (!i) return '<span class="dim">?</span>';
  return `<span class="int ${i.cls}" title="${i.score}/100">${i.label}</span>`;
}

function statusHtml(p) {
  let h = '';
  if (isFree(p)) h += `<span class="tag free">${t('tag_free')}</span>`;
  if (p.listed) h += `<span class="tag listed">${t('tag_listed')}</span>`;
  if (p.setForRelease) h += `<span class="tag rel">${t('tag_rel')}</span>`;
  if (p.notForSale) h += `<span class="tag nfs">${t('tag_nfs')}</span>`;
  return h || '<span class="dim">–</span>';
}
const isFree = p => !p.club;
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
       <circle r="7.5"></circle><text>${pos}</text></g>`).join('');
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

// ---------- data laden ----------
async function loadDump() {
  try {
    const st = await (await fetch('/api/status')).json();
    if (!st.hasDump) {
      $('dump-info').textContent = '';
      $('empty-msg').textContent = t('started');
      return;
    }
    const data = await (await fetch('/api/dump')).json();
    state.players = data.players || [];
    state.staff = data.staff || [];
    state.meta = data.meta || {};
    // peiljaar: automatisch uit het afgeleide seizoensjaar (of game-datum)
    if (state.meta.gameDate) {
      const g = new Date(state.meta.gameDate);
      state.refYear = state.meta.gameYear || g.getFullYear();
      state.refDoy = Math.floor((g - new Date(g.getFullYear(), 0, 0)) / 864e5);
      $('f-refyear').value = state.refYear;
    } else if (state.meta.gameYear) {
      state.refYear = state.meta.gameYear;
      $('f-refyear').value = state.refYear;
    }
    const when = new Date(st.dumpTime).toLocaleString();
    $('dump-info').textContent = `${state.players.length.toLocaleString()} · ${state.staff.length.toLocaleString()} · ${when}`;
    renderClubBadge();
    $('empty-state').classList.add('hidden');
    buildStaffRoles();
    applyFilters();
  } catch (e) { $('dump-info').textContent = 'fout'; console.error(e); }
}
function renderClubBadge() {
  const mgr = state.meta.manager, club = state.meta.myClub, rep = state.meta.myClubRep;
  $('club-badge').innerHTML = (mgr || club)
    ? `${mgr ? mgr + ' · ' : ''}<b>${club || '?'}</b>${rep ? ` <span class="dim">(rep ${rep})</span>` : ''}` : '';
}
function buildStaffRoles() {
  const cur = $('f-staffrole').value;
  const jobs = [...new Set(state.staff.map(s => s.job).filter(Boolean))].sort();
  $('f-staffrole').innerHTML = `<option value="">${t('all')}</option>` + jobs.map(j => `<option>${j}</option>`).join('');
  $('f-staffrole').value = cur;
}

// ---------- filters ----------
const parseMoney = s => {
  if (!s) return null;
  s = s.trim().toUpperCase().replace(',', '.');
  const m = s.match(/^([\d.]+)\s*(K|M|MLD|B)?/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (m[2] === 'K') v *= 1e3; else if (m[2] === 'M') v *= 1e6; else if (m[2] === 'MLD' || m[2] === 'B') v *= 1e9;
  if (state.cur === '€') v /= GBP_TO_EUR;
  return isNaN(v) ? null : v;
};
function monthsUntil(expires) {
  if (!expires) return null;
  const exp = new Date(expires);
  if (isNaN(exp)) return null;
  return (exp - gameNow()) / (1000 * 60 * 60 * 24 * 30.44);
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
    const age = getAge(p);
    if (age < ageMin || age > ageMax) return false;
    if ((p.ca ?? 0) < caMin || (p.ca ?? 0) > caMax) return false;
    if ((p.pa ?? 0) < paMin || (p.pa ?? 0) > paMax) return false;
    if (price != null && (estValue(p).v ?? Infinity) > price) return false;
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
  renderChips(buildChips());
  renderTable();
}

// ---------- actieve filters als chips boven de tabel ----------
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function buildChips() {
  const chips = [];
  const add = (label, clear) => chips.push({ label, clear });
  const clearInput = id => () => { $(id).value = ''; };
  const uncheck = id => () => { $(id).checked = false; };
  const range = (minId, maxId, label) => {
    const lo = $(minId).value, hi = $(maxId).value;
    if (lo || hi) add(`${label} ${lo || '…'}–${hi || '…'}`, () => { $(minId).value = ''; $(maxId).value = ''; });
  };
  const v = id => $(id).value.trim();

  if (v('f-name')) add(`${t('chipSearch')}: "${v('f-name')}"`, clearInput('f-name'));
  if (activePos.size) add(`${t('position')}: ${[...activePos].join(', ')}`,
    () => { activePos.clear(); document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on')); });
  if (state.mode === 'staff' && $('f-staffrole').value) add($('f-staffrole').value, () => { $('f-staffrole').value = ''; });
  range('f-age-min', 'f-age-max', t('age'));
  range('f-ca-min', 'f-ca-max', 'CA');
  range('f-pa-min', 'f-pa-max', 'PA');
  if (v('f-price')) add(`${t('maxvalue')} ${v('f-price')}`, clearInput('f-price'));
  if (v('f-wage')) add(`${t('maxwage')} ${v('f-wage')}`, clearInput('f-wage'));
  if (v('f-nat')) add(`${t('nat')}: ${v('f-nat')}`, clearInput('f-nat'));
  if ($('f-eu').checked) add(t('euonly'), uncheck('f-eu'));
  if (+$('f-interest').value > 0) add(`${t('interestmin')} ${$('f-interest').selectedOptions[0].textContent}`, () => { $('f-interest').value = '0'; });
  if ($('f-attain').checked) add(t('attainable'), uncheck('f-attain'));
  if ($('f-listed').checked) add(t('listed'), uncheck('f-listed'));
  if ($('f-exp6').checked) add(t('exp6'), uncheck('f-exp6'));
  if ($('f-exp12').checked) add(t('exp12'), uncheck('f-exp12'));
  if ($('f-free').checked) add(t('free'), uncheck('f-free'));
  if ($('f-myclub').checked) add(t('myclub'), uncheck('f-myclub'));
  if ($('f-shortlist').checked && state.mode !== 'shortlist') add(t('onlyshortlist'), uncheck('f-shortlist'));
  return chips;
}
function renderChips(chips) {
  const bar = $('chipbar');
  const n = state.filtered.length.toLocaleString();
  bar.innerHTML = `<span class="chip-count"><b>${n}</b> ${t('results')}</span>` +
    chips.map((c, i) => `<button class="chip" data-i="${i}" title="${t('clear')}">${escHtml(c.label)}<span class="x">✕</span></button>`).join('') +
    (chips.length > 1 ? `<button class="chip-clear">${t('clearAll')}</button>` : '');
  bar.querySelectorAll('.chip').forEach(el => el.onclick = () => { chips[+el.dataset.i].clear(); applyFilters(); });
  const ca = bar.querySelector('.chip-clear');
  if (ca) ca.onclick = () => $('btn-clear').onclick();
}
// ---------- kolomconfiguratie (volgorde + verbergen, per modus) ----------
const modeKey = () => state.mode === 'staff' ? 'staff' : 'players';
function baseCols() { return modeKey() === 'staff' ? STAFF_COLS : PLAYER_COLS; }
function colCfg() {
  const k = modeKey();
  const keys = baseCols().filter(c => !c.star).map(c => c.key);
  let saved = state.colCfg[k];
  if (!saved || !Array.isArray(saved.order)) { saved = { order: [...keys], hidden: [] }; state.colCfg[k] = saved; }
  for (const kk of keys) if (!saved.order.includes(kk)) saved.order.push(kk);  // nieuwe kolommen erbij
  saved.order = saved.order.filter(kk => keys.includes(kk));                    // verdwenen eruit
  return saved;
}
function saveColCfg() { localStorage.setItem('fmss_cols', JSON.stringify(state.colCfg)); }
function activeCols() {
  const base = baseCols();
  const byKey = Object.fromEntries(base.map(c => [c.key, c]));
  const cf = colCfg();
  const hidden = new Set(cf.hidden);
  const sl = base.find(c => c.star);                     // ster-kolom altijd vooraan
  const rest = cf.order.filter(k => !hidden.has(k) && byKey[k]).map(k => byKey[k]);
  return sl ? [sl, ...rest] : rest;
}
function reorderCol(fromKey, toKey) {
  if (fromKey === toKey) return;
  const cf = colCfg();
  const arr = cf.order;
  const fi = arr.indexOf(fromKey), ti = arr.indexOf(toKey);
  if (fi < 0 || ti < 0) return;
  arr.splice(fi, 1);
  arr.splice(arr.indexOf(toKey), 0, fromKey);            // vóór de doelkolom plaatsen
  saveColCfg(); renderTable();
}
function sortRows() {
  const col = activeCols().find(c => c.key === state.sortKey) || activeCols()[1];
  if (col.star) return;
  const dir = state.sortDir;
  state.filtered.sort((a, b) => {
    const va = col.get(a), vb = col.get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1; if (vb == null) return -1;
    if (typeof va === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
}

// ---------- gevirtualiseerde tabel ----------
let ROW_H = 28;              // wordt na de eerste render gemeten (zoom/DPI-onafhankelijk)
let renderQueued = false;
// Meet de echte rijhoogte zodat spacer + translateY exact kloppen (voorkomt drift/verdwijnende lijnen).
function measureRowH() {
  const tr = $('grid-body').querySelector('tr');
  if (!tr) return false;
  const h = tr.getBoundingClientRect().height;
  if (h > 12 && Math.abs(h - ROW_H) > 0.02) {
    ROW_H = h;
    $('grid-spacer').style.height = (state.filtered.length * ROW_H) + 'px';
    return true;
  }
  return false;
}
function colLabel(c) { return c.star ? '★' : (c.label.startsWith('c_') || I18N.nl[c.label] ? t(c.label) : c.label); }
function renderTable() {
  const cols = activeCols();
  $('grid-head').innerHTML = cols.map(c => {
    const stick = c.star ? 'c-sticky' : c.name ? 'c-sticky stick-end' : '';
    return `<th data-key="${c.key}" draggable="${c.star ? 'false' : 'true'}" class="${stick} ${c.key === state.sortKey ? 'sorted' : ''}" title="${c.star ? '' : t('colHint')}">${colLabel(c)}${c.key === state.sortKey ? (state.sortDir < 0 ? ' ▼' : ' ▲') : ''}</th>`;
  }).join('');
  $('grid-head').querySelectorAll('th').forEach(th => {
    const k = th.dataset.key;
    const col = cols.find(c => c.key === k);
    th.onclick = () => {
      if (col?.star) return;
      if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = -1; }
      sortRows(); renderTable();
    };
    if (col?.star) return;
    // slepen om te herordenen
    th.ondragstart = e => { e.dataTransfer.setData('text/plain', k); e.dataTransfer.effectAllowed = 'move'; th.classList.add('dragging'); };
    th.ondragover = e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; th.classList.add('drop-target'); };
    th.ondragleave = () => th.classList.remove('drop-target');
    th.ondragend = () => $('grid-head').querySelectorAll('th').forEach(x => x.classList.remove('dragging', 'drop-target'));
    th.ondrop = e => { e.preventDefault(); th.classList.remove('drop-target'); reorderCol(e.dataTransfer.getData('text/plain'), k); };
  });
  $('grid-spacer').style.height = (state.filtered.length * ROW_H) + 'px';
  renderVisible();
  if (measureRowH()) renderVisible();   // hermeet en herpositioneer met echte hoogte
}

// rechtsklik op de koppen → kolommen tonen/verbergen
$('grid-head').addEventListener('contextmenu', e => { e.preventDefault(); openColMenu(e.clientX, e.clientY); });

function openColMenu(x, y) {
  closeColMenu();
  const cf = colCfg();
  const hidden = new Set(cf.hidden);
  const base = baseCols().filter(c => !c.star);
  const menu = document.createElement('div');
  menu.id = 'colmenu';
  menu.innerHTML = `<div class="cm-head">${t('colsTitle')}</div>` +
    base.map(c => `<label class="cm-row"><input type="checkbox" data-k="${c.key}" ${hidden.has(c.key) ? '' : 'checked'}> ${colLabel(c)}</label>`).join('') +
    `<button class="cm-reset">${t('colsReset')}</button>`;
  menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 340) + 'px';
  document.body.appendChild(menu);
  menu.querySelectorAll('input[type=checkbox]').forEach(cb => cb.onchange = () => {
    const k = cb.dataset.k;
    const h = new Set(colCfg().hidden);
    if (cb.checked) h.delete(k); else h.add(k);
    colCfg().hidden = [...h];
    saveColCfg(); renderTable();
  });
  menu.querySelector('.cm-reset').onclick = () => {
    state.colCfg[modeKey()] = { order: baseCols().filter(c => !c.star).map(c => c.key), hidden: [] };
    saveColCfg(); renderTable(); closeColMenu();
  };
}
function closeColMenu() { const m = $('colmenu'); if (m) m.remove(); }
document.addEventListener('click', e => { if (!e.target.closest('#colmenu')) closeColMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeColMenu(); });
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
      const stick = c.star ? 'c-sticky' : c.name ? 'c-sticky stick-end' : '';
      if (c.star) {
        const on = state.shortlist.has(p.id);
        return `<td class="star-cell ${stick} ${on ? 'on' : ''}" data-star="${p.id}">${on ? '★' : '☆'}</td>`;
      }
      if (c.render) return `<td class="${c.num ? 'num' : ''}">${c.render(p)}</td>`;
      let v = c.get(p);
      if (c.name) return `<td class="pname ${stick}" title="Klik = kopieer naam">${v || '?'}</td>`;
      if (c.dimNull && !v) return `<td class="dim">–</td>`;
      if (c.fmt) v = c.fmt(v);
      if (v == null || v === '') v = '–';
      return `<td class="${c.num ? 'num' : ''} ${c.cls || ''} ${c.tdCls ? c.tdCls(p) : ''}">${v}</td>`;
    }).join('');
    return `<tr data-i="${idx}" class="${state.selected === p ? 'sel' : ''}${idx % 2 ? ' even' : ''}" style="height:${ROW_H}px">${tds}</tr>`;
  }).join('');
  body.querySelectorAll('tr').forEach(tr => {
    tr.onclick = e => {
      const star = e.target.closest('[data-star]');
      if (star) { toggleShortlist(+star.dataset.star); e.stopPropagation(); return; }
      const p = state.filtered[+tr.dataset.i];
      if (e.target.closest('.pname')) copyName(p.name);
      showDetail(p);
    };
  });
}
$('table-wrap').addEventListener('scroll', () => {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderVisible(); });
});

// ---------- klembord / toast ----------
function showToast(msg) {
  const el = $('toast');
  el.textContent = msg; el.className = 'show';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.className = 'hidden', 1600);
}
function copyName(name) {
  const ok = () => showToast('📋 ' + t('copied') + ': ' + name);
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(name).then(ok, () => fallbackCopy(name, ok));
  else fallbackCopy(name, ok);
}
function fallbackCopy(text, ok) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok();
  } catch { showToast('!'); }
}

// ---------- shortlist ----------
function toggleShortlist(id) {
  if (state.shortlist.has(id)) state.shortlist.delete(id); else state.shortlist.add(id);
  localStorage.setItem('fmss_shortlist', JSON.stringify([...state.shortlist]));
  $('sl-count').textContent = state.shortlist.size;
  if (state.mode === 'shortlist' || $('f-shortlist').checked) applyFilters(); else renderVisible();
  const el = document.querySelector('.detail-star');
  if (el && state.selected) el.classList.toggle('on', state.shortlist.has(state.selected.id));
}
function exportShortlist() {
  const ids = state.shortlist;
  const all = [...state.players, ...state.staff].filter(p => ids.has(p.id));
  if (!all.length) { showToast('Shortlist leeg'); return; }
  const cols = ['Name', 'Position', 'Age', 'Club', 'Nationality', 'CA', 'PA', 'Value(GBP)', 'Wage(GBP)', 'Contract', 'Interest'];
  const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const p of all) {
    const i = interestEstimate(p);
    lines.push([p.name, p.pos || p.job || '', getAge(p), p.club || '', (p.nat || []).join('/'),
      p.ca, p.pa, estValue(p).v ?? '', p.wage ?? '', p.expires || '', i ? i.label : ''].map(esc).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fmsuperscout-shortlist.csv';
  a.click(); URL.revokeObjectURL(a.href);
  showToast('✓ ' + all.length + ' → CSV');
}

// ---------- detailpaneel ----------
const attrClass = v => v >= 17 ? 'g5' : v >= 14 ? 'g4' : v >= 10 ? 'g3' : v >= 6 ? 'g2' : 'g1';
// Geschatte potentie-waarde van een attribuut o.b.v. PA/CA-verhouding (ruwe projectie).
function potAttr(p, v) {
  if (!p.pa || !p.ca || p.pa <= p.ca) return v;
  return Math.min(20, Math.round(v * (p.pa / p.ca)));
}
function showDetail(p) {
  state.selected = p;
  renderVisible();
  $('detail').classList.remove('hidden');
  const isPlayer = !!p.attrs;
  const on = state.shortlist.has(p.id);
  const ev = estValue(p);
  const valTxt = ev.v == null ? '–' : ev.v === 0 ? t('free_l') : ev.est ? `${fmtMoney(ev.lo)} – ${fmtMoney(ev.hi)}` : fmtMoney(ev.v);

  let html = `<h2>${p.name} <span class="detail-star ${on ? 'on' : ''}" data-star="${p.id}">${on ? '★' : '☆'}</span>
    <button class="copybtn" title="Kopieer naam">📋</button></h2>
  <div class="sub">${getAge(p)} · ${(p.nat || []).join(', ')}${isEu(p) ? ' · <span class="eu-yes">EU</span>' : ''} · ${p.club || t('clubless')}</div>
  <div class="kv">
    <div><b>CA</b> <span class="ca-bar">${p.ca ?? '–'}</span></div>
    <div><b>PA</b> <span class="pa-bar">${p.pa ?? '–'}</span></div>
    ${isPlayer ? `<div><b>${t('c_pos')}</b> ${p.pos || '–'}</div><div><b>${t('foot')}</b> ${p.foot || '–'}</div>` : `<div><b>${t('c_role')}</b> ${p.job || '–'}</div>`}
    <div><b>${t('estval')}</b> ${valTxt}</div>
    <div><b>${t('wageLabel')}</b> ${fmtMoney(p.wage)}</div>
    ${p.worldRep ? `<div><b>${t('repLabel')}</b> ${p.worldRep}</div>` : ''}
    <div><b>${t('contractLabel')}</b> ${fmtDate(p.expires)}</div>
    ${p.height ? `<div><b>${t('height')}</b> ${p.height} cm</div>` : ''}
  </div>`;

  const flags = [];
  if (isFree(p)) flags.push(`<span class="pill">${t('tag_free')}</span>`);
  if (p.listed) flags.push(`<span class="pill warn">${t('tag_listed')}</span>`);
  if (p.setForRelease) flags.push(`<span class="pill warn">${t('tag_rel')}</span>`);
  if (p.notForSale) flags.push(`<span class="pill">${t('tag_nfs')}</span>`);
  if (isAttainable(p)) flags.push(`<span class="pill good">${t('attainable')}</span>`);
  if (flags.length) html += '<div>' + flags.join('') + '</div>';

  if (isPlayer) {
    const i = interestEstimate(p);
    if (i) html += `<div class="interest-box"><b>${t('interestTitle')}:</b> <span class="int ${i.cls}">${i.label}</span> <span class="dim">(${i.score}/100)</span></div>`;
  }

  if (isPlayer && p.attrs) {
    const canPot = p.pa > p.ca;
    html += `<label class="potswitch${canPot ? '' : ' off'}"><input type="checkbox" id="pot-toggle" ${state.showPot ? 'checked' : ''} ${canPot ? '' : 'disabled'}> ${t('showPot')}${state.showPot ? ` <span class="dim">(${t('potNote')})</span>` : ''}</label>`;
    const isGk = (p.posArr || []).includes('GK');
    const groups = isGk ? ATTR_GROUPS_GK : ATTR_GROUPS_OUTFIELD;
    const col = {};
    for (const [gk, keys] of groups) {
      const rows = keys.filter(k => p.attrs[k] != null);
      col[gk] = !rows.length ? '' : `<div class="attr-col"><h3>${t(gk)}</h3>` + rows.map((k, idx) => {
        const raw = p.attrs[k];
        const shown = state.showPot ? potAttr(p, raw) : raw;
        const grew = state.showPot && shown > raw;
        return `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${attrName(k)}</span><span class="v ${attrClass(shown)}${grew ? ' grew' : ''}">${shown}</span></div>`;
      }).join('') + '</div>';
    }
    // Persoonlijkheid (verborgen kenmerken) — net als een normale eigenschappengroep.
    const pd = [['ambition', p.ambition], ['professionalism', p.professionalism], ['loyalty', p.loyalty],
      ['pressure', p.pressure], ['temperament', p.temperament], ['sportsmanship', p.sportsmanship],
      ['adaptability', p.adaptability], ['controversy', p.controversy]].filter(x => x[1] > 0);
    const persHtml = pd.length ? `<div class="attr-col"><h3>${t('personaTitle')}</h3>` + pd.map(([k, v], idx) =>
      `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${t(k)}</span><span class="v ${attrClass(v)}">${v}</span></div>`).join('') + '</div>' : '';
    // Grid: links Technisch/Keepen + Standaardsituaties (Mentaal loopt ernaast over 2 rijen),
    // onderste rij Fysiek | Persoonlijkheid op gelijke hoogte.
    const techKey = isGk ? 'g_goalkeeping' : 'g_technical';
    html += `<div class="attr-grid">
      <div style="grid-area:tech">${col[techKey] || ''}</div>
      <div style="grid-area:sp">${col['g_setpieces'] || ''}</div>
      <div style="grid-area:ment">${col['g_mental'] || ''}</div>
      <div style="grid-area:phys">${col['g_physical'] || ''}</div>
      <div style="grid-area:pers">${persHtml}</div>
    </div>`;
  } else if (p.staffAttrs) {
    html += `<div class="attr-cols"><div class="attr-col"><h3>${t('staffAttrs')}</h3>` +
      Object.entries(p.staffAttrs).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v], idx) =>
        `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${k.replace(/_/g, ' ')}</span><span class="v ${attrClass(v)}">${v}</span></div>`).join('') + '</div></div>';
  }
  $('detail-body').innerHTML = html;
  document.querySelector('.detail-star').onclick = () => toggleShortlist(p.id);
  document.querySelector('.copybtn').onclick = () => copyName(p.name);
  const pt = $('pot-toggle');
  if (pt) pt.onchange = () => { state.showPot = pt.checked; showDetail(p); };
}
$('detail-close').onclick = () => { $('detail').classList.add('hidden'); state.selected = null; renderVisible(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('detail-close').onclick(); });

// ---------- UI-bediening ----------
['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-price', 'f-wage', 'f-nat'].forEach(id => {
  let tm; $(id).addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(applyFilters, 150); });
});
['f-eu', 'f-myclub', 'f-attain', 'f-listed', 'f-exp6', 'f-exp12', 'f-free', 'f-shortlist'].forEach(id => $(id).addEventListener('change', applyFilters));
$('f-staffrole').addEventListener('change', applyFilters);
$('f-interest').addEventListener('change', applyFilters);
$('f-refyear').addEventListener('input', () => { const y = +$('f-refyear').value; if (y >= 2000 && y <= 2100) { state.refYear = y; applyFilters(); } });
$('pos-clear').onclick = () => { activePos.clear(); document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on')); applyFilters(); };

$('btn-clear').onclick = () => {
  document.querySelectorAll('#filters input[type=text], #filters input[type=number]').forEach(i => { if (i.id !== 'f-refyear') i.value = ''; });
  document.querySelectorAll('#filters input[type=checkbox]').forEach(i => i.checked = false);
  $('f-staffrole').value = ''; $('f-interest').value = '0';
  activePos.clear();
  document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on'));
  applyFilters();
};
$('btn-sidebar').onclick = () => document.body.classList.toggle('sidebar-collapsed');
$('btn-export').onclick = exportShortlist;

// club-badge klik → filters wissen + mijn club aan
$('club-badge').onclick = () => {
  if (!state.meta.myClub) return;
  $('btn-clear').onclick();
  $('f-myclub').checked = true;
  applyFilters();
};

// valuta-dropdown
$('sel-cur').value = state.cur;
$('sel-cur').addEventListener('change', () => {
  state.cur = $('sel-cur').value;
  localStorage.setItem('fmss_cur', state.cur);
  renderVisible(); if (state.selected) showDetail(state.selected);
});
// taal-dropdown
$('sel-lang').value = state.lang;
$('sel-lang').addEventListener('change', () => {
  state.lang = $('sel-lang').value;
  localStorage.setItem('fmss_lang', state.lang);
  applyLang();
});
// instellingen-menu (tandwiel)
$('btn-settings').onclick = e => {
  e.stopPropagation();
  const m = $('settings-menu');
  if (!m.classList.contains('hidden')) { m.classList.add('hidden'); return; }
  const r = $('btn-settings').getBoundingClientRect();
  m.style.top = (r.bottom + 6) + 'px';
  m.style.right = (window.innerWidth - r.right) + 'px';
  m.classList.remove('hidden');
};
document.addEventListener('click', e => {
  if (!e.target.closest('#settings-menu') && !e.target.closest('#btn-settings')) $('settings-menu').classList.add('hidden');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('settings-menu').classList.add('hidden'); });

// nieuwe data ophalen (trigger de plugin)
$('btn-fetch').onclick = async () => {
  try {
    await fetch('/api/refresh', { method: 'POST' });
    const b = $('banner'); b.className = 'scanning'; b.textContent = t('reqSent');
  } catch { showToast('!'); }
};

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  $('f-name').placeholder = t('searchph');
  if (!state.meta.gameDate) $('empty-msg').textContent = t('started');
  buildStaffRoles();
  applyFilters();
  if (state.selected) showDetail(state.selected);
}

function setMode(mode) {
  state.mode = mode;
  $('tab-players').classList.toggle('active', mode === 'players');
  $('tab-staff').classList.toggle('active', mode === 'staff');
  $('tab-shortlist').classList.toggle('active', mode === 'shortlist');
  $('fg-pitch').style.display = mode === 'staff' ? 'none' : '';
  $('fg-staffrole').style.display = mode === 'staff' ? '' : 'none';
  $('sl-bar').classList.toggle('hidden', mode !== 'shortlist');
  state.selected = null;
  $('detail').classList.add('hidden');
  if (!activeCols().find(c => c.key === state.sortKey)) { state.sortKey = 'ca'; state.sortDir = -1; }
  applyFilters();
}
$('tab-players').onclick = () => setMode('players');
$('tab-staff').onclick = () => setMode('staff');
$('tab-shortlist').onclick = () => setMode('shortlist');
$('btn-reload').onclick = loadDump;

// ---------- statuspolling (F9 / knop-feedback) ----------
let lastPluginState = null, lastDumpTime = null;
async function poll() {
  try {
    const st = await (await fetch('/api/status')).json();
    const b = $('banner');
    const pl = st.plugin;
    if (pl && pl.state === 'scanning') { b.className = 'scanning'; b.textContent = t('dumping'); }
    else if (pl && pl.state === 'done') {
      if ((st.dumpTime && st.dumpTime !== lastDumpTime && lastDumpTime !== null) || lastPluginState === 'scanning') {
        b.className = 'done';
        b.textContent = `${t('dumpReady')} (${pl.players.toLocaleString()} · ${pl.staff.toLocaleString()})`;
        b.onclick = () => { loadDump(); b.className = 'hidden'; };
      }
    }
    lastPluginState = pl ? pl.state : null;
    if (st.dumpTime) lastDumpTime = st.dumpTime;
  } catch { /* server weg */ }
  setTimeout(poll, 2000);
}

buildPitch();
applyLang();
$('sl-count').textContent = state.shortlist.size;
loadDump().then(() => poll());
