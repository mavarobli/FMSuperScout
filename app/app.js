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
  hideCapa: localStorage.getItem('fmss_hidecapa') === '1',
  role: localStorage.getItem('fmss_role') || '',
  compare: [],
  refYear: new Date().getFullYear(),
  refDoy: 183,
  shortlist: new Set(JSON.parse(localStorage.getItem('fmss_shortlist') || '[]')),
  colCfg: JSON.parse(localStorage.getItem('fmss_cols') || '{}'),  // per modus: {order:[], hidden:[]}
  colW: JSON.parse(localStorage.getItem('fmss_colw') || '{}'),    // per modus: {kolomkey: breedte px}
};
const GBP_TO_EUR = 1.16;

// ================= i18n =================
const I18N = {
  nl: {
    players: 'Spelers', staff: 'Staf', shortlist: 'Shortlist', searchph: 'Zoek naam of club',
    settings: 'Instellingen', langLabel: 'Taal', curLabel: 'Valuta',
    hideCapa: 'CA/PA verbergen',
    donateBtn: 'Steun FMSuperScout', donateTitle: 'Lekker aan het scouten?',
    donateBody: 'FMSuperScout is gratis en blijft gratis. Als het je een uur turen in traag menu bespaart, is een koffie welkom. Zo niet, draait ie ook gewoon door.',
    donateCta: '☕ Koffie', donateLater: 'Later',
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
    c_clubrep: 'Clubrep.', c_worldrep: 'Wereldrep.',
    estval: 'Gesch. waarde', wageLabel: 'Salaris', contractLabel: 'Contract tot', free_l: 'transfervrij',
    int_big: 'Groot', int_ok: 'Redelijk', int_small: 'Klein', int_no: 'Nee', interestTitle: 'Interesse-inschatting',
    minorNote: 'Te jong voor een transfer.', minorIntlNote: 'Als niet-EU-minderjarige pas vanaf 18 haalbaar (FIFA-regel voor internationale transfers).',
    ambition: 'Ambitie', loyalty: 'Loyaliteit', professionalism: 'Professionaliteit', adaptability: 'Aanpassing',
    pressure: 'Druk', sportsmanship: 'Sportiviteit', temperament: 'Temperament', controversy: 'Controverse', determination: 'Vastberadenheid',
    personaTitle: 'Persoonlijkheid',
    hiddenTitle: 'Verborgen kenmerken', a_Consistency: 'Constantheid', a_ImportantMatches: 'Grote wedstrijden',
    a_InjuryProneness: 'Blessuregevoeligheid', a_Versatility: 'Veelzijdigheid', a_Dirtiness: 'Vals spel',
    showPot: 'Toon geschatte potentie', potNote: 'geschatte waarden op potentieel (PA)',
    clubless: 'clubloos', clubUnknown: 'onbekende club', copied: 'Gekopieerd', reqSent: '⏳ Verzoek verstuurd, FM haalt de data op…',
    dumping: '⏳ FM haalt de database op…', dumpReady: '✓ Nieuwe data klaar, klik om te laden',
    fmNotRunning: '⚠ Start eerst Football Manager 26 en laad je save.',
    tag_free: 'clubloos', tag_listed: 'transferlijst', tag_rel: 'vrijgegeven', tag_nfs: 'niet te koop',
    colHint: 'Sleep om te verplaatsen · rechtsklik voor kolommen', colsTitle: 'Kolommen tonen', colsReset: 'Standaard herstellen',
    g_technical: 'Technisch', g_setpieces: 'Standaardsituaties', g_mental: 'Mentaal', g_physical: 'Fysiek', g_goalkeeping: 'Keepen',
    staffAttrs: 'Staf-attributen',
    clearAll: 'alles wissen', chipSearch: 'Zoek',
    loading: '⏳ Data laden…',
    step1: 'Start <b>FM26</b> en laad je save',
    step2: 'Druk in de game op <kbd>F9</kbd>, of klik hier op <b>⬇ Nieuwe data</b>',
    step3: 'Klik op de groene balk zodra de dump klaar is',
    playersWord: 'spelers', staffWord: 'staf', clickClubFilter: 'Klik = filter op jouw club', repWord: 'reputatie',
    roleFit: 'Tactische rol', roleColHdr: 'Rol', roleAny: 'Geen rol gekozen', bestRoles: 'Beste rollen',
    compare: 'Vergelijk', comparing: 'Vergelijken', addCompare: 'Vergelijk', compareFull: 'Max. 3 spelers',
    cmpTitle: 'Spelervergelijking', cmpValue: 'Waarde', cmpTopRole: 'Beste rol',
    analysis: 'Analyse', anTitle: 'Squad-behoefteanalyse', anNoClub: 'Geen eigen club in de data gevonden.',
    anPlayers: 'spelers', anAvgAge: 'gem. leeftijd', anAvgCa: 'gem. CA', anTopCa: 'beste CA',
    anOk: 'Op sterkte', anThin: 'Dunne bezetting', anShort: 'Tekort', anAging: 'Vergrijzing', anNoSucc: 'Geen opvolging',
    anScout: 'Scout spelers', anYoungTalent: 'jongste talent', anNone: 'geen',
    anBiggestNeed: 'Grootste behoefte', anSquadSize: 'Selectie',
    anRecAging: 'Vergrijst; zoek een opvolger jonger dan {age} met PA boven {pa}.',
    anRecShort: 'Te weinig spelers; werf minimaal {n} extra ({pa}+ PA).',
    anRecThin: 'Dunne cover; een aanvulling van {pa}+ PA versterkt de diepte.',
    anRecSucc: 'Geen jong talent dat het niveau haalt; zoek U{age} met PA boven {pa}.',
    anRecAgingNp: 'Vergrijst; zoek een jongere opvolger.',
    anRecShortNp: 'Te weinig spelers; werf {n} extra.',
    anRecThinNp: 'Dunne cover; een aanvulling versterkt de diepte.',
    anRecSuccNp: 'Geen jong talent op niveau; zoek een groot U{age}-talent.',
    competition: 'Competitie', divLabel: 'Divisie', clubTier: 'Clubniveau',
    tierTop: 'Top (rep 7500+)', tierStrong: 'Sterk (6000+)', tierMid: 'Middel (4000+)', tierLow: 'Laag (<4000)',
  },
  en: {
    players: 'Players', staff: 'Staff', shortlist: 'Shortlist', searchph: 'Search name or club',
    settings: 'Settings', langLabel: 'Language', curLabel: 'Currency',
    hideCapa: 'Hide CA/PA',
    donateBtn: 'Support FMSuperScout', donateTitle: 'Found your next signing?',
    donateBody: 'FMSuperScout is free and stays free. If it beat squinting at slow menus, a coffee helps. If not, it keeps working anyway.',
    donateCta: '☕ Buy me a coffee', donateLater: 'Maybe later',
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
    c_clubrep: 'Club rep', c_worldrep: 'World rep',
    estval: 'Est. value', wageLabel: 'Wage', contractLabel: 'Contract until', free_l: 'free',
    int_big: 'High', int_ok: 'Fair', int_small: 'Low', int_no: 'No', interestTitle: 'Interest estimate',
    minorNote: 'Too young for a transfer.', minorIntlNote: 'As a non-EU minor, only feasible from age 18 (FIFA rule on international transfers).',
    ambition: 'Ambition', loyalty: 'Loyalty', professionalism: 'Professionalism', adaptability: 'Adaptability',
    pressure: 'Pressure', sportsmanship: 'Sportsmanship', temperament: 'Temperament', controversy: 'Controversy', determination: 'Determination',
    personaTitle: 'Personality',
    hiddenTitle: 'Hidden', a_Consistency: 'Consistency', a_ImportantMatches: 'Big matches',
    a_InjuryProneness: 'Injury proneness', a_Versatility: 'Versatility', a_Dirtiness: 'Dirtiness',
    showPot: 'Show estimated potential', potNote: 'estimated values at potential (PA)',
    clubless: 'free agent', clubUnknown: 'unknown club', copied: 'Copied', reqSent: '⏳ Request sent, FM is fetching the data…',
    dumping: '⏳ FM is fetching the database…', dumpReady: '✓ New data ready, click to load',
    fmNotRunning: '⚠ Start Football Manager 26 and load your save first.',
    tag_free: 'free', tag_listed: 'listed', tag_rel: 'released', tag_nfs: 'not for sale',
    colHint: 'Drag to reorder · right-click for columns', colsTitle: 'Show columns', colsReset: 'Reset to default',
    g_technical: 'Technical', g_setpieces: 'Set Pieces', g_mental: 'Mental', g_physical: 'Physical', g_goalkeeping: 'Goalkeeping',
    staffAttrs: 'Staff attributes',
    clearAll: 'clear all', chipSearch: 'Search',
    loading: '⏳ Loading data…',
    step1: 'Start <b>FM26</b> and load your save',
    step2: 'Press <kbd>F9</kbd> in-game, or click <b>⬇ New data</b> here',
    step3: 'Click the green bar when the dump is ready',
    playersWord: 'players', staffWord: 'staff', clickClubFilter: 'Click = filter on your club', repWord: 'reputation',
    roleFit: 'Tactical role', roleColHdr: 'Role', roleAny: 'No role selected', bestRoles: 'Best roles',
    compare: 'Compare', comparing: 'Comparing', addCompare: 'Compare', compareFull: 'Max. 3 players',
    cmpTitle: 'Player comparison', cmpValue: 'Value', cmpTopRole: 'Best role',
    analysis: 'Analysis', anTitle: 'Squad needs analysis', anNoClub: 'No own club found in the data.',
    anPlayers: 'players', anAvgAge: 'avg age', anAvgCa: 'avg CA', anTopCa: 'top CA',
    anOk: 'Well stocked', anThin: 'Thin cover', anShort: 'Shortage', anAging: 'Aging', anNoSucc: 'No succession',
    anScout: 'Scout players', anYoungTalent: 'youngest talent', anNone: 'none',
    anBiggestNeed: 'Biggest need', anSquadSize: 'Squad',
    anRecAging: 'Aging; find a successor under {age} with PA above {pa}.',
    anRecShort: 'Too few players; sign at least {n} more ({pa}+ PA).',
    anRecThin: 'Thin cover; an addition of {pa}+ PA improves depth.',
    anRecSucc: 'No young talent reaching the level; look for U{age} with PA above {pa}.',
    anRecAgingNp: 'Aging; find a younger successor.',
    anRecShortNp: 'Too few players; sign {n} more.',
    anRecThinNp: 'Thin cover; an addition improves depth.',
    anRecSuccNp: 'No young talent at the level; find a top U{age} prospect.',
    competition: 'Competition', divLabel: 'Division', clubTier: 'Club level',
    tierTop: 'Top (rep 7500+)', tierStrong: 'Strong (6000+)', tierMid: 'Mid (4000+)', tierLow: 'Low (<4000)',
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
const qHtml = v => v == null ? '<span class="dim">·</span>' : `<span class="${qClass(v)}">${v}</span>`;
// contract-cel: amber als het contract bijna afloopt, als scouting-signaal
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
  { key: 'pos', label: 'c_pos', get: p => posRank(p), render: p => p.pos || '<span class="dim">–</span>' },
  { key: 'club', label: 'c_club', get: p => p.club || '', render: p => clubLabel(p) },
  { key: 'nat', label: 'c_nat', get: p => (p.nat || []).join(', ') },
  { key: 'eu', label: 'EU', get: p => isEu(p) ? 1 : 0, render: p => isEu(p) ? '<span class="eu-yes">✓</span>' : '<span class="dim">–</span>' },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca) },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa) },
  { key: 'value', label: 'c_value', num: true, get: p => estValue(p).v, render: p => estHtml(p) },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'expires', label: 'c_expires', get: p => p.expires, fmt: fmtDate, tdCls: p => expiresHtml(p).cls },
  { key: 'interest', label: 'c_interest', get: p => { const i = interestEstimate(p); return i ? i.score : -1; }, render: p => intHtml(p) },
  { key: 'status', label: 'c_status', get: p => 0, render: p => statusHtml(p) },
  // Standaard verboren extra kolommen (via rechtsklik aan te zetten, sorteerbaar):
  { key: 'clubRep', label: 'c_clubrep', num: true, get: p => p.clubRep || 0, defHidden: true },
  { key: 'worldRep', label: 'c_worldrep', num: true, get: p => p.worldRep || 0, defHidden: true },
  { key: 'height', label: 'height', num: true, get: p => p.height, fmt: v => v ? v + ' cm' : '–', defHidden: true },
  { key: 'foot', label: 'foot', get: p => p.foot || '–', defHidden: true },
];
const STAFF_COLS = [
  { key: 'sl', label: '★', star: true },
  { key: 'name', label: 'c_name', get: p => p.name, name: true },
  { key: 'age', label: 'c_age', num: true, get: p => getAge(p) },
  { key: 'job', label: 'c_role', get: p => p.job || '–' },
  { key: 'club', label: 'c_club', get: p => p.club || '', render: p => clubLabel(p) },
  { key: 'nat', label: 'c_nat', get: p => (p.nat || []).join(', ') },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca) },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa) },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtMoney },
  { key: 'expires', label: 'c_expires', get: p => p.expires, fmt: fmtDate, tdCls: p => expiresHtml(p).cls },
  { key: 'clubRep', label: 'c_clubrep', num: true, get: p => p.clubRep || 0, defHidden: true },
  { key: 'worldRep', label: 'c_worldrep', num: true, get: p => p.worldRep || 0, defHidden: true },
];

// ---------- geschatte marktwaarde (GBP) ----------
// Gekalibreerd op ~45 spelers met een échte FM-waarde (dump + in-game screenshots, laag/mid/top).
// Belangrijkste bevinding uit die data: FM-waarde volgt vooral de WERELDREPUTATIE (faam), niet CA.
// Twee spelers met dezelfde reputatie zijn ~even veel waard, ongeacht CA; CA en reputatie zijn
// bovendien zo gecorreleerd dat CA meenemen het model onstabiel maakt. Daarom: reputatie (met
// verzadiging aan de top) + leeftijd + resterende contractduur, plus een lichte jeugd-correctie.
// Gevolg/beperking: een sterke speler met lage faam (kleine club) wordt eerder onderschat.
// De écht accurate route is de waarde rechtstreeks uit het geheugen lezen (zoals GenieScout);
// zie docs/backlog.md.
const VAL_B = { c0: 10.96, wRep: 0.997, age: -0.069, yhead: -0.041, lnC: 0.507 };
function wSat(w) { return Math.min(w, 7500) + 0.30 * Math.max(0, w - 7500); }   // faam vlakt af aan de top
// Écht clubloos = geen club én geen clubreputatie. (Club met wél rep maar zonder naam is een
// niet-opgeloste clubverwijzing, geen transfervrije speler — zie clubLabel.)
const isFree = p => !p.club && !(p.clubRep > 0);
// Clublabel: naam, of "onbekende club" als de plugin wél een clubreputatie vond maar de naam
// niet kon uitlezen (bekende beperking), of "clubloos" bij een echte transfervrije speler.
function clubLabel(p) {
  if (p.club) return escHtml(p.club);
  if (p.clubRep > 0) return `<span class="dim" title="Club niet uitgelezen (rep ${p.clubRep})">${t('clubUnknown')}</span>`;
  return `<span class="dim">${t('clubless')}</span>`;
}
function estValue(p) {
  if (p.value != null && p.value > 0) return { v: p.value, est: false, lo: Math.round(p.value * 0.85), hi: Math.round(p.value * 1.15) };
  if (!p.ca || p.ca < 1) return { v: null, est: false };
  if (isFree(p)) return { v: 0, est: true };
  const a = getAge(p) || 25;
  const m = monthsUntil(p.expires);
  const head = Math.max(0, (p.pa || p.ca) - p.ca);
  const yhead = a <= 21 ? head : a <= 24 ? head * 0.5 : 0;
  let ln = VAL_B.c0
    + VAL_B.wRep * (wSat(p.worldRep || 3000) / 1000)
    + VAL_B.age * a
    + VAL_B.yhead * yhead
    + VAL_B.lnC * Math.log(Math.max(2, m == null ? 36 : m));
  let v = Math.exp(ln);
  if (m != null && m <= 4) v *= 0.7;                     // (bijna) transfervrij
  v = v >= 1e6 ? Math.round(v / 1e5) * 1e5 : Math.round(v / 1e4) * 1e4;
  const band = a <= 20 ? 0.5 : 0.35;
  return { v, est: true, lo: Math.round(v * (1 - band)), hi: Math.round(v * (1 + band)) };
}
function estHtml(p) {
  const e = estValue(p);
  if (e.v == null) return '<span class="dim">–</span>';
  if (e.v === 0) return '<span class="dim">' + t('free_l') + '</span>';
  return (e.est ? '<span class="dim">~</span>' : '') + fmtMoney(e.v);
}

// ---------- interesse-inschatting (heuristiek) ----------
// Loonplafond van mijn club: geschat uit de hoogste salarissen in mijn eigen selectie.
// Een doelwit dat véél meer verdient dan mijn topverdieners is lastig te verleiden.
function myWageCeiling() {
  if (state._wageCeil !== undefined) return state._wageCeil;
  const club = (state.meta.myClub || '').toLowerCase();
  const wages = state.players.filter(p => (p.club || '').toLowerCase() === club && p.wage > 0)
    .map(p => p.wage).sort((a, b) => b - a);
  // referentie = op één na hoogste loon (voorkomt dat één uitschieter het plafond bepaalt)
  const ref = wages.length >= 2 ? wages[1] : wages[0];
  state._wageCeil = ref ? Math.round(ref * 1.3) : null;   // ~30% rek boven de huidige top
  return state._wageCeil;
}
// Logistische kans (0-100) dat een speler een overstap naar mijn club ziet zitten.
function interestEstimate(p) {
  const myRep = state.meta.myClubRep || 0;
  if (!myRep) return null;
  if (p.club && (p.club || '').toLowerCase() === (state.meta.myClub || '').toLowerCase()) return null; // eigen speler

  // Reputatie: mijn club vs (a) huidige club en (b) de persoonlijke status van de speler.
  // Bij jonge spelers weegt de clubkloof zwaarder: hun lage wereldreputatie is vooral leeftijd,
  // geen "klein spelertje", dus statuskloof zou de interesse anders kunstmatig opblazen.
  const age = getAge(p);
  const eu = isEu(p);
  const clubGap = myRep - (p.clubRep || 0);
  const statGap = myRep - (p.worldRep || 0);
  const blend = age <= 19 ? (0.9 * clubGap + 0.15 * statGap) : (0.55 * clubGap + 0.45 * statGap);
  let score = 100 / (1 + Math.exp(-blend / 1400));   // 0 kloof → 50; +1400 → ~73; -1400 → ~27

  // Beschikbaarheidssignalen
  if (isFree(p)) score = Math.max(score, 72);                     // clubloos: alleen loon nodig
  if (p.listed || p.setForRelease) score += 15;                  // club wil verkopen
  if (p.notForSale) score *= 0.4;                                // niet te koop: fors omlaag
  const m = monthsUntil(p.expires);
  if (m != null && m <= 6) score += 14;                          // (bijna) transfervrij
  else if (m != null && m <= 12) score += 7;

  // Loon-haalbaarheid: past de speler in mijn loonstructuur?
  const ceil = myWageCeiling();
  if (ceil && p.wage > 0 && !isFree(p)) {
    const ratio = p.wage / ceil;
    if (ratio > 1) score -= Math.min(38, (ratio - 1) * 46);      // boven budget: moeilijk
    else score += Math.min(6, (1 - ratio) * 8);                  // ruim betaalbaar: klein duwtje
  }

  // Persoonlijkheid (nu uit de dump): ambitie stuwt naar een stap omhoog en remt een stap
  // omlaag/lateraal; loyaliteit houdt spelers bij hun club.
  if (p.ambition) score += (blend >= 0 ? 1.2 : -2.2) * (p.ambition - 10);
  if (p.loyalty && !isFree(p)) score *= (1 - 0.45 * (p.loyalty / 20));

  // Leeftijd: jonge spelers verhuizen minder makkelijk (settelen, ontwikkelen bij eigen club).
  if (age <= 16) score *= 0.7;
  else if (age <= 17) score *= 0.85;

  // FIFA Art. 19: non-EU-speler onder de 18 kan internationaal pas komen vanaf z'n 18e.
  let note = null;
  if (age <= 15) { score = Math.min(score, 6); note = 'minor'; }
  else if (age <= 17 && !eu) { score = Math.min(score, 8); note = 'minorIntl'; }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 70 ? t('int_big') : score >= 45 ? t('int_ok') : score >= 25 ? t('int_small') : t('int_no');
  const cls = score >= 70 ? 'int-g' : score >= 45 ? 'int-r' : score >= 25 ? 'int-k' : 'int-n';
  return { score, label, cls, note };
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
// Positievolgorde zoals in FM: van doel naar aanval (GK ... ST), niet alfabetisch.
const POS_ORDER = ['GK', 'DL', 'DC', 'DR', 'WBL', 'WBR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST'];
const POS_RANK = Object.fromEntries(POS_ORDER.map((p, i) => [p, i]));
function posRank(p) {
  const arr = p.posArr || [];
  if (!arr.length) return 99;
  return Math.min(...arr.map(x => POS_RANK[x] ?? 98));   // rangschik op de meest verdedigende positie
}
function isAttainable(p) {
  if (p.notForSale) return false;
  const m = monthsUntil(p.expires);
  return p.listed || p.setForRelease || isFree(p) || (m != null && m <= 12);
}

// ---------- tactische rollen (rolgeschiktheid) ----------
// Per rol: welke posities passen, plus KEY-attributen (zwaar) en PREF-attributen (licht),
// naar het model van FM's groen/blauw gemarkeerde eigenschappen. Score = gewogen gemiddelde
// op de 1-20 schaal (key telt 2x, pref 1x), zodat het naast de losse attributen leesbaar blijft.
const ROLES = [
  // Keepers
  { id: 'gk', short: 'DK', pos: ['GK'], key: ['Handling', 'Reflexes', 'OneOnOnes', 'Positioning', 'Concentration', 'Agility'], pref: ['AerialReach', 'CommandOfArea', 'Communication', 'Kicking', 'Anticipation', 'Decisions', 'Bravery'] },
  { id: 'sk', short: 'Sweeper', pos: ['GK'], key: ['Reflexes', 'OneOnOnes', 'RushingOut', 'Handling', 'Positioning', 'Agility', 'Composure', 'Decisions'], pref: ['CommandOfArea', 'Communication', 'Kicking', 'FirstTouch', 'Passing', 'Anticipation', 'Concentration'] },
  // Centrale verdedigers
  { id: 'cd', short: 'CV', pos: ['DC'], key: ['Marking', 'Tackling', 'Positioning', 'Heading', 'JumpingReach', 'Strength', 'Concentration', 'Decisions'], pref: ['Anticipation', 'Bravery', 'Composure', 'Aggression', 'Pace', 'Acceleration'] },
  { id: 'bpd', short: 'Opbouwer', pos: ['DC'], key: ['Marking', 'Tackling', 'Positioning', 'Passing', 'Composure', 'Vision', 'Decisions', 'JumpingReach'], pref: ['Heading', 'Strength', 'FirstTouch', 'Technique', 'Anticipation', 'Concentration', 'Pace'] },
  // Backs
  { id: 'fb', short: 'Vleugelverd.', pos: ['DL', 'DR'], key: ['Marking', 'Tackling', 'Positioning', 'Anticipation', 'Concentration', 'Stamina', 'Pace', 'WorkRate'], pref: ['Crossing', 'Dribbling', 'Passing', 'Decisions', 'Teamwork', 'Acceleration', 'Agility'] },
  { id: 'wb', short: 'Wingback', pos: ['DL', 'DR', 'WBL', 'WBR'], key: ['Crossing', 'Dribbling', 'Tackling', 'OffTheBall', 'Stamina', 'Pace', 'Acceleration', 'WorkRate', 'Teamwork'], pref: ['Marking', 'FirstTouch', 'Passing', 'Technique', 'Anticipation', 'Positioning', 'Agility', 'Balance'] },
  // Verdedigende middenvelders
  { id: 'dm', short: 'Verd. MV', pos: ['DM'], key: ['Tackling', 'Marking', 'Positioning', 'Anticipation', 'Concentration', 'Teamwork', 'WorkRate', 'Decisions', 'Stamina'], pref: ['Aggression', 'Passing', 'Composure', 'Strength', 'Bravery', 'FirstTouch'] },
  { id: 'dlp', short: 'Regisseur', pos: ['DM', 'MC'], key: ['Passing', 'Vision', 'FirstTouch', 'Technique', 'Composure', 'Decisions', 'Teamwork', 'OffTheBall'], pref: ['Anticipation', 'Positioning', 'Tackling', 'Balance', 'WorkRate', 'Flair'] },
  { id: 'bwm', short: 'Baljager', pos: ['DM', 'MC'], key: ['Tackling', 'Aggression', 'WorkRate', 'Stamina', 'Teamwork', 'Anticipation', 'Marking', 'Bravery'], pref: ['Positioning', 'Determination', 'Concentration', 'Strength', 'Acceleration', 'Pace'] },
  // Centrale middenvelders
  { id: 'cm', short: 'Centrale MV', pos: ['MC'], key: ['Passing', 'Tackling', 'Decisions', 'Teamwork', 'WorkRate', 'Stamina', 'FirstTouch', 'Composure'], pref: ['Technique', 'Vision', 'OffTheBall', 'Anticipation', 'Positioning'] },
  { id: 'b2b', short: 'Box-to-box', pos: ['MC'], key: ['Stamina', 'WorkRate', 'Tackling', 'Passing', 'OffTheBall', 'Teamwork', 'Decisions', 'FirstTouch'], pref: ['Finishing', 'LongShots', 'Technique', 'Composure', 'Anticipation', 'Strength', 'Acceleration', 'Determination'] },
  { id: 'ap', short: 'Aanv. spelmaker', pos: ['MC', 'AMC'], key: ['Passing', 'Vision', 'Technique', 'FirstTouch', 'Composure', 'Decisions', 'OffTheBall', 'Flair'], pref: ['Dribbling', 'Anticipation', 'Agility', 'Teamwork', 'Acceleration'] },
  // Aanvallende / brede middenvelders
  { id: 'wing', short: 'Buitenspeler', pos: ['ML', 'MR', 'AML', 'AMR'], key: ['Crossing', 'Dribbling', 'Technique', 'Pace', 'Acceleration', 'Agility', 'OffTheBall'], pref: ['FirstTouch', 'Passing', 'Flair', 'Balance', 'Stamina', 'Anticipation'] },
  { id: 'if', short: 'Schaduwspits', pos: ['AML', 'AMR'], key: ['Dribbling', 'Finishing', 'FirstTouch', 'Technique', 'OffTheBall', 'Pace', 'Acceleration', 'Agility', 'Composure'], pref: ['LongShots', 'Passing', 'Flair', 'Anticipation', 'Balance', 'Vision'] },
  { id: 'am', short: 'Hangende spits', pos: ['AMC'], key: ['OffTheBall', 'FirstTouch', 'Technique', 'Finishing', 'Composure', 'Decisions', 'Dribbling', 'Passing'], pref: ['LongShots', 'Vision', 'Flair', 'Anticipation', 'Acceleration', 'Agility'] },
  // Spitsen
  { id: 'af', short: 'Diepe spits', pos: ['ST'], key: ['Finishing', 'OffTheBall', 'Composure', 'FirstTouch', 'Dribbling', 'Technique', 'Acceleration', 'Pace'], pref: ['Anticipation', 'Decisions', 'Agility', 'Balance', 'Flair'] },
  { id: 'poacher', short: 'Afmaker', pos: ['ST'], key: ['Finishing', 'OffTheBall', 'Anticipation', 'Composure', 'FirstTouch'], pref: ['Dribbling', 'Heading', 'Technique', 'Decisions', 'Acceleration', 'Pace'] },
  { id: 'tm', short: 'Targetman', pos: ['ST'], key: ['Heading', 'JumpingReach', 'Strength', 'Bravery', 'FirstTouch', 'OffTheBall', 'Finishing', 'Balance'], pref: ['Aggression', 'Anticipation', 'Composure', 'Teamwork', 'Determination'] },
  { id: 'cf', short: 'Complete spits', pos: ['ST'], key: ['Finishing', 'FirstTouch', 'Technique', 'OffTheBall', 'Composure', 'Dribbling', 'Heading', 'Strength', 'Acceleration', 'Pace'], pref: ['Passing', 'Vision', 'LongShots', 'Anticipation', 'Decisions', 'Agility', 'Balance', 'JumpingReach'] },
];
const ROLE_LABEL = {
  nl: { gk: 'Keeper', sk: 'Meevoetballende keeper', cd: 'Centrale verdediger', bpd: 'Opbouwende verdediger', fb: 'Vleugelverdediger', wb: 'Wingback', dm: 'Verdedigende middenvelder', dlp: 'Verdiepte spelmaker', bwm: 'Baljagende middenvelder', cm: 'Centrale middenvelder', b2b: 'Box-to-box middenvelder', ap: 'Aanvallende spelmaker', wing: 'Buitenspeler', if: 'Schaduwspits', am: 'Hangende spits', af: 'Diepliggende spits', poacher: 'Afmaker', tm: 'Targetman', cf: 'Complete spits' },
  en: { gk: 'Goalkeeper', sk: 'Sweeper Keeper', cd: 'Central Defender', bpd: 'Ball Playing Defender', fb: 'Full Back', wb: 'Wing Back', dm: 'Defensive Midfielder', dlp: 'Deep Lying Playmaker', bwm: 'Ball Winning Midfielder', cm: 'Central Midfielder', b2b: 'Box to Box Midfielder', ap: 'Advanced Playmaker', wing: 'Winger', if: 'Inside Forward', am: 'Attacking Midfielder', af: 'Advanced Forward', poacher: 'Poacher', tm: 'Target Man', cf: 'Complete Forward' },
};
const roleName = id => (ROLE_LABEL[state.lang]?.[id] ?? ROLE_LABEL.nl[id] ?? id);
const ROLE_BY_ID = Object.fromEntries(ROLES.map(r => [r.id, r]));
// Rolscore op de 1-20 schaal; key-attributen tellen dubbel. Vereist attributen (spelers).
function roleScore(p, role) {
  if (!p.attrs) return null;
  let sum = 0, w = 0;
  for (const k of role.key) { const v = p.attrs[k]; if (v != null) { sum += v * 2; w += 2; } }
  for (const k of role.pref) { const v = p.attrs[k]; if (v != null) { sum += v; w += 1; } }
  return w ? sum / w : null;
}
function rolesForPos(posArr) {
  const set = new Set(posArr || []);
  if (!set.size) return ROLES;                      // onbekende positie: toon alle
  const isGk = set.has('GK');
  return ROLES.filter(r => r.pos.some(x => set.has(x)) && (r.pos.includes('GK') === isGk));
}
// Beste rollen voor een speler (gesorteerd), voor het profiel.
function bestRoles(p, n = 5) {
  return rolesForPos(p.posArr).map(r => ({ id: r.id, score: roleScore(p, r) }))
    .filter(x => x.score != null).sort((a, b) => b.score - a.score).slice(0, n);
}
const roleClass = v => v == null ? '' : v >= 15 ? 'g5' : v >= 13 ? 'g4' : v >= 10.5 ? 'g3' : v >= 8 ? 'g2' : 'g1';

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
      return;
    }
    const b = $('banner');
    b.className = 'scanning'; b.textContent = t('loading'); b.onclick = null;
    const data = await (await fetch('/api/dump')).json();
    b.className = 'hidden';
    state.players = data.players || [];
    state.staff = data.staff || [];
    state.meta = data.meta || {};
    state._wageCeil = undefined;   // loonplafond opnieuw berekenen voor deze dump
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
    state.dumpStamp = st.dumpTime;
    renderDumpInfo();
    renderClubBadge();
    $('empty-state').classList.add('hidden');
    buildStaffRoles();
    applyFilters();
  } catch (e) { $('dump-info').textContent = 'fout'; console.error(e); }
}
function renderDumpInfo() {
  if (!state.dumpStamp) { $('dump-info').textContent = ''; return; }
  const when = new Date(state.dumpStamp);
  const n = state.players.length.toLocaleString();
  $('dump-info').textContent = n;
  $('dump-info').title = `${state.players.length.toLocaleString()} ${t('playersWord')} · ${state.staff.length.toLocaleString()} ${t('staffWord')}\n${when.toLocaleString()}`;
}
function renderClubBadge() {
  const mgr = state.meta.manager, club = state.meta.myClub, rep = state.meta.myClubRep;
  $('club-badge').innerHTML = (mgr || club) ? `${mgr ? mgr + ' · ' : ''}<b>${club || '?'}</b>` : '';
  $('club-badge').title = t('clickClubFilter') + (rep ? ` · ${t('repWord')} ${rep}` : '');
}
function buildStaffRoles() {
  const cur = $('f-staffrole').value;
  const jobs = [...new Set(state.staff.map(s => s.job).filter(Boolean))].sort();
  $('f-staffrole').innerHTML = `<option value="">${t('all')}</option>` + jobs.map(j => `<option>${j}</option>`).join('');
  $('f-staffrole').value = cur;
}
// Divisie-select: vult zich uit de aanwezige div-waarden; blijft verborgen zolang de
// plugin nog geen divisie meestuurt (div is momenteel leeg in de dump).
function buildDivisions() {
  const cur = $('f-div').value;
  const divs = [...new Set(state.players.map(p => p.div).filter(Boolean))].sort();
  const wrap = $('fg-div');
  if (!divs.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  $('f-div').innerHTML = `<option value="">${t('all')}</option>` + divs.map(d => `<option>${d}</option>`).join('');
  $('f-div').value = cur;
}
// Clubniveau-drempels op basis van clubreputatie (werkt nu; benadert de competitiesterkte).
const TIER_MIN = { top: 7500, strong: 6000, mid: 4000, low: 0 };
const TIER_MAX = { top: Infinity, strong: 7499, mid: 5999, low: 3999 };
// Rol-keuze: gegroepeerd op linie zodat de lijst overzichtelijk blijft.
function buildRoleSelect() {
  const groups = [
    ['GK', ['gk', 'sk']], ['DEF', ['cd', 'bpd', 'fb', 'wb']],
    ['MID', ['dm', 'dlp', 'bwm', 'cm', 'b2b', 'ap']], ['AANV', ['wing', 'if', 'am', 'af', 'poacher', 'tm', 'cf']],
  ];
  const heads = { GK: 'Keeper', DEF: 'Verdediging', MID: 'Middenveld', AANV: 'Aanval' };
  const headsEn = { GK: 'Goalkeeper', DEF: 'Defence', MID: 'Midfield', AANV: 'Attack' };
  const H = state.lang === 'en' ? headsEn : heads;
  let html = `<option value="">${t('roleAny')}</option>`;
  for (const [g, ids] of groups) {
    html += `<optgroup label="${H[g]}">` + ids.map(id => `<option value="${id}">${roleName(id)}</option>`).join('') + '</optgroup>';
  }
  $('f-role').innerHTML = html;
  $('f-role').value = state.role;
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
  const divVal = $('f-div').value;
  const tier = $('f-tier').value;
  const myClub = (state.meta.myClub || '').toLowerCase();
  if (state.mode === 'shortlist') rows = [...state.players, ...state.staff];

  state.filtered = rows.filter(p => {
    if (!p.name || !p.name.trim() || p.name.trim() === '?') return false;   // naamloze stubs verbergen
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
    if (divVal && p.div !== divVal) return false;
    if (tier) { const r = p.clubRep || 0; if (r < TIER_MIN[tier] || r > TIER_MAX[tier]) return false; }
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
  if ($('f-div').value) add(`${t('divLabel')}: ${$('f-div').value}`, () => { $('f-div').value = ''; });
  if ($('f-tier').value) add(`${t('clubTier')}: ${$('f-tier').selectedOptions[0].textContent}`, () => { $('f-tier').value = ''; });
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
  const cols = baseCols().filter(c => !c.star);
  const keys = cols.map(c => c.key);
  const defHidden = new Set(cols.filter(c => c.defHidden).map(c => c.key));
  let saved = state.colCfg[k];
  if (!saved || !Array.isArray(saved.order)) { saved = { order: [...keys], hidden: [...defHidden] }; state.colCfg[k] = saved; }
  for (const kk of keys) if (!saved.order.includes(kk)) {   // nieuwe kolommen erbij
    saved.order.push(kk);
    if (defHidden.has(kk) && !saved.hidden.includes(kk)) saved.hidden.push(kk);   // standaard verborgen
  }
  saved.order = saved.order.filter(kk => keys.includes(kk));                    // verdwenen eruit
  return saved;
}
function saveColCfg() { localStorage.setItem('fmss_cols', JSON.stringify(state.colCfg)); }
// Kolom voor de gekozen tactische rol (verschijnt alleen als er een rol geselecteerd is).
function roleCol() {
  const r = ROLE_BY_ID[state.role];
  if (!r) return null;
  return {
    key: 'role', label: 'roleColHdr', num: true,
    get: p => { const s = roleScore(p, r); return s == null ? -1 : s; },
    render: p => { const s = roleScore(p, r); return s == null ? '<span class="dim">·</span>' : `<span class="${roleClass(s)}">${s.toFixed(1)}</span>`; },
  };
}
function activeCols() {
  const base = baseCols();
  const byKey = Object.fromEntries(base.map(c => [c.key, c]));
  const cf = colCfg();
  const hidden = new Set(cf.hidden);
  const sl = base.find(c => c.star);                     // ster-kolom altijd vooraan
  const name = base.find(c => c.name);
  const rc = state.mode !== 'staff' ? roleCol() : null;  // rol-kolom direct na naam
  const capaHidden = k => state.hideCapa && (k === 'ca' || k === 'pa');
  const rest = cf.order.filter(k => !hidden.has(k) && byKey[k] && !(rc && k === 'role') && !capaHidden(k)).map(k => byKey[k]);
  const out = [];
  if (sl) out.push(sl);
  for (const c of rest) { out.push(c); if (rc && c === name) out.push(rc); }
  if (rc && !name) out.splice(1, 0, rc);
  return out;
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
let resizing = false;        // true tijdens/vlak na kolombreedte slepen (onderdrukt sorteer-klik)
// Meet de echte rijhoogte zodat spacer + translateY exact kloppen (voorkomt drift/verdwijnende lijnen).
function measureRowH() {
  const tr = $('grid-body').querySelector('tr[data-i]');
  if (!tr) return false;
  const h = tr.getBoundingClientRect().height;
  if (h > 12 && Math.abs(h - ROW_H) > 0.02) {
    ROW_H = h;
    return true;
  }
  return false;
}
function colLabel(c) { return c.star ? '★' : (c.label.startsWith('c_') || I18N.nl[c.label] ? t(c.label) : c.label); }
function colWidths() { return state.colW[modeKey()] || (state.colW[modeKey()] = {}); }
function saveColW() { localStorage.setItem('fmss_colw', JSON.stringify(state.colW)); }
function renderTable() {
  const cols = activeCols();
  const W = colWidths();
  $('grid-head').innerHTML = cols.map(c => {
    const stick = c.star ? 'c-sticky' : c.name ? 'c-sticky stick-end' : '';
    const w = W[c.key] ? ` style="width:${W[c.key]}px"` : '';
    const grip = c.star ? '' : '<span class="col-resize"></span>';   // sleepgreep rechts
    return `<th data-key="${c.key}" draggable="${c.star ? 'false' : 'true'}"${w} class="${stick} ${c.key === state.sortKey ? 'sorted' : ''}">${colLabel(c)}${c.key === state.sortKey ? (state.sortDir < 0 ? ' ▼' : ' ▲') : ''}${grip}</th>`;
  }).join('');
  $('grid-head').querySelectorAll('th').forEach(th => {
    const k = th.dataset.key;
    // kolombreedte slepen via de greep rechts
    const grip = th.querySelector('.col-resize');
    if (grip) {
      grip.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        resizing = true;                                     // onderdruk de sorteer-klik hierna
        const startX = e.clientX, startW = th.getBoundingClientRect().width;
        th.draggable = false;
        const move = ev => { const nw = Math.max(40, Math.round(startW + ev.clientX - startX)); th.style.width = nw + 'px'; colWidths()[k] = nw; };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); th.draggable = true; saveColW(); renderVisible(); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      });
      grip.addEventListener('click', e => { e.stopPropagation(); });   // greep-klik nooit sorteren
      grip.ondragstart = e => { e.preventDefault(); e.stopPropagation(); };
    }
    const col = cols.find(c => c.key === k);
    th.onclick = () => {
      if (col?.star) return;
      if (resizing) { resizing = false; return; }            // net een kolom versmald/verbreed: niet sorteren
      if (state.sortKey === k) state.sortDir *= -1;
      else { state.sortKey = k; state.sortDir = (k === 'pos' || k === 'name' || k === 'nat') ? 1 : -1; }
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
  const total = state.filtered.length;
  const first = Math.max(0, Math.floor(wrap.scrollTop / ROW_H) - 10);
  const count = Math.ceil(wrap.clientHeight / ROW_H) + 20;
  const last = Math.min(total, first + count);
  const slice = state.filtered.slice(first, last);
  const body = $('grid-body');
  // Virtualisatie via spacer-rijen binnen de tbody: totale hoogte = exact total*ROW_H,
  // dus je kunt nooit voorbij de lijst scrollen (geen leeg veld bij korte lijsten).
  const ncol = cols.length;
  const topPad = first * ROW_H, botPad = (total - last) * ROW_H;
  const spacer = h => h > 0 ? `<tr class="vspacer"><td colspan="${ncol}" style="height:${h}px;padding:0;border:0"></td></tr>` : '';
  body.innerHTML = spacer(topPad) + slice.map((p, i) => {
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
  }).join('') + spacer(botPad);
  body.querySelectorAll('tr[data-i]').forEach(tr => {
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
  const withCapa = !state.hideCapa;
  const cols = ['Name', 'Position', 'Age', 'Club', 'Nationality',
    ...(withCapa ? ['CA', 'PA'] : []), 'Value(GBP)', 'Wage(GBP)', 'Contract', 'Interest'];
  const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const p of all) {
    const i = interestEstimate(p);
    lines.push([p.name, p.pos || p.job || '', getAge(p), p.club || '', (p.nat || []).join('/'),
      ...(withCapa ? [p.ca, p.pa] : []), estValue(p).v ?? '', p.wage ?? '', p.expires || '', i ? i.label : ''].map(esc).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fmsuperscout-shortlist.csv';
  a.click(); URL.revokeObjectURL(a.href);
  showToast('✓ ' + all.length + ' → CSV');
}

// ---------- detailpaneel ----------
// FM-attribuutkleuren: 16-20 groen, 11-15 oranje, 1-10 witachtig. Ook voor potentie-projectie.
const attrClass = v => v >= 16 ? 'at-hi' : v >= 11 ? 'at-mid' : 'at-lo';
const abar = v => `<span class="abar"><i class="${attrClass(v)}" style="width:${Math.min(100, v * 5)}%"></i></span>`;
// Fysieke attributen pieken vroeg en groeien nauwelijks; technisch/mentaal groeit langer door.
const PHYS_ATTRS = new Set(['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength']);
// Aandeel van de resterende groei dat op deze leeftijd nog realistisch is (grofweg de FM-groeicurve).
function ageRemainFactor(age) {
  if (age == null) return 0.5;
  if (age <= 18) return 1.0;
  if (age <= 21) return 0.85;
  if (age <= 23) return 0.6;
  if (age <= 25) return 0.4;
  if (age <= 27) return 0.2;
  if (age <= 29) return 0.08;
  return 0.0;
}
// Positie-relevantie per attribuut voor de groeiprojectie: attributen die bij de rollen van de
// speler horen groeien het hardst (key 1.0, preferable 0.6, rest 0.25). Zo krijgt een spits geen
// 20 mandekking, ook niet met veel PA-ruimte.
function growthRelevance(p) {
  const rel = {};
  for (const role of rolesForPos(p.posArr)) {
    for (const k of role.pref) if ((rel[k] || 0) < 0.6) rel[k] = 0.6;
    for (const k of role.key) rel[k] = 1.0;
  }
  return rel;
}
// Projecteer één attribuut naar het potentieel (PA): additieve, positie-gewogen groei uit de
// CA-koppenruimte, gedempt door leeftijd, Determination en attribuuttype (fysiek groeit minder
// en stopt na ~24). Niet elk attribuut schiet naar 20; alleen wat relevant is groeit echt door.
function potAttr(p, v, key, rel) {
  if (!p.pa || !p.ca || p.pa <= p.ca) return v;
  const head = p.pa - p.ca;                               // CA-koppenruimte (0-200 schaal)
  const age = getAge(p);
  const ageF = ageRemainFactor(age);
  const det = (p.attrs && p.attrs.Determination) || p.determination || 10;
  const detF = 0.6 + 0.4 * Math.min(1, det / 18);         // vastberadenheid benut meer groei
  const isPhys = key && PHYS_ATTRS.has(key);
  const physF = isPhys ? (age != null && age >= 24 ? 0.15 : 0.6) : 1.0;
  const r = rel ? (rel[key] ?? 0.25) : 0.5;               // positie-relevantie
  const growth = r * ageF * detF * physF * 0.05 * head;
  return Math.min(20, Math.round(v + growth));
}
function showDetail(p) {
  state.selected = p;
  renderVisible();
  $('detail').classList.remove('hidden');
  const isPlayer = !!p.attrs;
  const on = state.shortlist.has(p.id);
  const ev = estValue(p);
  const valTxt = ev.v == null ? '–' : ev.v === 0 ? t('free_l') : ev.est ? `${fmtMoney(ev.lo)} – ${fmtMoney(ev.hi)}` : fmtMoney(ev.v);

  const gauge = (!state.hideCapa && (p.ca != null || p.pa != null)) ? `<div class="capa">
    <div class="capa-nums"><span><b>CA</b> <span class="ca-bar">${p.ca ?? '–'}</span></span><span><b>PA</b> <span class="pa-bar">${p.pa ?? '–'}</span></span></div>
    <div class="capa-track"><span class="capa-pa" style="width:${Math.min(100, (p.pa ?? 0) / 2)}%"></span><span class="capa-ca" style="width:${Math.min(100, (p.ca ?? 0) / 2)}%"></span></div>
  </div>` : '';
  const inCmp = state.compare.includes(p.id);
  let html = `<h2>${p.name} <span class="detail-star ${on ? 'on' : ''}" data-star="${p.id}">${on ? '★' : '☆'}</span>
    <button class="copybtn" title="Kopieer naam">📋</button>
    <button class="cmpbtn ${inCmp ? 'on' : ''}" title="${t('addCompare')}">⚖</button></h2>
  <div class="sub">${getAge(p)} · ${(p.nat || []).join(', ')}${isEu(p) ? ' · <span class="eu-yes">EU</span>' : ''} · ${clubLabel(p)}</div>
  ${gauge}
  <div class="kv">
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
    if (i) html += `<div class="interest-box"><b>${t('interestTitle')}:</b> <span class="int ${i.cls}">${i.label}</span> <span class="dim">(${i.score}/100)</span>${i.note ? `<div class="int-note">${t(i.note === 'minor' ? 'minorNote' : 'minorIntlNote')}</div>` : ''}</div>`;
  }

  // Beste tactische rollen (met de gekozen rol bovenaan als die past)
  if (isPlayer && p.attrs) {
    let roles = bestRoles(p, 5);
    if (state.role && ROLE_BY_ID[state.role]) {
      const sc = roleScore(p, ROLE_BY_ID[state.role]);
      if (sc != null && !roles.some(r => r.id === state.role)) roles = [{ id: state.role, score: sc }, ...roles].slice(0, 5);
    }
    if (roles.length) {
      html += `<div class="roles-box"><div class="rb-head">${t('bestRoles')}</div>` + roles.map(r => {
        const sel = r.id === state.role ? ' sel' : '';
        return `<div class="role-row${sel}"><span class="rn">${roleName(r.id)}</span><span class="abar rb"><i class="ab-${roleClass(r.score)}" style="width:${Math.min(100, r.score * 5)}%"></i></span><span class="v ${roleClass(r.score)}">${r.score.toFixed(1)}</span></div>`;
      }).join('') + '</div>';
    }
  }

  if (isPlayer && p.attrs) {
    const canPot = p.pa > p.ca;
    html += `<label class="potswitch${canPot ? '' : ' off'}"><input type="checkbox" id="pot-toggle" ${state.showPot ? 'checked' : ''} ${canPot ? '' : 'disabled'}> ${t('showPot')}${state.showPot ? ` <span class="dim">(${t('potNote')})</span>` : ''}</label>`;
    const isGk = (p.posArr || []).includes('GK');
    const groups = isGk ? ATTR_GROUPS_GK : ATTR_GROUPS_OUTFIELD;
    const rel = state.showPot ? growthRelevance(p) : null;
    const col = {};
    for (const [gk, keys] of groups) {
      const rows = keys.filter(k => p.attrs[k] != null);
      col[gk] = !rows.length ? '' : `<div class="attr-col"><h3>${t(gk)}</h3>` + rows.map((k, idx) => {
        const raw = p.attrs[k];
        const shown = state.showPot ? potAttr(p, raw, k, rel) : raw;
        const grew = state.showPot && shown > raw;
        return `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${attrName(k)}</span>${abar(shown)}<span class="v ${attrClass(shown)}${grew ? ' grew' : ''}">${shown}</span></div>`;
      }).join('') + '</div>';
    }
    // Persoonlijkheid (verborgen kenmerken) — net als een normale eigenschappengroep.
    const pd = [['ambition', p.ambition], ['professionalism', p.professionalism], ['loyalty', p.loyalty],
      ['pressure', p.pressure], ['temperament', p.temperament], ['sportsmanship', p.sportsmanship],
      ['adaptability', p.adaptability], ['controversy', p.controversy]].filter(x => x[1] > 0);
    const persHtml = pd.length ? `<div class="attr-col"><h3>${t('personaTitle')}</h3>` + pd.map(([k, v], idx) =>
      `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${t(k)}</span>${abar(v)}<span class="v ${attrClass(v)}">${v}</span></div>`).join('') + '</div>' : '';
    // Overige verborgen kenmerken. Bij InjuryProneness/Dirtiness is HOOG slecht → kleur omkeren.
    const hd = [['Consistency', true], ['ImportantMatches', true], ['Versatility', true],
      ['InjuryProneness', false], ['Dirtiness', false]]
      .map(([k, good]) => [k, p.attrs ? p.attrs[k] : 0, good]).filter(x => x[1] > 0);
    const hidHtml = hd.length ? `<div class="attr-col"><h3>${t('hiddenTitle')}</h3>` + hd.map(([k, v, good], idx) => {
      const cls = good ? attrClass(v) : attrClass(21 - v);   // "slecht-hoog": omgekeerde kleur
      return `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${t('a_' + k)}</span><span class="abar"><i class="${cls}" style="width:${Math.min(100, v * 5)}%"></i></span><span class="v ${cls}">${v}</span></div>`;
    }).join('') + '</div>' : '';
    // Grid: links Technisch/Keepen + Standaardsituaties (Mentaal loopt ernaast over 2 rijen),
    // onderste rij Fysiek | Persoonlijkheid op gelijke hoogte.
    const techKey = isGk ? 'g_goalkeeping' : 'g_technical';
    html += `<div class="attr-grid">
      <div style="grid-area:tech">${col[techKey] || ''}</div>
      <div style="grid-area:sp">${col['g_setpieces'] || ''}</div>
      <div style="grid-area:ment">${col['g_mental'] || ''}</div>
      <div style="grid-area:phys">${col['g_physical'] || ''}</div>
      <div style="grid-area:pers">${persHtml}${hidHtml}</div>
    </div>`;
  } else if (p.staffAttrs) {
    html += `<div class="attr-cols"><div class="attr-col"><h3>${t('staffAttrs')}</h3>` +
      Object.entries(p.staffAttrs).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v], idx) =>
        `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${k.replace(/_/g, ' ')}</span>${abar(v)}<span class="v ${attrClass(v)}">${v}</span></div>`).join('') + '</div></div>';
  }
  $('detail-body').innerHTML = html;
  document.querySelector('.detail-star').onclick = () => toggleShortlist(p.id);
  document.querySelector('.copybtn').onclick = () => copyName(p.name);
  const cmp = document.querySelector('.cmpbtn');
  if (cmp) cmp.onclick = () => { toggleCompare(p.id); cmp.classList.toggle('on', state.compare.includes(p.id)); };
  const pt = $('pot-toggle');
  if (pt) pt.onchange = () => { state.showPot = pt.checked; showDetail(p); };
  if (p.id !== state._donLast) { state._donLast = p.id; maybeDonateNudge(); }   // telt per nieuw profiel
}

// ---------- steun (Ko-fi), sympathiek en niet-opdringerig ----------
const KOFI = 'https://ko-fi.com/fmsuperscout';
function openKofi() { window.open(KOFI, '_blank', 'noopener'); }
// Eénmalige, wegklikbare nudge na echt gebruik (25 bekeken profielen). Daarna nooit meer.
function maybeDonateNudge() {
  if (localStorage.getItem('fmss_donate')) return;
  const n = (+localStorage.getItem('fmss_uses') || 0) + 1;
  localStorage.setItem('fmss_uses', String(n));
  if (n < 25) return;
  localStorage.setItem('fmss_donate', '1');
  const el = $('donate-nudge');
  el.innerHTML = `<button class="dn-x" title="${t('donateLater')}">✕</button>
    <div class="dn-title">☕ ${t('donateTitle')}</div>
    <div class="dn-text">${t('donateBody')}</div>
    <div class="dn-actions"><a class="dn-cta" href="${KOFI}" target="_blank" rel="noopener">${t('donateCta')}</a>
      <button class="dn-later">${t('donateLater')}</button></div>`;
  el.classList.remove('hidden');
  const close = () => el.classList.add('hidden');
  el.querySelector('.dn-cta').onclick = close;
  el.querySelector('.dn-later').onclick = close;
  el.querySelector('.dn-x').onclick = close;
}

// ---------- spelervergelijking ----------
const findPlayer = id => state.players.find(p => p.id === id) || state.staff.find(p => p.id === id);
function toggleCompare(id) {
  const i = state.compare.indexOf(id);
  if (i >= 0) state.compare.splice(i, 1);
  else { if (state.compare.length >= 3) { showToast(t('compareFull')); return; } state.compare.push(id); }
  renderCompareTray();
}
function renderCompareTray() {
  const tray = $('compare-tray');
  if (!state.compare.length) { tray.classList.add('hidden'); return; }
  tray.classList.remove('hidden');
  const chips = state.compare.map(id => {
    const p = findPlayer(id);
    return `<span class="ct-chip" data-id="${id}">${p ? p.name : '?'}<span class="x" data-rm="${id}">✕</span></span>`;
  }).join('');
  tray.innerHTML = `<div class="ct-label">${t('comparing')}</div>${chips}` +
    `<button class="ct-go" ${state.compare.length < 2 ? 'disabled' : ''}>${t('compare')} (${state.compare.length})</button>` +
    `<button class="ct-clear" title="${t('clear')}">✕</button>`;
  tray.querySelectorAll('[data-rm]').forEach(x => x.onclick = e => { e.stopPropagation(); toggleCompare(+x.dataset.rm); });
  tray.querySelectorAll('.ct-chip').forEach(c => c.onclick = () => { const p = findPlayer(+c.dataset.id); if (p) showDetail(p); });
  tray.querySelector('.ct-go').onclick = openCompare;
  tray.querySelector('.ct-clear').onclick = () => { state.compare = []; renderCompareTray(); };
}
function bestRoleScore(p) {
  const b = bestRoles(p, 1)[0];
  return b ? { name: roleName(b.id), score: b.score } : null;
}
function openCompare() {
  const players = state.compare.map(findPlayer).filter(Boolean);
  if (players.length < 2) return;
  const cell = (vals, i, hi) => {
    const v = vals[i];
    if (v == null) return '<span class="dim">·</span>';
    const nums = vals.filter(x => x != null);
    const best = hi ? Math.max(...nums) : Math.min(...nums);
    const worst = hi ? Math.min(...nums) : Math.max(...nums);
    const cls = nums.length > 1 && v === best ? 'cmp-best' : (nums.length > 1 && v === worst ? 'cmp-worst' : '');
    return `<span class="${cls}">${v}</span>`;
  };
  const headRow = `<div class="cmp-row cmp-head"><div class="cmp-lbl"></div>` +
    players.map(p => `<div class="cmp-cell"><div class="cmp-name">${p.name}</div><div class="cmp-meta">${getAge(p)} · ${p.pos || p.job || ''}<br>${p.club || t('clubless')}</div></div>`).join('') + '</div>';
  const statRow = (label, vals, opts = {}) => {
    const hi = opts.hi !== false;
    return `<div class="cmp-row"><div class="cmp-lbl">${label}</div>` +
      vals.map((_, i) => `<div class="cmp-cell">${opts.fmt ? (vals[i] == null ? '<span class="dim">·</span>' : cellFmt(vals, i, hi, opts.fmt)) : cell(vals, i, hi)}</div>`).join('') + '</div>';
  };
  function cellFmt(vals, i, hi, fmt) {
    const nums = vals.filter(x => x != null);
    const best = hi ? Math.max(...nums) : Math.min(...nums);
    const cls = nums.length > 1 && vals[i] === best ? 'cmp-best' : '';
    return `<span class="${cls}">${fmt(vals[i])}</span>`;
  }
  let body = headRow;
  if (!state.hideCapa) {
    body += statRow('CA', players.map(p => p.ca));
    body += statRow('PA', players.map(p => p.pa));
  }
  body += statRow(t('cmpValue'), players.map(p => estValue(p).v), { fmt: fmtMoney });
  body += statRow(t('wageLabel'), players.map(p => p.wage), { fmt: fmtMoney, hi: false });
  body += statRow(t('c_age'), players.map(p => getAge(p)), { hi: false });
  const roles = players.map(bestRoleScore);
  body += `<div class="cmp-row"><div class="cmp-lbl">${t('cmpTopRole')}</div>` +
    roles.map(r => `<div class="cmp-cell">${r ? `${r.name}<br><b class="${roleClass(r.score)}">${r.score.toFixed(1)}</b>` : '<span class="dim">·</span>'}</div>`).join('') + '</div>';

  // Attributen (alleen spelers; per rij winnaar groen). Groepeer met de bestaande groepen.
  const anyPlayer = players.some(p => p.attrs);
  if (anyPlayer) {
    const isGk = players.every(p => (p.posArr || []).includes('GK'));
    const groups = isGk ? ATTR_GROUPS_GK : ATTR_GROUPS_OUTFIELD;
    for (const [gk, keys] of groups) {
      const present = keys.filter(k => players.some(p => p.attrs && p.attrs[k] != null));
      if (!present.length) continue;
      body += `<div class="cmp-group">${t(gk)}</div>`;
      for (const k of present) body += statRow(attrName(k), players.map(p => p.attrs ? p.attrs[k] : null));
    }
  }
  const cols = `120px repeat(${players.length}, 1fr)`;
  $('compare-inner').innerHTML =
    `<div class="cmp-top"><h2>${t('cmpTitle')}</h2><button id="cmp-close">✕</button></div>` +
    `<div class="cmp-grid" style="grid-template-columns:${cols}">${body}</div>`;
  $('compare-modal').classList.remove('hidden');
  $('cmp-close').onclick = closeCompare;
}
function closeCompare() { $('compare-modal').classList.add('hidden'); }
$('compare-modal').addEventListener('click', e => { if (e.target.id === 'compare-modal') closeCompare(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('compare-modal').classList.contains('hidden')) closeCompare(); });

// ---------- squad-behoefteanalyse ----------
// Positiegroepen met een streefaantal (basis + degelijke cover) en de bijhorende pitch-codes.
const SQUAD_GROUPS = [
  { id: 'gk', label: { nl: 'Keeper', en: 'Goalkeeper' }, pos: ['GK'], target: 2 },
  { id: 'cb', label: { nl: 'Centrale verdediger', en: 'Central defender' }, pos: ['DC'], target: 4 },
  { id: 'fb', label: { nl: 'Vleugelverdediger', en: 'Full back' }, pos: ['DL', 'DR', 'WBL', 'WBR'], target: 4 },
  { id: 'dm', label: { nl: 'Verdedigende mid', en: 'Defensive mid' }, pos: ['DM'], target: 2 },
  { id: 'cm', label: { nl: 'Centrale middenvelder', en: 'Central midfielder' }, pos: ['MC'], target: 3 },
  { id: 'wing', label: { nl: 'Buitenspeler', en: 'Winger' }, pos: ['ML', 'MR', 'AML', 'AMR'], target: 4 },
  { id: 'am', label: { nl: 'Aanvallende mid', en: 'Attacking mid' }, pos: ['AMC'], target: 2 },
  { id: 'st', label: { nl: 'Spits', en: 'Striker' }, pos: ['ST'], target: 3 },
];
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
function analyseSquad() {
  const club = (state.meta.myClub || '').toLowerCase();
  if (!club) return null;
  const squad = state.players.filter(p => (p.club || '').toLowerCase() === club);
  const groups = SQUAD_GROUPS.map(g => {
    const set = new Set(g.pos);
    const members = squad.filter(p => (p.posArr || []).some(x => set.has(x))).sort((a, b) => (b.ca || 0) - (a.ca || 0));
    const cas = members.map(p => p.ca || 0);
    const ages = members.map(p => getAge(p)).filter(x => x != null);
    const bestCa = cas.length ? Math.max(...cas) : 0;
    const youngTalents = members.filter(p => getAge(p) <= 21 && (p.pa || 0) > 0).sort((a, b) => (b.pa || 0) - (a.pa || 0));
    const succ = youngTalents.find(p => (p.pa || 0) >= bestCa);   // jong talent dat het niveau haalt
    // Statusbepaling
    let status = 'ok';
    if (members.length < Math.ceil(g.target / 2)) status = 'short';
    else if (members.length < g.target) status = 'thin';
    const avgAge = avg(ages);
    const aging = avgAge >= 28.5 && !succ && members.length > 0;
    // Aanbeveling + scout-parameters
    let rec = null, scout = null;
    const suggPa = Math.max(bestCa, Math.round(avg(cas) + 12) || 120);
    const np = state.hideCapa ? 'Np' : '';   // number-free varianten als CA/PA verborgen is
    if (status === 'short') {
      const n = g.target - members.length;
      rec = tf('anRecShort' + np, { n, pa: suggPa }); scout = { pos: g.pos, minPa: Math.max(80, suggPa - 20) };
    } else if (aging) {
      rec = tf('anRecAging' + np, { age: 23, pa: bestCa }); scout = { pos: g.pos, maxAge: 23, minPa: bestCa };
    } else if (!succ && members.length) {
      rec = tf('anRecSucc' + np, { age: 23, pa: bestCa }); scout = { pos: g.pos, maxAge: 23, minPa: bestCa };
    } else if (status === 'thin') {
      rec = tf('anRecThin' + np, { pa: suggPa }); scout = { pos: g.pos, minPa: suggPa };
    }
    // prioriteit voor sortering/samenvatting
    const prio = status === 'short' ? 3 : aging ? 2.5 : (!succ && members.length) ? 1.5 : status === 'thin' ? 1 : 0;
    return { g, members, count: members.length, avgAge, avgCa: avg(cas), bestCa, youngTalents, succ, status, aging, rec, scout, prio };
  });
  return { squad, groups };
}
// simpele template-invuller {key}
function tf(key, vars) { return t(key).replace(/\{(\w+)\}/g, (_, k) => vars[k]); }

function renderAnalysis() {
  const box = $('analysis');
  const data = analyseSquad();
  if (!data) { box.innerHTML = `<div class="an-empty">${t('anNoClub')}</div>`; return; }
  const { squad, groups } = data;
  const needs = groups.filter(x => x.rec).sort((a, b) => b.prio - a.prio);
  const topNeed = needs[0];
  const statusLabel = { ok: t('anOk'), thin: t('anThin'), short: t('anShort') };

  const caTile = state.hideCapa ? '' :
    `<div class="an-sum-item"><span class="an-sum-n">${Math.round(avg(squad.map(p => p.ca || 0)))}</span><span class="an-sum-l">${t('anAvgCa')}</span></div>`;
  const summary = `<div class="an-summary">
    <div class="an-sum-item"><span class="an-sum-n">${squad.length}</span><span class="an-sum-l">${t('anSquadSize')}</span></div>
    ${caTile}
    <div class="an-sum-item"><span class="an-sum-n">${avg(squad.map(p => getAge(p)).filter(Boolean)).toFixed(1)}</span><span class="an-sum-l">${t('anAvgAge')}</span></div>
    <div class="an-sum-item need"><span class="an-sum-l">${t('anBiggestNeed')}</span><span class="an-sum-need">${topNeed ? topNeed.g.label[state.lang] || topNeed.g.label.nl : '–'}</span></div>
  </div>`;

  const cards = groups.map(x => {
    const st = x.aging ? 'aging' : x.status;
    const badge = x.status === 'short' ? `<span class="an-badge red">${t('anShort')}</span>`
      : x.aging ? `<span class="an-badge amber">${t('anAging')}</span>`
        : (!x.succ && x.count) ? `<span class="an-badge amber">${t('anNoSucc')}</span>`
          : x.status === 'thin' ? `<span class="an-badge amber">${t('anThin')}</span>`
            : `<span class="an-badge green">${t('anOk')}</span>`;
    const dots = Array.from({ length: x.g.target }, (_, i) =>
      `<span class="dot ${i < x.count ? 'on' : ''}"></span>`).join('');
    const depthDots = dots + (x.count > x.g.target ? `<span class="dot-extra">+${x.count - x.g.target}</span>` : '');
    const yt = x.youngTalents[0];
    return `<div class="an-card ${st}">
      <div class="an-card-top"><span class="an-pos">${x.g.label[state.lang] || x.g.label.nl}</span>${badge}</div>
      <div class="an-depth" title="${x.count}/${x.g.target}">${depthDots}</div>
      <div class="an-stats">
        <span><b>${x.count}</b> ${t('anPlayers')}</span>
        ${state.hideCapa ? '' : `<span><b>${Math.round(x.avgCa)}</b> ${t('anAvgCa')}</span>
        <span><b>${x.bestCa}</b> ${t('anTopCa')}</span>`}
        <span><b>${x.avgAge ? x.avgAge.toFixed(0) : '–'}</b> ${t('anAvgAge')}</span>
      </div>
      <div class="an-young">${t('anYoungTalent')}: ${yt ? `${yt.name} <span class="dim">(${getAge(yt)}${state.hideCapa ? '' : `, PA ${yt.pa || '·'}`})</span>` : t('anNone')}</div>
      ${x.rec ? `<div class="an-rec">${x.rec}</div>` : ''}
      ${x.scout ? `<button class="an-scout" data-grp="${x.g.id}">${t('anScout')} →</button>` : ''}
    </div>`;
  }).join('');

  box.innerHTML = `<div class="an-head"><h2>${t('anTitle')}</h2></div>${summary}<div class="an-grid">${cards}</div>`;
  box.querySelectorAll('.an-scout').forEach(b => b.onclick = () => {
    const grp = groups.find(x => x.g.id === b.dataset.grp);
    if (grp && grp.scout) scoutFor(grp.scout);
  });
}
// Zet filters + veld op de gevraagde behoefte en spring naar het Spelers-tabblad.
function scoutFor(s) {
  setMode('players');
  $('btn-clear').onclick();                 // schone lei
  activePos.clear();
  const codes = new Set(s.pos);
  document.querySelectorAll('.pos-node').forEach(n => { if (codes.has(n.dataset.pos)) { activePos.add(n.dataset.pos); n.classList.add('on'); } });
  if (s.minPa) $('f-pa-min').value = s.minPa;
  if (s.maxAge) $('f-age-max').value = s.maxAge;
  applyFilters();
  showToast('🔍 ' + [...codes].join(', '));
}
$('detail-close').onclick = () => { $('detail').classList.add('hidden'); state.selected = null; renderVisible(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('detail-close').onclick(); });

// ---------- UI-bediening ----------
['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-price', 'f-wage', 'f-nat'].forEach(id => {
  let tm; $(id).addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(applyFilters, 150); });
});
['f-eu', 'f-myclub', 'f-attain', 'f-listed', 'f-exp6', 'f-exp12', 'f-free', 'f-shortlist'].forEach(id => $(id).addEventListener('change', applyFilters));
$('f-staffrole').addEventListener('change', applyFilters);
$('f-div').addEventListener('change', applyFilters);
$('f-tier').addEventListener('change', applyFilters);
$('f-interest').addEventListener('change', applyFilters);
$('f-role').addEventListener('change', () => {
  state.role = $('f-role').value;
  localStorage.setItem('fmss_role', state.role);
  if (state.role) { state.sortKey = 'role'; state.sortDir = -1; }        // meteen op rolscore sorteren
  else if (state.sortKey === 'role') { state.sortKey = 'ca'; state.sortDir = -1; }
  applyFilters();
  if (state.selected) showDetail(state.selected);
});
$('f-refyear').addEventListener('input', () => { const y = +$('f-refyear').value; if (y >= 2000 && y <= 2100) { state.refYear = y; applyFilters(); } });
$('pos-clear').onclick = () => { activePos.clear(); document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on')); applyFilters(); };

$('btn-clear').onclick = () => {
  document.querySelectorAll('#filters input[type=text], #filters input[type=number]').forEach(i => { if (i.id !== 'f-refyear') i.value = ''; });
  document.querySelectorAll('#filters input[type=checkbox]').forEach(i => i.checked = false);
  $('f-staffrole').value = ''; $('f-interest').value = '0';
  $('f-div').value = ''; $('f-tier').value = '';
  activePos.clear();
  document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on'));
  applyFilters();
};
$('btn-sidebar').onclick = () => document.body.classList.toggle('sidebar-collapsed');
$('btn-export').onclick = exportShortlist;
$('btn-coffee').onclick = openKofi;

// inklapbare filtersecties (voorkeur onthouden)
const collapsedSecs = new Set(JSON.parse(localStorage.getItem('fmss_secs') || '[]'));
document.querySelectorAll('.fsection[data-sec]').forEach(sec => {
  const key = sec.dataset.sec;
  if (collapsedSecs.has(key)) sec.classList.add('collapsed');
  sec.querySelector('.fsec-head').addEventListener('click', e => {
    if (e.target.closest('.mini')) return;
    sec.classList.toggle('collapsed');
    if (sec.classList.contains('collapsed')) collapsedSecs.add(key); else collapsedSecs.delete(key);
    localStorage.setItem('fmss_secs', JSON.stringify([...collapsedSecs]));
  });
});

// '/' focust het zoekveld
document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.target.closest?.('input, select, textarea')) { e.preventDefault(); $('f-name').focus(); }
});

// ↑/↓ bladert door de rijen; het detailpaneel volgt
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  if (e.target.closest?.('input, select, textarea')) return;
  if (!state.filtered.length) return;
  e.preventDefault();
  let i = state.selected ? state.filtered.indexOf(state.selected) : -1;
  i = e.key === 'ArrowDown' ? Math.min(state.filtered.length - 1, i + 1) : Math.max(0, i - 1);
  const wrap = $('table-wrap');
  const y = i * ROW_H;
  if (y < wrap.scrollTop) wrap.scrollTop = y;
  else if (y + ROW_H * 2 > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = y - wrap.clientHeight + ROW_H * 2;
  showDetail(state.filtered[i]);
});

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
// CA/PA verbergen (anti-"spieken"). Past de hele tool consistent aan.
function applyHideCapa() {
  document.body.classList.toggle('hide-capa', state.hideCapa);
  if (state.hideCapa) {                       // CA/PA-filters leegmaken zodat ze niet stiekem filteren
    ['f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max'].forEach(id => { $(id).value = ''; });
    if (state.sortKey === 'ca' || state.sortKey === 'pa') { state.sortKey = state.mode === 'staff' ? 'wage' : 'value'; state.sortDir = -1; }
  }
  if (state.mode === 'analysis') renderAnalysis(); else applyFilters();
  if (state.selected) showDetail(state.selected);
}
$('set-hidecapa').checked = state.hideCapa;
$('set-hidecapa').addEventListener('change', () => {
  state.hideCapa = $('set-hidecapa').checked;
  localStorage.setItem('fmss_hidecapa', state.hideCapa ? '1' : '0');
  applyHideCapa();
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
  const b = $('banner');
  try {
    const st = await (await fetch('/api/fmstatus')).json();
    if (!st.running) { b.className = 'scanning error'; b.textContent = t('fmNotRunning'); b.onclick = null; return; }
    await fetch('/api/refresh', { method: 'POST' });
    b.className = 'scanning'; b.textContent = t('reqSent'); b.onclick = null;
  } catch { showToast('!'); }
};

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('[data-i18n-html]').forEach(el => el.innerHTML = t(el.dataset.i18nHtml));
  $('f-name').placeholder = t('searchph');
  $('btn-coffee').title = t('donateBtn');
  renderDumpInfo();
  renderClubBadge();
  buildStaffRoles();
  buildRoleSelect();
  buildDivisions();
  applyFilters();
  if (state.selected) showDetail(state.selected);
}

function setMode(mode) {
  state.mode = mode;
  const isAn = mode === 'analysis';
  $('tab-players').classList.toggle('active', mode === 'players');
  $('tab-staff').classList.toggle('active', mode === 'staff');
  $('tab-shortlist').classList.toggle('active', mode === 'shortlist');
  $('tab-analysis').classList.toggle('active', isAn);
  $('fg-pitch').style.display = mode === 'staff' || isAn ? 'none' : '';
  $('fg-staffrole').style.display = mode === 'staff' ? '' : 'none';
  $('fg-role').style.display = mode === 'staff' || isAn ? 'none' : '';
  $('sl-bar').classList.toggle('hidden', mode !== 'shortlist');
  document.body.classList.toggle('mode-analysis', isAn);
  state.selected = null;
  $('detail').classList.add('hidden');
  if (isAn) {
    $('chipbar').innerHTML = '';
    $('table-wrap').style.display = 'none';
    $('empty-state').classList.add('hidden');
    $('analysis').classList.remove('hidden');
    renderAnalysis();
    return;
  }
  $('table-wrap').style.display = '';
  $('analysis').classList.add('hidden');
  if (!activeCols().find(c => c.key === state.sortKey)) { state.sortKey = 'ca'; state.sortDir = -1; }
  applyFilters();
}
$('tab-players').onclick = () => setMode('players');
$('tab-staff').onclick = () => setMode('staff');
$('tab-shortlist').onclick = () => setMode('shortlist');
$('tab-analysis').onclick = () => setMode('analysis');
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

// Heartbeat: alleen in de standalone app-modus, zodat de server stopt als het venster sluit.
// In dev-modus (browser) niet nodig, dat scheelt onnodig netwerkverkeer.
async function initHeartbeat() {
  try {
    const st = await (await fetch('/api/status')).json();
    if (!st.appMode) return;
    const beat = () => fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});
    setInterval(beat, 4000); beat();
    window.addEventListener('pagehide', () => { try { navigator.sendBeacon('/api/bye'); } catch {} });
  } catch { /* server weg */ }
}
initHeartbeat();

buildPitch();
applyLang();
document.body.classList.toggle('hide-capa', state.hideCapa);
$('sl-count').textContent = state.shortlist.size;
loadDump().then(() => poll());
