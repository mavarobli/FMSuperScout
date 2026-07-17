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
  myTeam: 'all',   // teamchip bij "Mijn club": all | first | res | youth
  hideCapa: localStorage.getItem('fmss_hidecapa') === '1',
  role: localStorage.getItem('fmss_role') || '',
  compare: [],
  refYear: new Date().getFullYear(),
  refDoy: 183,
  shortlist: new Set(JSON.parse(localStorage.getItem('fmss_shortlist') || '[]')),
  colCfg: JSON.parse(localStorage.getItem('fmss_cols') || '{}'),  // per modus: {order:[], hidden:[]}
  colW: JSON.parse(localStorage.getItem('fmss_colw') || '{}'),    // per modus: {kolomkey: breedte px}
  advF: (() => { try { return JSON.parse(localStorage.getItem('fmss_adv') || '[]'); } catch { return []; } })(),  // attribuutfilter-regels [{k,min,max}]
};
const GBP_TO_EUR = 1.16;
// App-versie: bij een release gelijk trekken met MyAppVersion in installer/FMSuperScout.iss.
const APP_VERSION = '1.1.0';
const REPO_URL = 'https://github.com/mavarobli/FMSuperScout';

// ================= i18n =================
const I18N = {
  nl: {
    players: 'Spelers', staff: 'Staf', shortlist: 'Shortlist', searchph: 'Zoek naam of club',
    settings: 'Instellingen', langLabel: 'Taal', curLabel: 'Valuta',
    showHidden: 'Verborgen stats tonen',
    donateBtn: 'Steun FMSuperScout', donateTitle: 'Lekker aan het scouten?',
    donateBody: 'FMSuperScout is gratis en blijft gratis. Als het je een uur turen in traag menu bespaart, is een koffie welkom. Zo niet, draait ie ook gewoon door.',
    donateTitle2: '500 profielen gescout', donateBody2: 'Als FMSuperScout een scout was, had ie nu een contractverlenging verdiend. Een koffie mag ook. Blijft verder gewoon gratis.',
    donateTitle3: '2000 profielen. Respect.', donateBody3: 'Dit is de laatste keer dat we het vragen, beloofd. Bevalt de tool? Een koffie houdt de ontwikkeling warm.',
    donateCta: '☕ Koffie', donateLater: 'Later',
    position: 'Positie', clear: 'wis', staffrole: 'Staf-rol', quality: 'Kwaliteit & leeftijd',
    age: 'Leeftijd', financial: 'Financieel', maxvalue: 'Max. waarde', maxfee: 'Max. vraagprijs', maxwage: 'Max. loon p/w',
    origin: 'Herkomst', originComp: 'Herkomst & competitie', nat: 'Nationaliteit', euonly: 'Alleen EU/EEA', availability: 'Beschikbaarheid',
    interestmin: 'Interesse ≥', all: 'Alle', attainable: 'Beschikbaar', listed: 'Op transferlijst',
    attainHint: 'Kan hij weg bij zijn club? Op de transferlijst, aangeboden, clubloos of contract loopt binnen 12 maanden af (en niet "niet te koop"). Zegt niets over of hij naar JOU wil; dat is Interesse.',
    exp6: '< 6 mnd', exp12: '< 1 jaar', free: 'Clubloos', myclub: 'Mijn club', contractF: 'Contract',
    advBtn: 'Attribuutfilter', advTitle: 'Filter op attributen', advSearch: 'Kies of typ een attribuut…',
    advAdd: '+ attribuut', advClear: 'Wissen', advDone: 'Klaar', advMin: 'min', advMax: 'max', advColAttr: 'Attribuut',
    reportBug: 'Probleem melden…', esReportHint: 'F9 gedrukt maar geen data?', updateAvail: 'Update {v} beschikbaar',
    onlyshortlist: 'Alleen shortlist', clearfilters: 'Filters wissen', fetch: 'Nieuwe data',
    nodata: 'Nog geen data geladen', exportcsv: 'Shortlist exporteren (CSV)',
    results: 'resultaten', c_name: 'Naam', c_age: 'Lft', c_pos: 'Positie', c_club: 'Club', c_nat: 'Nat',
    c_value: 'Waarde', c_fee: 'Vraagprijs', c_wage: 'Salaris p/w', c_expires: 'Contract tot', c_interest: 'Interesse',
    c_status: 'Status', c_role: 'Rol', foot: 'Voet', footR: 'Rechts', footL: 'Links', footB: 'Beide', height: 'Lengte', repLabel: 'Reputatie',
    c_clubrep: 'Clubrep.', c_worldrep: 'Wereldrep.', c_div: 'Divisie',
    estval: 'Gesch. waarde', wageLabel: 'Salaris', contractLabel: 'Contract tot', free_l: 'transfervrij',
    int_big: 'Groot', int_ok: 'Redelijk', int_small: 'Klein', int_no: 'Nee', interestTitle: 'Interesse-inschatting',
    minorNote: 'Te jong voor een transfer.', minorIntlNote: 'Als niet-EU-minderjarige pas vanaf 18 haalbaar (FIFA-regel voor internationale transfers).',
    ambition: 'Ambitie', loyalty: 'Loyaliteit', professionalism: 'Professionaliteit', adaptability: 'Aanpassing',
    pressure: 'Druk', sportsmanship: 'Sportiviteit', temperament: 'Temperament', controversy: 'Controverse', determination: 'Vastberadenheid',
    personaTitle: 'Persoonlijkheid',
    hiddenTitle: 'Verborgen kenmerken', a_Consistency: 'Constantheid', a_ImportantMatches: 'Grote wedstrijden',
    a_InjuryProneness: 'Blessuregevoeligheid', a_Versatility: 'Veelzijdigheid', a_Dirtiness: 'Vals spel',
    showPot: 'Toon geschatte potentie', potNote: 'geschatte waarden op potentieel (PA)',
    loanOut: 'verhuurd aan {c}', loanIn: 'gehuurd van {c}',
    clubless: 'clubloos', clubUnknown: 'onbekende club', copied: 'Gekopieerd',
    reqSent: 'Spelersdata inlezen…',
    dumping: 'Spelersdata inlezen…', dumpReady: 'Nieuwe data klaar, klik om te laden',
    dumpLoaded: 'Nieuwe data geladen',
    dumpError: 'Uitlezen mislukt', fmNotRunning: 'Start eerst Football Manager 26 en laad je save.',
    tag_free: 'clubloos', tag_listed: 'transferlijst', tag_rel: 'vrijgegeven', tag_nfs: 'niet te koop',
    colHint: 'Sleep om te verplaatsen · rechtsklik voor kolommen', colsTitle: 'Kolommen tonen', colsReset: 'Standaard herstellen',
    g_technical: 'Technisch', g_setpieces: 'Standaardsituaties', g_mental: 'Mentaal', g_physical: 'Fysiek', g_goalkeeping: 'Keepen',
    staffAttrs: 'Staf-attributen',
    clearAll: 'alles wissen', chipSearch: 'Zoek',
    loading: 'Data laden…',
    parsing: 'Data verwerken…',
    step1: 'Start <b>FM26</b> en laad je save',
    step2: 'Druk in de game op <kbd>F9</kbd>, of klik hier op <b>Nieuwe data</b>',
    step3: 'De data laadt vanzelf zodra de dump klaar is',
    playersWord: 'spelers', staffWord: 'staf', clickClubFilter: 'Klik = filter op jouw club', repWord: 'reputatie',
    roleFit: 'Tactische rol', roleColHdr: 'Rol', roleAny: 'Geen rol gekozen', bestRoles: 'Beste rollen',
    compare: 'Vergelijk', comparing: 'Vergelijken', addCompare: 'Vergelijk', compareFull: 'Max. 3 spelers',
    cmpTitle: 'Spelervergelijking', cmpValue: 'Waarde', cmpTopRole: 'Beste rol',
    cmpWinsBadge: '{n}× beste attribuut', avgLabel: 'Gemiddeld',
    mt_all: 'Alles', mt_first: '1e elftal', mt_res: '2e elftal', mt_youth: 'Jeugd',
    cmpDeltaHint: 'Verschil: speler 1 min speler 2 (groen = speler 1 beter af)',
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
    competition: 'Competitie', divLabel: 'Divisie', divSearch: 'Typ een competitie…',
    gameDateMemory: 'Datum in de game (uit het geheugen)', gameDateDerived: 'Geschatte in-game datum (jaar zeker, dag benaderd)',
    presetsTitle: 'Opgeslagen filters', presetSave: 'Huidige filters opslaan', presetNamePrompt: 'Naam voor deze zoekopdracht',
    presetSaved: 'Filter opgeslagen', presetNone: 'Nog geen opgeslagen filters.', presetPick: 'Kies opgeslagen filter…',
    presetDelConfirm: 'Weet je zeker dat je "{name}" wilt verwijderen?',
    presetEmptyFilters: 'Geen actieve filters om op te slaan',
    presetSaveTitle: 'Filters opslaan', presetDelTitle: 'Filter verwijderen',
    saveBtn: 'Opslaan', deleteBtn: 'Verwijderen', cancelBtn: 'Annuleren',
    c_meta: 'Meta', metaLabel: 'Meta-score',
    metaHint: 'Meta-score (1-20): gewogen gemiddelde van de attributen die volgens FM-Arena\'s match-engine-tests wedstrijden winnen. Snelheid en Versnelling tellen veruit het zwaarst, daarna Sprongkracht en Dribbelen.\n\n15+ elite, 13-15 sterk, 11-13 degelijk.\n\nTwee spelers met gelijke CA? Die met de hoogste Meta presteert meestal beter op het veld. Positie en rol tellen niet mee; keepers krijgen geen score.',
    verWarn: 'FM-versie {v} gedetecteerd; de uitlezing is geijkt op {s}.x — data mogelijk onbetrouwbaar tot een update van FMSuperScout.',
  },
  en: {
    players: 'Players', staff: 'Staff', shortlist: 'Shortlist', searchph: 'Search name or club',
    settings: 'Settings', langLabel: 'Language', curLabel: 'Currency',
    showHidden: 'Show hidden stats',
    donateBtn: 'Support FMSuperScout', donateTitle: 'Found your next signing?',
    donateBody: 'FMSuperScout is free and stays free. If it beat squinting at slow menus, a coffee helps. If not, it keeps working anyway.',
    donateTitle2: 'That is 500 profiles scouted', donateBody2: 'If FMSuperScout were a scout, it would have earned a contract extension by now. A coffee works too. Free either way.',
    donateTitle3: '2000 profiles. Respect.', donateBody3: 'Last time we ask, promise. If the tool earns its place in your saves, a coffee keeps development going.',
    donateCta: '☕ Buy me a coffee', donateLater: 'Maybe later',
    position: 'Position', clear: 'clear', staffrole: 'Staff role', quality: 'Quality & age',
    age: 'Age', financial: 'Financial', maxvalue: 'Max. value', maxfee: 'Max. asking price', maxwage: 'Max. wage p/w',
    origin: 'Origin', originComp: 'Origin & competition', nat: 'Nationality', euonly: 'EU/EEA only', availability: 'Availability',
    interestmin: 'Interest ≥', all: 'All', attainable: 'Available', listed: 'Transfer listed',
    attainHint: 'Can he leave his club? Transfer listed, offered out, a free agent, or contract ends within 12 months (and not "not for sale"). Says nothing about whether he wants to join YOU; that is Interest.',
    exp6: '< 6 mo', exp12: '< 1 yr', free: 'Free agent', myclub: 'My club', contractF: 'Contract',
    advBtn: 'Attribute filter', advTitle: 'Filter on attributes', advSearch: 'Pick or type an attribute…',
    advAdd: '+ attribute', advClear: 'Clear', advDone: 'Done', advMin: 'min', advMax: 'max', advColAttr: 'Attribute',
    reportBug: 'Report a problem…', esReportHint: 'Pressed F9 but no data?', updateAvail: 'Update {v} available',
    onlyshortlist: 'Shortlist only', clearfilters: 'Clear filters', fetch: 'New data',
    nodata: 'No data loaded yet', exportcsv: 'Export shortlist (CSV)',
    results: 'results', c_name: 'Name', c_age: 'Age', c_pos: 'Position', c_club: 'Club', c_nat: 'Nat',
    c_value: 'Value', c_fee: 'Asking price', c_wage: 'Wage p/w', c_expires: 'Contract until', c_interest: 'Interest',
    c_status: 'Status', c_role: 'Role', foot: 'Foot', footR: 'Right', footL: 'Left', footB: 'Both', height: 'Height', repLabel: 'Reputation',
    c_clubrep: 'Club rep', c_worldrep: 'World rep', c_div: 'Division',
    estval: 'Est. value', wageLabel: 'Wage', contractLabel: 'Contract until', free_l: 'free',
    int_big: 'High', int_ok: 'Fair', int_small: 'Low', int_no: 'No', interestTitle: 'Interest estimate',
    minorNote: 'Too young for a transfer.', minorIntlNote: 'As a non-EU minor, only feasible from age 18 (FIFA rule on international transfers).',
    ambition: 'Ambition', loyalty: 'Loyalty', professionalism: 'Professionalism', adaptability: 'Adaptability',
    pressure: 'Pressure', sportsmanship: 'Sportsmanship', temperament: 'Temperament', controversy: 'Controversy', determination: 'Determination',
    personaTitle: 'Personality',
    hiddenTitle: 'Hidden', a_Consistency: 'Consistency', a_ImportantMatches: 'Big matches',
    a_InjuryProneness: 'Injury proneness', a_Versatility: 'Versatility', a_Dirtiness: 'Dirtiness',
    showPot: 'Show estimated potential', potNote: 'estimated values at potential (PA)',
    loanOut: 'on loan at {c}', loanIn: 'on loan from {c}',
    clubless: 'free agent', clubUnknown: 'unknown club', copied: 'Copied',
    reqSent: 'Reading player data…',
    dumping: 'Reading player data…', dumpReady: 'New data ready, click to load',
    dumpLoaded: 'New data loaded',
    dumpError: 'Read failed', fmNotRunning: 'Start Football Manager 26 and load your save first.',
    tag_free: 'free', tag_listed: 'listed', tag_rel: 'released', tag_nfs: 'not for sale',
    colHint: 'Drag to reorder · right-click for columns', colsTitle: 'Show columns', colsReset: 'Reset to default',
    g_technical: 'Technical', g_setpieces: 'Set Pieces', g_mental: 'Mental', g_physical: 'Physical', g_goalkeeping: 'Goalkeeping',
    staffAttrs: 'Staff attributes',
    clearAll: 'clear all', chipSearch: 'Search',
    loading: 'Loading data…',
    parsing: 'Processing data…',
    step1: 'Start <b>FM26</b> and load your save',
    step2: 'Press <kbd>F9</kbd> in-game, or click <b>New data</b> here',
    step3: 'The data loads automatically once the dump is ready',
    playersWord: 'players', staffWord: 'staff', clickClubFilter: 'Click = filter on your club', repWord: 'reputation',
    roleFit: 'Tactical role', roleColHdr: 'Role', roleAny: 'No role selected', bestRoles: 'Best roles',
    compare: 'Compare', comparing: 'Comparing', addCompare: 'Compare', compareFull: 'Max. 3 players',
    cmpTitle: 'Player comparison', cmpValue: 'Value', cmpTopRole: 'Best role',
    cmpWinsBadge: '{n}× best attribute', avgLabel: 'Average',
    mt_all: 'All', mt_first: 'First team', mt_res: 'Reserves', mt_youth: 'Youth',
    cmpDeltaHint: 'Difference: player 1 minus player 2 (green = player 1 better off)',
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
    competition: 'Competition', divLabel: 'Division', divSearch: 'Type a competition…',
    gameDateMemory: 'In-game date (read from memory)', gameDateDerived: 'Estimated in-game date (year certain, day approximate)',
    presetsTitle: 'Saved filters', presetSave: 'Save current filters', presetNamePrompt: 'Name for this search',
    presetSaved: 'Filter saved', presetNone: 'No saved filters yet.', presetPick: 'Pick a saved filter…',
    presetDelConfirm: 'Are you sure you want to delete "{name}"?',
    presetEmptyFilters: 'No active filters to save',
    presetSaveTitle: 'Save filters', presetDelTitle: 'Delete filter',
    saveBtn: 'Save', deleteBtn: 'Delete', cancelBtn: 'Cancel',
    c_meta: 'Meta', metaLabel: 'Meta score',
    metaHint: 'Meta score (1-20): a weighted average of the attributes that win matches according to FM-Arena\'s match-engine tests. Pace and Acceleration count heaviest by far, then Jumping Reach and Dribbling.\n\n15+ elite, 13-15 strong, 11-13 decent.\n\nTwo players with equal CA? The one with the higher Meta score usually performs better on the pitch. Position and role are ignored; goalkeepers get no score.',
    verWarn: 'FM version {v} detected; memory reading is calibrated for {s}.x — data may be unreliable until FMSuperScout is updated.',
  },
};
const t = k => (I18N[state.lang][k] ?? I18N.nl[k] ?? k);

// ================= SVG-iconen =================
// Eén stijl (stroke, currentColor) die aansluit bij de bestaande UI-iconen; geen emoji.
// Uitzondering: het koffie-icoon (☕) blijft bewust een emoji.
const ICON_PATHS = {
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
  warning: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  compare: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
};
const icon = (name, size = 14) =>
  `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
// Shortlist-ster: vulling stuurt CSS aan via .on op de omliggende cel/knop.
const starSvg = (size = 15) =>
  `<svg class="ic star-ic" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96z"/></svg>`;
// Banner/waarschuwing: icoon + veilig ge-escapete tekst (tekst kan data uit de dump bevatten).
const bannerMsg = (ico, txt) => icon(ico, 13) + ' ' + escHtml(txt);
// Banner met echte voortgangsbalk (frac 0..1): plugin-scanvoortgang of download-voortgang.
const bannerProgress = (ico, txt, frac) => {
  const pct = Math.max(0, Math.min(100, Math.round(frac * 100)));
  return `${bannerMsg(ico, txt)} <span class="pbar"><span class="pfill" style="width:${pct}%"></span></span> <span class="ppct">${pct}%</span>`;
};

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
// FM sorteert attributen binnen een groep alfabetisch in de taal van de game; wij dus ook,
// op de vertaalde naam. Gebruikt door profiel, vergelijking en het attribuutfilter.
const sortByLabel = keys => [...keys].sort((a, b) => attrName(a).localeCompare(attrName(b), state.lang));

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

// Voet: de plugin schrijft NL ('Rechts'/'Links'/'Beide') in de dump → vertalen bij tonen.
const FOOT_KEY = { rechts: 'footR', links: 'footL', beide: 'footB', right: 'footR', left: 'footL', both: 'footB' };
const footLabel = p => { const k = FOOT_KEY[(p.foot || '').toLowerCase()]; return k ? t(k) : (p.foot || '–'); };

// Landnamen komen in de gametaal uit het geheugen (NL bij een Nederlandse FM).
// Bij app-taal EN vertalen we de bekende NL-namen; onbekend blijft zoals de game het gaf.
// Alleen namen die NL/EN verschillen; identieke (Portugal, Ghana...) hoeven niet.
const NATION_EN = {
  'Nederland': 'Netherlands', 'België': 'Belgium', 'Duitsland': 'Germany', 'Frankrijk': 'France',
  'Spanje': 'Spain', 'Italië': 'Italy', 'Engeland': 'England', 'Schotland': 'Scotland',
  'Wales': 'Wales', 'Noord-Ierland': 'Northern Ireland', 'Ierland': 'Ireland',
  'Oostenrijk': 'Austria', 'Zwitserland': 'Switzerland', 'Polen': 'Poland', 'Zweden': 'Sweden',
  'Noorwegen': 'Norway', 'Denemarken': 'Denmark', 'Finland': 'Finland', 'IJsland': 'Iceland',
  'Tsjechië': 'Czechia', 'Slowakije': 'Slovakia', 'Hongarije': 'Hungary', 'Roemenië': 'Romania',
  'Bulgarije': 'Bulgaria', 'Griekenland': 'Greece', 'Kroatië': 'Croatia', 'Servië': 'Serbia',
  'Bosnië en Herzegovina': 'Bosnia and Herzegovina', 'Slovenië': 'Slovenia',
  'Noord-Macedonië': 'North Macedonia', 'Albanië': 'Albania', 'Montenegro': 'Montenegro',
  'Kosovo': 'Kosovo', 'Turkije': 'Turkey', 'Rusland': 'Russia', 'Oekraïne': 'Ukraine',
  'Wit-Rusland': 'Belarus', 'Litouwen': 'Lithuania', 'Letland': 'Latvia', 'Estland': 'Estonia',
  'Georgië': 'Georgia', 'Armenië': 'Armenia', 'Azerbeidzjan': 'Azerbaijan', 'Moldavië': 'Moldova',
  'Luxemburg': 'Luxembourg', 'Cyprus': 'Cyprus', 'Israël': 'Israel',
  'Brazilië': 'Brazil', 'Argentinië': 'Argentina', 'Uruguay': 'Uruguay', 'Chili': 'Chile',
  'Colombia': 'Colombia', 'Peru': 'Peru', 'Ecuador': 'Ecuador', 'Paraguay': 'Paraguay',
  'Bolivia': 'Bolivia', 'Venezuela': 'Venezuela',
  'Verenigde Staten': 'United States', 'Mexico': 'Mexico', 'Canada': 'Canada',
  'Costa Rica': 'Costa Rica', 'Jamaica': 'Jamaica', 'Honduras': 'Honduras', 'Panama': 'Panama',
  'Marokko': 'Morocco', 'Algerije': 'Algeria', 'Tunesië': 'Tunisia', 'Egypte': 'Egypt',
  'Senegal': 'Senegal', 'Ivoorkust': 'Ivory Coast', 'Nigeria': 'Nigeria', 'Kameroen': 'Cameroon',
  'Zuid-Afrika': 'South Africa', 'Kaapverdië': 'Cape Verde', 'Guinee': 'Guinea',
  'Congo-Kinshasa': 'DR Congo', 'Democratische Republiek Congo': 'DR Congo',
  'Japan': 'Japan', 'Zuid-Korea': 'South Korea', 'China': 'China', 'Australië': 'Australia',
  'Nieuw-Zeeland': 'New Zealand', 'Saoedi-Arabië': 'Saudi Arabia', 'Iran': 'Iran', 'Irak': 'Iraq',
  'Verenigde Arabische Emiraten': 'United Arab Emirates', 'Qatar': 'Qatar', 'Indonesië': 'Indonesia',
};
const natLabel = n => state.lang === 'en' ? (NATION_EN[n] || n) : n;
const natsLabel = p => (p.nat || []).map(natLabel).join(', ');

// Kolommen die onder de "verborgen stats"-toggle vallen: CA/PA zelf, plus meta-score en
// vraagprijs (beide afgeleid van/verweven met verborgen data, Marks keuze).
const hiddenStatCol = k => state.hideCapa && (k === 'ca' || k === 'pa' || k === 'meta' || k === 'fee');

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
// Dump levert ISO (yyyy-mm-dd); tonen als dd-mm-yyyy. CSV-export houdt bewust ISO
// (sorteert/parset beter in spreadsheets).
const fmtDate = v => {
  const s = v ? String(v) : '';
  return s.length >= 10 ? `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}` : (s || '–');
};

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

// w = standaard kolombreedte (px) voor de vaste tabel-lay-out; door de gebruiker
// gesleepte breedtes (colWidths) gaan vóór. Vast i.p.v. op inhoud, anders verspringen
// de kolommen bij elke sortering/scroll (de zichtbare rijen bepalen dan de breedte).
const PLAYER_COLS = [
  { key: 'sl', label: '★', star: true, w: 34 },
  { key: 'name', label: 'c_name', get: p => p.name, name: true, w: 180 },
  { key: 'age', label: 'c_age', num: true, get: p => getAge(p), w: 50 },
  { key: 'pos', label: 'c_pos', get: p => posRank(p), render: p => p.pos || '<span class="dim">–</span>', w: 95 },
  { key: 'club', label: 'c_club', get: p => p.club || '', render: p => clubLabel(p), w: 175 },
  { key: 'div', label: 'c_div', get: p => p.div || '', render: p => p.div ? escHtml(p.div) : '<span class="dim">–</span>', defHidden: true, w: 170 },
  { key: 'nat', label: 'c_nat', get: p => natsLabel(p), w: 115 },
  { key: 'eu', label: 'EU', get: p => isEu(p) ? 1 : 0, render: p => isEu(p) ? `<span class="eu-yes">${icon('check', 12)}</span>` : '<span class="dim">–</span>', w: 42 },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca), w: 56 },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa), w: 56 },
  { key: 'meta', label: 'c_meta', num: true, help: 'metaHint', get: p => metaScore(p), render: p => metaHtml(p), w: 64 },
  { key: 'value', label: 'c_value', num: true, get: p => estValue(p).v, render: p => estHtml(p), w: 95 },
  { key: 'fee', label: 'c_fee', num: true, get: p => { const f = feeEstimate(p); return f.v == null ? -1 : f.v; }, render: p => feeHtml(p), w: 105 },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtMoney, w: 100 },
  { key: 'expires', label: 'c_expires', get: p => p.expires, fmt: fmtDate, tdCls: p => expiresHtml(p).cls, w: 110 },
  { key: 'interest', label: 'c_interest', get: p => { const i = interestEstimate(p); return i ? i.score : -1; }, render: p => intHtml(p), w: 90 },
  { key: 'status', label: 'c_status', get: p => 0, render: p => statusHtml(p), w: 110 },
  // Standaard verboren extra kolommen (via rechtsklik aan te zetten, sorteerbaar):
  { key: 'clubRep', label: 'c_clubrep', num: true, get: p => p.clubRep || 0, defHidden: true, w: 85 },
  { key: 'worldRep', label: 'c_worldrep', num: true, get: p => p.worldRep || 0, defHidden: true, w: 85 },
  { key: 'height', label: 'height', num: true, get: p => p.height, fmt: v => v ? v + ' cm' : '–', defHidden: true, w: 70 },
  { key: 'foot', label: 'foot', get: p => footLabel(p), defHidden: true, w: 75 },
];
const STAFF_COLS = [
  { key: 'sl', label: '★', star: true, w: 34 },
  { key: 'name', label: 'c_name', get: p => p.name, name: true, w: 180 },
  { key: 'age', label: 'c_age', num: true, get: p => getAge(p), w: 50 },
  { key: 'job', label: 'c_role', get: p => p.job || '–', w: 150 },
  { key: 'club', label: 'c_club', get: p => p.club || '', render: p => clubLabel(p), w: 175 },
  { key: 'nat', label: 'c_nat', get: p => natsLabel(p), w: 115 },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca), w: 56 },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa), w: 56 },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtMoney, w: 100 },
  { key: 'expires', label: 'c_expires', get: p => p.expires, fmt: fmtDate, tdCls: p => expiresHtml(p).cls, w: 110 },
  { key: 'clubRep', label: 'c_clubrep', num: true, get: p => p.clubRep || 0, defHidden: true, w: 85 },
  { key: 'worldRep', label: 'c_worldrep', num: true, get: p => p.worldRep || 0, defHidden: true, w: 85 },
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
  // Transfervrij: streepje met tooltip (de status-pill "clubloos" vertelt het al).
  return `<span class="dim" title="${t('clubless')}">–</span>`;
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
  // Transfervrij: gewoon een streepje (de status-kolom/pill vertelt het verhaal al).
  if (e.v === 0) return `<span class="dim" title="${t('free_l')}">–</span>`;
  return (e.est ? '<span class="dim">~</span>' : '') + fmtMoney(e.v);
}

// ---------- geschatte vraagprijs / transfersom ----------
// Doel: wat betaal IK (mijn club) waarschijnlijk voor deze speler. Verkoopbereidheid domineert:
// een gelist(t)e of vrijgegeven speler gaat rond of onder de waarde weg, ongeacht contractduur —
// de contractpremie geldt alleen voor spelers die de club wil houden. Daarbovenop: een
// koper-afhankelijke opslag (verkopers vragen meer aan een grotere club, FM's "big club tax")
// en een squad-status-proxy via de loonrang binnen de verkopende club.
// Niet te vangen uit de data: exacte squad-status, concurrerende clubs, jouw budget — dus schatting.

// Loonrang binnen de verkopende club als proxy voor squad-status: de topverdiener is
// waarschijnlijk een sterspeler (club vraagt meer), een laagbetaalde randspeler is
// makkelijker op te halen. Cache per dump (state._clubWages).
function wageRankInClub(p) {
  if (!p.club || !(p.wage > 0)) return null;
  if (!state._clubWages) {
    const map = new Map();
    for (const q of state.players) {
      if (!q.club || !(q.wage > 0)) continue;
      const k = q.club.toLowerCase();
      let arr = map.get(k);
      if (!arr) map.set(k, arr = []);
      arr.push(q.wage);
    }
    for (const arr of map.values()) arr.sort((a, b) => b - a);
    state._clubWages = map;
  }
  const arr = state._clubWages.get(p.club.toLowerCase());
  if (!arr || arr.length < 8) return null;   // te weinig spelers van deze club in de dump
  return { rank: arr.findIndex(w => w <= p.wage) + 1, n: arr.length };
}

function feeMultiplier(p) {
  const m = monthsUntil(p.expires);
  const mm = m == null ? 30 : m;

  // Club wil van de speler af → vraagprijs rond of onder de waarde, contractpremie vervalt.
  if (p.setForRelease) return 0.2;                                     // vrijwel weggeefprijs
  // Gelijste speler: het waardeveld ÍS de door de club gezette vraagprijs
  // (ijking 14-07: 4/4 exact binnen ±1%) — dus geen op- of afslag.
  if (p.listed) return 1.0;

  // IJking 14-07 (55 spelers, Telstar t/m Mbappé, tools/value-calib.js): FM's getoonde
  // transferwaarde-bandbreedte omsluit ons waardeveld vrijwel altijd binnen ~±15%, en
  // kopen blijkt rond die band te kunnen. v1 stapelde premies tot ×2,4 — veel te hoog.
  // De signalen blijven, maar gematigd; échte "betaald vs. waarde"-datapoints van mavarobli
  // kunnen dit verder aanscherpen.
  let f = Math.min(1.35, Math.max(0.6, 0.7 + 0.014 * mm));
  if (p.notForSale) f *= 1.5;                               // niet te koop: alleen los te weken met een fors bod

  const a = getAge(p) || 25;
  const head = Math.max(0, (p.pa || p.ca) - p.ca);
  if (a <= 21 && head >= 15) f *= 1 + Math.min(0.2, head * 0.007);    // wonderkind-premie (gematigd)
  else if (a <= 23) f *= 1.05;
  else if (a >= 31) f *= 0.8;
  else if (a >= 29) f *= 0.9;

  const r = wageRankInClub(p);
  if (r) {
    if (r.rank <= 2) f *= 1.12;                             // topverdiener: waarschijnlijk sterspeler
    else if (r.rank <= 5) f *= 1.05;
    else if (r.rank / r.n > 0.6) f *= 0.92;                 // randspeler: makkelijker op te halen
  }

  // Koper-afhankelijk: verkopers vragen meer aan een grotere/rijkere club ("big club tax")
  // en nemen genoegen met minder van een kleinere club.
  const myRep = state.meta.myClubRep || 0;
  if (myRep && p.clubRep > 0) {
    const gap = myRep - p.clubRep;
    f *= Math.min(1.2, Math.max(0.88, 1 + gap / 15000));
  }

  return Math.min(p.notForSale ? 2.2 : 1.7, Math.max(0.4, f));
}
function feeEstimate(p) {
  const ev = estValue(p);
  if (ev.v == null) return { v: null };
  if (ev.v === 0) return { v: 0 };
  // Gelijst met echte waarde: exacte clubvraagprijs, niet afronden.
  if (p.listed && !ev.est) return { v: ev.v, valueEst: false };
  let v = ev.v * feeMultiplier(p);
  v = v >= 1e6 ? Math.round(v / 1e5) * 1e5 : Math.round(v / 1e4) * 1e4;
  return { v, valueEst: ev.est };   // valueEst: onderliggende waarde was zelf al een schatting
}
function feeHtml(p) {
  const f = feeEstimate(p);
  if (f.v == null) return '<span class="dim">–</span>';
  if (f.v === 0) return `<span class="dim" title="${t('free_l')}">–</span>`;
  // Gelijst met echte waarde = exacte, door de club gezette vraagprijs → geen "~".
  const exact = p.listed && !f.valueEst;
  return (exact ? '' : '<span class="dim">~</span>') + fmtMoney(f.v);
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
  const known = age != null && age > 0;   // geboortejaar kan ontbreken → leeftijd onbekend, niet "0 jaar"
  const eu = isEu(p);
  const clubGap = myRep - (p.clubRep || 0);
  const statGap = myRep - (p.worldRep || 0);
  const blend = known && age <= 19 ? (0.9 * clubGap + 0.15 * statGap) : (0.55 * clubGap + 0.45 * statGap);
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
  if (known && age <= 16) score *= 0.7;
  else if (known && age <= 17) score *= 0.85;

  // FIFA Art. 19: non-EU-speler onder de 18 kan internationaal pas komen vanaf z'n 18e.
  // Bij onbekende leeftijd géén minderjarigen-cap: dan zou een speler zonder geboortejaar
  // onterecht als "te jong" worden weggezet.
  let note = null;
  if (known && age <= 15) { score = Math.min(score, 6); note = 'minor'; }
  else if (known && age <= 17 && !eu) { score = Math.min(score, 8); note = 'minorIntl'; }

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

// ---------- geavanceerd attribuutfilter ----------
// Regels [{k, min, max}] over zichtbare attributen, verborgen kenmerken en persoonlijkheid,
// EN-gecombineerd. Persoonlijkheid leeft op het speler-object zelf, de rest in p.attrs.
// Regels op verborgen data doen niet mee zolang "verborgen stats" uit staat.
const ADV_HIDDEN_KEYS = ['Consistency', 'ImportantMatches', 'Versatility', 'InjuryProneness', 'Dirtiness'];
const ADV_PERS_KEYS = ['ambition', 'professionalism', 'loyalty', 'pressure', 'temperament', 'sportsmanship', 'adaptability', 'controversy'];
const advIsHidden = k => ADV_HIDDEN_KEYS.includes(k) || ADV_PERS_KEYS.includes(k);
const advLabel = k => ADV_PERS_KEYS.includes(k) ? t(k) : ADV_HIDDEN_KEYS.includes(k) ? t('a_' + k) : attrName(k);
const advValue = (p, k) => ADV_PERS_KEYS.includes(k) ? (p[k] || null) : (p.attrs ? p.attrs[k] : null);
const activeAdvRules = () => state.advF.filter(r => r.k && (r.min || r.max) && !(state.hideCapa && advIsHidden(r.k)));
const advChipTxt = r => `${advLabel(r.k)} ${r.min && r.max ? r.min + '–' + r.max : r.min ? '≥ ' + r.min : '≤ ' + r.max}`;
function saveAdv() { localStorage.setItem('fmss_adv', JSON.stringify(state.advF)); updateAdvBtn(); }
// Alleen een teller op de knop; de regels zelf staan al in de chips boven de tabel
// en in de popup, een derde lijst in de zijbalk was dubbelop.
function updateAdvBtn() {
  const n = activeAdvRules().length;
  const b = $('btn-adv');
  b.textContent = t('advBtn') + (n ? ` (${n})` : '') + '…';
  b.classList.toggle('has-rules', n > 0);
}
function advDialog() {
  const m = $('adv-modal');
  // Doorzoekbare attributencatalogus: veld-, keeper- (alleen GK-specifiek, gedeelde
  // staan al onder Technisch), verborgen en persoonlijkheidsattributen.
  const gkOnly = ATTR_GROUPS_GK[0][1].filter(k => !ATTR_GROUPS_OUTFIELD.some(([, ks]) => ks.includes(k)));
  const catalog = [];
  for (const [g, keys] of [...ATTR_GROUPS_OUTFIELD, ['g_goalkeeping', gkOnly]])
    for (const k of sortByLabel(keys)) catalog.push({ k, label: attrName(k), group: t(g) });
  if (!state.hideCapa) {
    const byT = (a, b) => a.localeCompare(b, state.lang);
    for (const k of [...ADV_HIDDEN_KEYS].sort((a, b) => byT(t('a_' + a), t('a_' + b)))) catalog.push({ k, label: t('a_' + k), group: t('hiddenTitle') });
    for (const k of [...ADV_PERS_KEYS].sort((a, b) => byT(t(a), t(b)))) catalog.push({ k, label: t(k), group: t('personaTitle') });
  }
  // Escape sluit eerst een open attributen-dropdown, daarna pas de popup zelf.
  const esc = e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    const dd = m.querySelector('.adv-dd:not(.hidden)');
    if (dd) dd.classList.add('hidden'); else close();
  };
  const close = () => {
    state.advF = state.advF.filter(r => r.k);   // lege (nog niet gekozen) rijen opruimen
    saveAdv();
    m.classList.add('hidden');
    document.removeEventListener('keydown', esc, true);
  };
  const render = () => {
    m.innerHTML = `<div class="pm-card adv-card">
      <div class="pm-title">${t('advTitle')}</div>
      <div class="adv-head"><span class="ah-attr">${t('advColAttr')}</span><span class="ah-mm">${t('advMin')}</span><span class="ah-mm">${t('advMax')}</span><span class="ah-sp"></span></div>
      <div id="adv-rows">` + state.advF.map((r, i) => `
        <div class="adv-row" data-i="${i}">
          <div class="adv-kwrap">
            <input type="text" class="adv-kin" value="${r.k ? escHtml(advLabel(r.k)) : ''}" placeholder="${t('advSearch')}" autocomplete="off">
            <div class="adv-dd hidden"></div>
          </div>
          <input type="number" class="adv-min" min="1" max="20" placeholder="${t('advMin')}" value="${r.min || ''}">
          <input type="number" class="adv-max" min="1" max="20" placeholder="${t('advMax')}" value="${r.max || ''}">
          <button class="adv-x" title="${t('clear')}">${icon('x', 12)}</button>
        </div>`).join('') + `</div>
      <button class="adv-add">${t('advAdd')}</button>
      <div class="pm-actions">
        <button class="pm-cancel">${t('advClear')}</button>
        <button class="pm-ok">${t('advDone')}</button>
      </div>
    </div>`;
    m.querySelectorAll('.adv-row').forEach(row => {
      const r = state.advF[+row.dataset.i];
      const kin = row.querySelector('.adv-kin'), dd = row.querySelector('.adv-dd');
      // Combobox: klikken opent de volledige (gegroepeerde) lijst, typen filtert hem.
      const buildDd = termRaw => {
        const term = (termRaw || '').trim().toLowerCase();
        const used = new Set(state.advF.filter(x => x !== r && x.k).map(x => x.k));
        const hits = catalog.filter(c => !used.has(c.k) && (!term || c.label.toLowerCase().includes(term)));
        if (term) hits.sort((a, b) => a.label.toLowerCase().indexOf(term) - b.label.toLowerCase().indexOf(term));
        let html = '', lastG = null;
        for (const c of hits) {
          if (!term && c.group !== lastG) { html += `<div class="asg-h">${c.group}</div>`; lastG = c.group; }
          html += `<div class="adv-sug-i" data-k="${c.k}"><span>${c.label}</span><span class="asg">${c.group}</span></div>`;
        }
        dd.innerHTML = html || `<div class="asg-h">–</div>`;
        // mousedown (niet click): vóór de blur van het invoerveld
        dd.querySelectorAll('.adv-sug-i').forEach(el => el.onmousedown = e => { e.preventDefault(); pick(el.dataset.k); });
      };
      const pick = k => {
        const fresh = !r.k;
        r.k = k; saveAdv(); applyFilters();
        kin.value = advLabel(k);
        dd.classList.add('hidden');
        if (fresh || (!r.min && !r.max)) row.querySelector('.adv-min').focus();
      };
      kin.onfocus = () => { buildDd(''); dd.classList.remove('hidden'); kin.select(); };
      kin.oninput = () => { buildDd(kin.value); dd.classList.remove('hidden'); };
      kin.onblur = () => setTimeout(() => { dd.classList.add('hidden'); kin.value = r.k ? advLabel(r.k) : ''; }, 120);
      kin.onkeydown = e => {
        if (e.key === 'Enter') { const f = dd.querySelector('.adv-sug-i'); if (f) pick(f.dataset.k); }
      };
      row.querySelector('.adv-min').oninput = e => { r.min = +e.target.value || 0; saveAdv(); applyFilters(); };
      row.querySelector('.adv-max').oninput = e => { r.max = +e.target.value || 0; saveAdv(); applyFilters(); };
      row.querySelector('.adv-x').onclick = () => { state.advF.splice(+row.dataset.i, 1); saveAdv(); applyFilters(); render(); };
    });
    m.querySelector('.adv-add').onclick = () => {
      state.advF.push({ k: '', min: 0, max: 0 });
      render();
      const kins = m.querySelectorAll('.adv-kin');
      const last = kins[kins.length - 1];
      last.focus(); last.onfocus();   // dropdown meteen open, ook als het focus-event niet vuurt
    };
    m.querySelector('.pm-cancel').onclick = () => { state.advF = []; saveAdv(); applyFilters(); render(); };
    m.querySelector('.pm-ok').onclick = close;
  };
  document.addEventListener('keydown', esc, true);
  m.onclick = e => { if (e.target === m) close(); };
  if (!state.advF.length) state.advF.push({ k: '', min: 0, max: 0 });
  render();
  m.classList.remove('hidden');   // eerst zichtbaar, anders pakt focus() niet
  const firstEmpty = [...m.querySelectorAll('.adv-row')].find(row => !state.advF[+row.dataset.i].k);
  if (firstEmpty) { const k = firstEmpty.querySelector('.adv-kin'); k.focus(); k.onfocus(); }
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

// ---------- meta-score (FM-Arena attribute testing) ----------
// Gewichten = de gemeten punten-impact per attribuut uit FM-Arena's attribute testing
// (fm-arena.com/table/26-player-attributes-testing): per attribuut werd het effect op de
// teamprestatie in de match engine gemeten. Snelheid/Versnelling domineren met afstand.
// De score (1-20-schaal, key = zwaarder) zegt dus "hoe meta is deze speler", los van rol of CA.
// Attributen zonder meetbaar positief effect tellen niet mee; keepers vallen buiten de test.
const META_W = {
  Pace: 20.5, Acceleration: 20.4, JumpingReach: 11.6, Dribbling: 9.8, Balance: 5.3,
  Concentration: 4.5, Anticipation: 4.3, Determination: 2.7, Agility: 2.7, Stamina: 2.5,
  Strength: 1.9, FirstTouch: 1.5, Composure: 1.2, WorkRate: 1.1, Finishing: 1.1, Flair: 1.1,
  LongShots: 1.0, Aggression: 1.0, Heading: 0.6, OffTheBall: 0.5,
};
function metaScore(p) {
  if (!p.attrs || (p.posArr || []).includes('GK')) return null;
  let sum = 0, w = 0;
  for (const k in META_W) {
    const v = p.attrs[k];
    if (v != null) { sum += v * META_W[k]; w += META_W[k]; }
  }
  return w ? sum / w : null;
}
function metaHtml(p) {
  const s = metaScore(p);
  return s == null ? '<span class="dim">·</span>' : `<span class="${roleClass(s)}" title="${t('metaLabel')}">${s.toFixed(1)}</span>`;
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
      return;
    }
    const b = $('banner');
    b.className = 'scanning'; b.innerHTML = bannerMsg('hourglass', t('loading')); b.onclick = null;
    // Streamend binnenhalen met echte voortgang (bytes ontvangen / Content-Length).
    const resp = await fetch('/api/dump');
    const total = Number(resp.headers.get('Content-Length')) || 0;
    let data;
    if (resp.body && total > 0) {
      const reader = resp.body.getReader();
      const chunks = []; let got = 0, lastUi = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        const now = performance.now();
        if (now - lastUi > 100) {   // UI hooguit 10×/s verversen
          lastUi = now;
          const mb = `${t('loading')} ${(got / 1048576).toFixed(0)} / ${(total / 1048576).toFixed(0)} MB`;
          b.innerHTML = bannerProgress('hourglass', mb, got / total);
        }
      }
      const buf = new Uint8Array(got); let o = 0;
      for (const c of chunks) { buf.set(c, o); o += c.length; }
      // JSON.parse blokkeert de UI even; eerst de banner laten schilderen.
      b.innerHTML = bannerMsg('hourglass', t('parsing'));
      await new Promise(r => setTimeout(r, 30));
      data = JSON.parse(new TextDecoder().decode(buf));
    } else {
      data = await resp.json();
    }
    b.className = 'hidden';
    state.players = data.players || [];
    state.staff = data.staff || [];
    state.meta = data.meta || {};
    state._wageCeil = undefined;   // loonplafond opnieuw berekenen voor deze dump
    state._clubWages = null;       // loonrang-cache (vraagprijs) opnieuw opbouwen
    // Peiljaar (voor leeftijdsberekening) automatisch uit de in-game datum; geen UI-veld meer.
    if (state.meta.gameDate) {
      const g = new Date(state.meta.gameDate);
      state.refYear = state.meta.gameYear || g.getFullYear();
      state.refDoy = Math.floor((g - new Date(g.getFullYear(), 0, 0)) / 864e5);
    } else if (state.meta.gameYear) {
      state.refYear = state.meta.gameYear;
    }
    state.dumpStamp = st.dumpTime;
    renderDumpInfo();
    renderClubBadge();
    renderVerWarn();
    renderMyTeamChips();
    $('empty-state').classList.add('hidden');
    buildStaffRoles();
    buildDivisions();   // divisiefilter vullen zodra er dump-data met divisies is
    applyFilters();
  } catch (e) { $('dump-info').textContent = 'fout'; console.error(e); }
}
function renderDumpInfo() {
  const gd = $('game-date');
  if (!state.dumpStamp) { $('dump-info').textContent = ''; if (gd) gd.textContent = ''; return; }
  const when = new Date(state.dumpStamp);
  const n = state.players.length.toLocaleString();
  $('dump-info').textContent = n;
  $('dump-info').title = `${state.players.length.toLocaleString()} ${t('playersWord')} · ${state.staff.length.toLocaleString()} ${t('staffWord')}\n${when.toLocaleString()}`;
  // In-game datum naast het spelersaantal. "memory" = exact uit het geheugen; "derived" =
  // afgeleid (jaar zeker, dag benaderd) → tilde + tooltip zodat het verschil duidelijk is.
  if (gd) {
    const ds = state.meta.gameDate;
    if (!ds) { gd.innerHTML = ''; gd.title = ''; }
    else {
      const derived = state.meta.gameDateSource !== 'memory';
      const d = new Date(ds);
      const txt = isNaN(d) ? ds : d.toLocaleDateString(state.lang === 'en' ? 'en-GB' : 'nl-NL',
        { day: 'numeric', month: 'short', year: 'numeric' });
      gd.innerHTML = icon('calendar', 12) + ' ' + escHtml((derived ? '~ ' : '') + txt);
      gd.title = derived ? t('gameDateDerived') : t('gameDateMemory');
    }
  }
}
// Waarschuwing als de dump uit een andere FM-versie komt dan waarop de offsets zijn gepind:
// de geheugen-uitlezing kan dan stilletjes verkeerde waarden geven.
function renderVerWarn() {
  const el = $('ver-warn');
  const m = state.meta;
  if (m.gameVersion && m.versionOk === false) {
    el.innerHTML = bannerMsg('warning', tf('verWarn', { v: m.gameVersion, s: m.supportedVersion || '26.3' }));
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
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
// Divisie-index met een sterkte-proxy: competitiereputatie dumpen we (nog) niet, maar de
// mediane clubreputatie van de spelers erin benadert het niveau goed → sterkere competities
// bovenaan in de suggesties. Ook een genormaliseerde naam (diacrieten/leestekens weg) voor
// typo-tolerant zoeken.
function buildDivisions() {
  const byDiv = new Map();
  for (const p of state.players) {
    if (!p.div) continue;
    (byDiv.get(p.div) || byDiv.set(p.div, []).get(p.div)).push(p.clubRep || 0);
  }
  // Sterkte-proxy = het 80e-percentiel van de clubreputaties (de top-clubs bepalen het
  // aanzien van een competitie beter dan de mediaan, die kleine landen met een paar sterke
  // clubs kunstmatig omhoog duwt).
  const p80 = a => { const s = a.filter(x => x > 0).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.8)] : 0; };
  // Eigen competitie(s): de divisie(s) waarin mijn club speelt → die wil je altijd bovenaan.
  const myClub = (state.meta.myClub || '').toLowerCase();
  state.myDivs = new Set(state.players.filter(p => (p.club || '').toLowerCase() === myClub && p.div).map(p => p.div));
  state.divIndex = [...byDiv.entries()]
    .map(([name, reps]) => ({ name, norm: normStr(name), strength: p80(reps), count: reps.length, mine: state.myDivs.has(name) }))
    .sort((a, b) => b.strength - a.strength || b.count - a.count);
  const wrap = $('fg-div');
  wrap.style.display = state.divIndex.length ? '' : 'none';
}
// Normaliseer voor zoeken: kleine letters, diacrieten weg, alleen letters/cijfers/spaties.
function normStr(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
// Levenshtein (met vroege afkap) voor typo-tolerantie op woordniveau.
function editDist(a, b, max) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > max) return max + 1;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let cur = [i], best = i;
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
      cur[j] = c; if (c < best) best = c;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[n];
}
// Score een divisie tegen de (genormaliseerde) query. Hoger = betere match; -1 = geen match.
// Combineert matchkwaliteit met competitiesterkte (tiebreak), en tolereert typo's per woord.
function scoreDiv(entry, q) {
  // Sterkte weegt fors bínnen een matchklasse (300 punten = het hele bereik), maar overbrugt
  // nooit een klasse: zo staat de sterke "…Eredivisie" boven een zwakke "Eredivisie Guinea"
  // terwijl een echte substring-match altijd boven een losse typo-match blijft.
  // Eigen competitie krijgt een vaste bonus bovenop de sterkte, zodat "mijn" Eredivisie
  // altijd boven gelijknamige buitenlandse competities staat en nooit uit de top-N valt.
  const name = entry.norm, str = Math.min(300, entry.strength / 40) + (entry.mine ? 400 : 0);
  if (!q) return str;                                     // lege query: puur op sterkte
  // klasse 1: hele query komt aaneengesloten voor. Positie weegt fors mee (een prefix-match
  // als "Premier League" verslaat een diepe match als "…Reservecompetitie Premier Divisie",
  // ook al is die laatste "van mij"); de eigen-competitie-bonus tipt alleen gelijkwaardige.
  const idx = name.indexOf(q);
  if (idx >= 0) return 3000 + str - Math.min(450, idx * 15);
  // klasse 2: een los woord begint met de query, of met een kleine typo
  let hit = false;
  for (const w of name.split(' ')) {
    if (w.startsWith(q)) { hit = true; break; }
    const tol = q.length >= 6 ? 2 : q.length >= 4 ? 1 : 0;
    if (tol && editDist(q, w.slice(0, q.length + tol), tol) <= tol) { hit = true; break; }
  }
  if (hit) return 2000 + str;
  // klasse 3: losse letters in volgorde (subsequence) als laatste redmiddel
  let i = 0; for (const c of name) if (c === q[i]) i++;
  return i === q.length ? 1000 + str : -1;
}
let divSuggestSel = -1;
function renderDivSuggest() {
  const box = $('div-suggest');
  const q = normStr($('f-div').value);
  const idx = state.divIndex || [];
  const ranked = idx.map(e => ({ e, s: scoreDiv(e, q) })).filter(x => x.s >= 0)
    .sort((a, b) => b.s - a.s).slice(0, 8);
  if (!ranked.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  divSuggestSel = -1;
  box.innerHTML = ranked.map((x, i) =>
    `<div class="ds-item" data-v="${escHtml(x.e.name)}" data-i="${i}">${escHtml(x.e.name)}</div>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('.ds-item').forEach(el => el.onmousedown = e => {
    e.preventDefault();
    $('f-div').value = el.dataset.v;
    box.classList.add('hidden');
    applyFilters();
  });
}
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
  const m = s.match(/^([\d.]+)\s*(K|MLD|M|B)?/);   // MLD vóór M, anders "matcht" M al op de M van MLD
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
  const metaMin = +$('f-meta-min').value || 0, metaMax = +$('f-meta-max').value || 99;
  // Meta-score bestaat alleen voor spelers met attributen (staf en keepers vallen erbuiten).
  const wantMeta = state.mode !== 'staff' && (metaMin > 0 || metaMax < 99);
  const price = parseMoney($('f-price').value);
  const fee = parseMoney($('f-fee').value);
  const wage = parseMoney($('f-wage').value);
  const nat = $('f-nat').value.trim().toLowerCase();
  const onlyEu = $('f-eu').checked, onlyMyClub = $('f-myclub').checked;
  const minInterest = +$('f-interest').value || 0;
  const wantListed = $('f-listed').checked, contractF = $('f-contract').value;
  const onlySl = $('f-shortlist').checked || state.mode === 'shortlist';
  const advRules = state.mode === 'staff' ? [] : activeAdvRules();   // staf heeft geen veld-attributen
  const staffRole = $('f-staffrole').value;
  const divVal = $('f-div').value.trim().toLowerCase();   // zoekbalk: substring, hoofdletterongevoelig
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
    if (wantMeta) { const s = metaScore(p); if (s == null || s < metaMin || s > metaMax) return false; }
    if (price != null && (estValue(p).v ?? Infinity) > price) return false;
    if (fee != null && (feeEstimate(p).v ?? Infinity) > fee) return false;
    if (wage != null && (p.wage ?? Infinity) > wage) return false;
    if (nat && !(p.nat || []).some(n => n.toLowerCase().includes(nat) || natLabel(n).toLowerCase().includes(nat))) return false;
    if (onlyEu && !isEu(p)) return false;
    // "Mijn club": toon eigen spelers + verhuurde (moederclub = mijn club, spelen elders)
    // + gehuurde (spelen bij mij, moederclub elders). Zie loanStatus() voor de kleuring.
    if (onlyMyClub) {
      const cl = (p.club || '').toLowerCase(), ow = (p.ownerClub || '').toLowerCase();
      if (cl !== myClub && ow !== myClub) return false;
    }
    // Teamchips (1e/2e/jeugd) — alleen actief samen met "Mijn club" en teamType-data (plugin v0.1.10+).
    if (onlyMyClub && state.myTeam !== 'all' && state.mode !== 'staff') {
      const tt = p.teamType;
      if (state.myTeam === 'first' && tt !== 0) return false;
      if (state.myTeam === 'res' && !(tt >= 1 && tt <= 9)) return false;
      if (state.myTeam === 'youth' && !(tt >= 10)) return false;
    }
    if (contractF === 'free' && !isFree(p)) return false;
    if (contractF === 'exp6' || contractF === 'exp12') {
      const m = monthsUntil(p.expires);
      if (m == null || m > (contractF === 'exp6' ? 6 : 12)) return false;
    }
    if (minInterest > 0) { const i = interestEstimate(p); if (!i || i.score < minInterest) return false; }
    if (wantListed && !p.listed) return false;
    for (const r of advRules) {
      const av = advValue(p, r.k);
      if (av == null || av <= 0) return false;   // onbekend attribuut telt als geen match
      if (r.min && av < r.min) return false;
      if (r.max && av > r.max) return false;
    }
    if (activePos.size && !(p.posArr || []).some(x => activePos.has(x))) return false;
    if (state.mode === 'staff' && staffRole && p.job !== staffRole) return false;
    if (divVal && !(p.div || '').toLowerCase().includes(divVal)) return false;
    return true;
  });
  sortRows();
  renderChips(buildChips());
  updateSecDots();
  renderTable();
}

// Stip op de sectiekop zodra er binnen die sectie een filter actief is; zo zie je ook
// bij ingeklapte secties waar je moet zijn.
function updateSecDots() {
  const val = id => { const e = $(id); return e ? e.value.trim() : ''; };
  const on = {
    position: activePos.size > 0,
    role: !!$('f-role').value,
    quality: ['f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-meta-min', 'f-meta-max'].some(id => val(id)) || activeAdvRules().length > 0,
    financial: ['f-price', 'f-fee', 'f-wage'].some(id => val(id)),
    origin: !!(val('f-nat') || $('f-eu').checked || val('f-div')),
    availability: +$('f-interest').value > 0 || $('f-listed').checked || !!$('f-contract').value || $('f-myclub').checked || $('f-shortlist').checked,
  };
  document.querySelectorAll('.fsection[data-sec]').forEach(sec => {
    const k = sec.dataset.sec;
    if (k in on) sec.classList.toggle('f-on', !!on[k]);
  });
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
  if ($('f-div').value.trim()) add(`${t('divLabel')}: ${$('f-div').value.trim()}`, () => { $('f-div').value = ''; });
  range('f-age-min', 'f-age-max', t('age'));
  range('f-ca-min', 'f-ca-max', 'CA');
  range('f-pa-min', 'f-pa-max', 'PA');
  range('f-meta-min', 'f-meta-max', t('c_meta'));
  if (v('f-price')) add(`${t('maxvalue')} ${v('f-price')}`, clearInput('f-price'));
  if (v('f-fee')) add(`${t('maxfee')} ${v('f-fee')}`, clearInput('f-fee'));
  if (v('f-wage')) add(`${t('maxwage')} ${v('f-wage')}`, clearInput('f-wage'));
  if (v('f-nat')) add(`${t('nat')}: ${v('f-nat')}`, clearInput('f-nat'));
  if ($('f-eu').checked) add(t('euonly'), uncheck('f-eu'));
  if (+$('f-interest').value > 0) add(`${t('interestmin')} ${$('f-interest').selectedOptions[0].textContent}`, () => { $('f-interest').value = '0'; });
  if ($('f-listed').checked) add(t('listed'), uncheck('f-listed'));
  if ($('f-contract').value) add(`${t('contractF')}: ${$('f-contract').selectedOptions[0].textContent}`, () => { $('f-contract').value = ''; });
  if (state.mode !== 'staff')
    for (const r of activeAdvRules()) add(advChipTxt(r), () => { state.advF = state.advF.filter(x => x !== r); saveAdv(); });
  if ($('f-myclub').checked) add(t('myclub'), uncheck('f-myclub'));
  if ($('f-shortlist').checked && state.mode !== 'shortlist') add(t('onlyshortlist'), uncheck('f-shortlist'));
  return chips;
}
function renderChips(chips) {
  const bar = $('chipbar');
  const n = state.filtered.length.toLocaleString();
  bar.innerHTML = `<span class="chip-count"><b>${n}</b> ${t('results')}</span>` +
    chips.map((c, i) => `<button class="chip" data-i="${i}" title="${t('clear')}">${escHtml(c.label)}<span class="x">${icon('x', 10)}</span></button>`).join('') +
    (chips.length > 1 ? `<button class="chip-clear">${t('clearAll')}</button>` : '');
  bar.querySelectorAll('.chip').forEach(el => el.onclick = () => { chips[+el.dataset.i].clear(); applyFilters(); });
  const ca = bar.querySelector('.chip-clear');
  if (ca) ca.onclick = () => $('btn-clear').onclick();
}
// ---------- opgeslagen filterpresets ----------
// Een preset is een momentopname van alle filtervelden (tekst, vinkjes, selects, posities
// op het veld en de gekozen tactische rol). Bewaard in localStorage; zelfde naam = overschrijven.
const PRESET_TEXT_IDS = ['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-meta-min', 'f-meta-max', 'f-price', 'f-fee', 'f-wage', 'f-nat', 'f-div'];
const PRESET_CHECK_IDS = ['f-eu', 'f-listed', 'f-myclub', 'f-shortlist'];
const PRESET_SELECT_IDS = ['f-interest', 'f-staffrole', 'f-role', 'f-contract'];
function loadPresets() { try { return JSON.parse(localStorage.getItem('fmss_presets') || '[]'); } catch { return []; } }
function storePresets(list) { localStorage.setItem('fmss_presets', JSON.stringify(list)); }
function snapshotFilters() {
  const s = { text: {}, check: {}, select: {}, pos: [...activePos] };
  for (const id of PRESET_TEXT_IDS) { const v = $(id).value.trim(); if (v) s.text[id] = v; }
  for (const id of PRESET_CHECK_IDS) if ($(id).checked) s.check[id] = true;
  for (const id of PRESET_SELECT_IDS) { const v = $(id).value; if (v && v !== '0') s.select[id] = v; }
  const adv = state.advF.filter(r => r.k && (r.min || r.max));
  if (adv.length) s.adv = adv.map(r => ({ ...r }));
  return s;
}
const presetIsEmpty = s => !s.pos.length && !Object.keys(s.text).length && !Object.keys(s.check).length && !Object.keys(s.select).length && !(s.adv || []).length;
function applyPreset(s) {
  $('btn-clear').onclick();                       // schone lei
  $('f-role').value = '';                         // rol hoort bij de preset, niet bij de vorige zoektocht
  for (const [id, v] of Object.entries(s.text || {})) if ($(id)) $(id).value = v;
  for (const id of Object.keys(s.check || {})) if ($(id)) $(id).checked = true;
  for (const [id, v] of Object.entries(s.select || {})) if ($(id)) $(id).value = v;
  // Oude presets (vóór de contractstatus-select) sloegen dit op als losse checkboxes.
  const oc = s.check || {};
  if (oc['f-free']) $('f-contract').value = 'free';
  else if (oc['f-exp6']) $('f-contract').value = 'exp6';
  else if (oc['f-exp12']) $('f-contract').value = 'exp12';
  state.advF = (s.adv || []).map(r => ({ ...r }));
  saveAdv();
  const codes = new Set(s.pos || []);
  activePos.clear();
  document.querySelectorAll('.pos-node').forEach(n => {
    const on = codes.has(n.dataset.pos);
    n.classList.toggle('on', on);
    if (on) activePos.add(n.dataset.pos);
  });
  // rol-keuze gedraagt zich zoals de gewone rol-selectie (incl. sorteren op rolscore)
  state.role = $('f-role').value;
  localStorage.setItem('fmss_role', state.role);
  if (state.role) { state.sortKey = 'role'; state.sortDir = -1; }
  else if (state.sortKey === 'role') { state.sortKey = 'ca'; state.sortDir = -1; }
  applyFilters();
}
// Klein in-app dialoogje in de stijl van de app (geen system-popups zoals prompt/confirm).
// opts: { title, body?, input? (placeholder → toont invoerveld), confirmLabel, danger?, onConfirm(value) }
function presetDialog(opts) {
  const m = $('preset-modal');
  m.innerHTML = `<div class="pm-card">
    <div class="pm-title">${opts.title}</div>
    ${opts.body ? `<div class="pm-body">${opts.body}</div>` : ''}
    ${opts.input != null ? `<input type="text" id="pm-input" maxlength="40" placeholder="${opts.input}">` : ''}
    <div class="pm-actions">
      <button class="pm-cancel">${t('cancelBtn')}</button>
      <button class="pm-ok${opts.danger ? ' danger' : ''}">${opts.confirmLabel}</button>
    </div>
  </div>`;
  m.classList.remove('hidden');
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const close = () => { m.classList.add('hidden'); document.removeEventListener('keydown', esc, true); };
  const ok = () => {
    const inp = $('pm-input');
    const v = inp ? inp.value.trim() : null;
    if (inp && !v) { inp.focus(); return; }   // lege naam: blijf staan
    close();
    opts.onConfirm(v);
  };
  document.addEventListener('keydown', esc, true);   // capture: vóór de globale Esc-handlers
  m.querySelector('.pm-cancel').onclick = close;
  m.querySelector('.pm-ok').onclick = ok;
  m.onclick = e => { if (e.target === m) close(); };
  const inp = $('pm-input');
  if (inp) { inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') ok(); }; }
}
// Dropdown: knop toont de laatst toegepaste preset; het menu eronder heeft per preset
// een kruisje om te verwijderen (met bevestiging). state.presetSel is alleen een label,
// de chips boven de tabel blijven de bron van waarheid voor wat er actief is.
function closePresetMenu() {
  $('preset-dd-menu').classList.add('hidden');
  $('preset-dd-btn').classList.remove('open');
}
function renderPresets() {
  const btn = $('preset-dd-btn'), menu = $('preset-dd-menu'), label = $('preset-dd-label');
  const list = loadPresets();
  const has = list.length > 0;
  btn.disabled = !has;
  if (!has) { state.presetSel = null; closePresetMenu(); }
  label.textContent = has ? (state.presetSel || t('presetPick')) : t('presetNone');
  menu.innerHTML = list.map((p, i) =>
    `<div class="pd-item" data-i="${i}"><span class="pd-name">${escHtml(p.name)}</span><button class="pd-del" data-del="${i}" title="${t('deleteBtn')}">${icon('x', 11)}</button></div>`).join('');
  menu.querySelectorAll('.pd-item').forEach(el => el.onclick = e => {
    if (e.target.closest('.pd-del')) return;   // kruisje heeft z'n eigen handler
    const p = loadPresets()[+el.dataset.i];
    closePresetMenu();
    if (p) {
      applyPreset(p.state);                    // wist eerst alles (reset ook presetSel)
      state.presetSel = p.name;
      label.textContent = p.name;
      showToast(p.name, 'search');
    }
  });
  menu.querySelectorAll('.pd-del').forEach(x => x.onclick = e => {
    e.stopPropagation();
    const p = loadPresets()[+x.dataset.del];
    if (!p) return;
    presetDialog({
      title: t('presetDelTitle'),
      body: tf('presetDelConfirm', { name: escHtml(p.name) }),
      confirmLabel: t('deleteBtn'),
      danger: true,
      onConfirm: () => {
        const cur = loadPresets();
        const idx = cur.findIndex(q => q.name === p.name);
        if (idx >= 0) { cur.splice(idx, 1); storePresets(cur); }
        if (state.presetSel === p.name) state.presetSel = null;
        renderPresets();
      },
    });
  });
}
$('preset-dd-btn').onclick = e => {
  e.stopPropagation();
  const m = $('preset-dd-menu');
  m.classList.toggle('hidden');
  $('preset-dd-btn').classList.toggle('open', !m.classList.contains('hidden'));
};
document.addEventListener('click', e => { if (!e.target.closest('#preset-dd')) closePresetMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePresetMenu(); });
$('btn-preset-save').onclick = () => {
  const snap = snapshotFilters();
  if (presetIsEmpty(snap)) { showToast(t('presetEmptyFilters')); return; }
  presetDialog({
    title: t('presetSaveTitle'),
    input: t('presetNamePrompt'),
    confirmLabel: t('saveBtn'),
    onConfirm: name => {
      const list = loadPresets().filter(p => p.name !== name);   // zelfde naam = overschrijven
      list.push({ name, state: snap });
      storePresets(list);
      state.presetSel = name;
      renderPresets();
      showToast(t('presetSaved'), 'check');
    },
  });
};

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
    // op de standaardplek invoegen (na de dichtstbijzijnde bekende voorganger), niet achteraan
    const prev = keys.slice(0, keys.indexOf(kk)).reverse().find(k2 => saved.order.includes(k2));
    saved.order.splice(prev ? saved.order.indexOf(prev) + 1 : saved.order.length, 0, kk);
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
  const rest = cf.order.filter(k => !hidden.has(k) && byKey[k] && !(rc && k === 'role') && !hiddenStatCol(k)).map(k => byKey[k]);
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
function colLabel(c) { return c.star ? starSvg(13) : (c.label.startsWith('c_') || I18N.nl[c.label] ? t(c.label) : c.label); }
function colWidths() { return state.colW[modeKey()] || (state.colW[modeKey()] = {}); }
function saveColW() { localStorage.setItem('fmss_colw', JSON.stringify(state.colW)); }
function renderTable() {
  const cols = activeCols();
  const W = colWidths();
  // Vaste lay-out: elke kolom krijgt altijd een breedte (gebruikers-breedte wint van de
  // standaard) en de tabel de som — anders bepalen de zichtbare rijen de breedtes en
  // verspringt alles bij sorteren/scrollen.
  const wOf = c => W[c.key] || c.w || 90;
  $('grid').style.width = cols.reduce((s, c) => s + wOf(c), 0) + 'px';
  $('grid-head').innerHTML = cols.map(c => {
    const stick = c.star ? 'c-sticky' : c.name ? 'c-sticky stick-end' : '';
    const w = ` style="width:${wOf(c)}px"`;
    const grip = c.star ? '' : '<span class="col-resize"></span>';   // sleepgreep rechts
    const help = c.help ? `<span class="col-help" title="${t(c.help)}">?</span>` : '';
    return `<th data-key="${c.key}" draggable="${c.star ? 'false' : 'true'}"${w} class="${stick} ${c.key === state.sortKey ? 'sorted' : ''}">${colLabel(c)}${help}${c.key === state.sortKey ? (state.sortDir < 0 ? ' ▼' : ' ▲') : ''}${grip}</th>`;
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
        const grid = $('grid'), startTW = parseFloat(grid.style.width) || grid.getBoundingClientRect().width;
        th.draggable = false;
        // Tabelbreedte beweegt mee, anders herverdeelt de vaste lay-out de andere kolommen.
        const move = ev => {
          const nw = Math.max(40, Math.round(startW + ev.clientX - startX));
          th.style.width = nw + 'px';
          grid.style.width = Math.round(startTW + (nw - startW)) + 'px';
          colWidths()[k] = nw;
        };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); th.draggable = true; saveColW(); renderVisible(); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      });
      grip.addEventListener('click', e => { e.stopPropagation(); });   // greep-klik nooit sorteren
      grip.ondragstart = e => { e.preventDefault(); e.stopPropagation(); };
    }
    const col = cols.find(c => c.key === k);
    th.onclick = e => {
      if (col?.star) return;
      if (e.target.closest('.col-help')) return;             // ?-icoon is alleen uitleg, niet sorteren
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
  // Kolommen onder de verborgen-stats-toggle horen ook niet in dit menu als ze uit staan.
  const base = baseCols().filter(c => !c.star && !hiddenStatCol(c.key));
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
// Huurstatus t.o.v. mijn club — alleen relevant onder het "Mijn club"-filter (Marks keuze),
// dus daarbuiten geen kleuring. loan-out = verhuurd (rood), loan-in = gehuurd (blauw).
function loanStatus(p) {
  if (!$('f-myclub').checked) return '';
  const my = (state.meta.myClub || '').toLowerCase();
  if (!my) return '';
  const cl = (p.club || '').toLowerCase(), ow = (p.ownerClub || '').toLowerCase();
  if (ow === my && cl && cl !== my) return 'loan-out';
  if (cl === my && ow && ow !== my) return 'loan-in';
  return '';
}
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
        return `<td class="star-cell ${stick} ${on ? 'on' : ''}" data-star="${p.id}">${starSvg(15)}</td>`;
      }
      if (c.render) return `<td class="${c.num ? 'num' : ''}">${c.render(p)}</td>`;
      let v = c.get(p);
      if (c.name) {
        const ls = loanStatus(p);
        const lt = ls === 'loan-out' ? ` · ${tf('loanOut', { c: p.club || '?' })}`
          : ls === 'loan-in' ? ` · ${tf('loanIn', { c: p.ownerClub || '?' })}` : '';
        return `<td class="pname ${ls} ${stick}" title="Klik = kopieer naam${lt}">${v ? escHtml(v) : '?'}</td>`;
      }
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
function showToast(msg, ico) {
  const el = $('toast');
  el.innerHTML = (ico ? icon(ico, 13) + ' ' : '') + escHtml(msg); el.className = 'show';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.className = 'hidden', 1600);
}
function copyName(name) {
  const ok = () => showToast(t('copied') + ': ' + name, 'clipboard');
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
  const withCapa = !state.hideCapa;   // vraagprijs valt ook onder de verborgen-stats-toggle
  const cols = ['Name', 'Position', 'Age', 'Club', 'Nationality',
    ...(withCapa ? ['CA', 'PA'] : []), 'Value(GBP)', ...(withCapa ? ['AskingPrice(GBP)'] : []), 'Wage(GBP)', 'Contract', 'Interest'];
  const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const p of all) {
    const i = interestEstimate(p);
    lines.push([p.name, p.pos || p.job || '', getAge(p), p.club || '', (p.nat || []).map(natLabel).join('/'),
      ...(withCapa ? [p.ca, p.pa] : []), estValue(p).v ?? '', ...(withCapa ? [feeEstimate(p).v ?? ''] : []), p.wage ?? '', p.expires || '', i ? i.label : ''].map(esc).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fmsuperscout-shortlist.csv';
  a.click(); URL.revokeObjectURL(a.href);
  showToast(all.length + ' → CSV', 'check');
}

// ---------- detailpaneel ----------
// FM-attribuutkleuren: 16-20 groen, 11-15 oranje, 1-10 witachtig. Ook voor potentie-projectie.
const attrClass = v => v >= 16 ? 'at-hi' : v >= 11 ? 'at-mid' : 'at-lo';
const abar = v => `<span class="abar"><i class="${attrClass(v)}" style="width:${Math.min(100, v * 5)}%"></i></span>`;
// Attribuutfamilies voor de potentie-projectie.
const PHYS_ATTRS = new Set(['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength']);
const MENTAL_ATTRS = new Set(['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate']);
const SETPIECE_ATTRS = new Set(['Corners', 'FreeKicks', 'PenaltyTaking', 'LongThrows']);
// Fysieke groei is sterk leeftijdsgebonden: piekt jong, plateaut ~24, daalt na ~30.
function physGrowthFactor(age) {
  if (age == null) return 0.6;
  if (age <= 20) return 1.0;
  if (age <= 23) return 0.8;
  if (age <= 26) return 0.55;
  if (age <= 29) return 0.3;
  if (age <= 32) return 0.12;
  return 0.05;
}
// Mentale groei loopt juist dóór (en versnelt relatief) op latere leeftijd.
function mentalGrowthFactor(age) {
  if (age == null) return 1.0;
  if (age >= 32) return 1.25;
  if (age >= 28) return 1.15;
  return 1.0;
}
// ----- Potentie-projectie: positieprofiel-model, gemeten op de eigen dump -----
// Twee empirische lessen (tools/ca-analysis.js + tools/pos-curve.js, 48k spelers):
//  1) FM's CA-schaal heeft een grote basis (totaal ≈ 148 + 2,1×CA) — ×PA/CA overdreef enorm.
//  2) Wélke attributen meegroeien met CA verschilt sterk per positie: een CA-180-back krijgt
//     er nauwelijks Afwerken bij, wel Voorzetten/Tackelen. Een budget-model zonder positie
//     maakte van elk wonderkind een onrealistische allrounder.
// Daarom per positiegroep het gemeten gemiddelde attribuutprofiel op CA-ankers 80/110/140/170
// (POS_ATTR_PROFILE, gegenereerd met tools/pos-curve.js; validatie: anker-170 wijkt max ~1 punt
// af van echte CA-165+-profielen). Projectie = eigen waarde + (norm(PA) − norm(CA)) van de
// eigen positiegroep(en): de positie-vorm klopt én persoonlijke sterktes/zwaktes blijven.
const POS_CA_ANCHORS = [80, 110, 140, 170];
const POS_ATTR_PROFILE = {ALL:{Crossing:[7.5,9.5,10.7,12],Dribbling:[8.2,10.5,12.1,14.2],Finishing:[7.4,8.9,10,11.8],Heading:[8.3,9.8,10.7,11.7],LongShots:[6.7,9.1,10.5,11.9],Marking:[7.9,9.3,10.3,11.2],OffTheBall:[8.8,11,12.3,13.9],Passing:[9.3,11.3,12.8,14.8],PenaltyTaking:[5,8.1,10,11.2],Tackling:[8.5,9.6,10.8,11.6],Vision:[8.3,10.7,12.4,14.5],Handling:[2.1,2.1,2.1,2.1],AerialReach:[2.1,2.1,2.1,2],CommandOfArea:[2.1,2.1,2.1,2.1],Communication:[2.1,2.1,2.1,2.2],Kicking:[2.1,2.1,2.1,2],Throwing:[2.1,2.1,2.1,2],Anticipation:[9.4,11.6,13.3,15.1],Decisions:[10.9,11.5,12.6,14.4],OneOnOnes:[2.1,2.1,2.1,2.1],Positioning:[8.3,9.9,11.1,12],Reflexes:[2.1,2.1,2.1,2.1],FirstTouch:[10.1,11.6,13,15.1],Technique:[9.9,11.8,13.3,15.2],Flair:[8.9,10.3,11.9,13.8],Corners:[5.5,7.8,8.9,9.6],Teamwork:[9.1,11.7,13.2,14.4],WorkRate:[10.1,12.2,13.7,14.9],LongThrows:[4.7,6.9,7.8,7.7],Eccentricity:[2.1,2.1,2.1,2.1],RushingOut:[2.1,2.1,2.1,2.1],Punching:[2.1,2.1,2.1,2],Acceleration:[11.7,12.3,13.4,14.7],FreeKicks:[5.4,7.8,9.1,10.2],Strength:[8,10.5,11.9,13.5],Stamina:[10,11.9,13.6,14.9],Pace:[11.7,12.3,13.5,14.9],JumpingReach:[9.5,10.6,11.2,12],Leadership:[8.1,9.2,10.2,11.8],Balance:[9.5,11.4,12.9,14.7],Bravery:[8.8,11.2,12.8,13.7],Aggression:[10.4,11.3,12.4,13.3],Agility:[11.2,11.9,13.2,14.8],NaturalFitness:[12.1,12.5,13.4,14.8],Determination:[11.1,12.4,13.8,15.5],Composure:[8.6,11.1,12.7,14.9],Concentration:[8.3,10.7,12.3,13.9]},AMC:{Crossing:[8,10.5,11.9,13.2],Dribbling:[10,12.1,13.7,15.7],Finishing:[9.6,10.5,11.9,13.8],Heading:[6.5,7.9,8.6,9.6],LongShots:[8.4,10.7,12.2,13.8],Marking:[5.8,7,7.9,8.8],OffTheBall:[10.3,12.1,13.5,15.1],Passing:[10.6,12.3,13.8,15.5],PenaltyTaking:[5.9,9.3,11.7,12.6],Tackling:[6.2,7.4,8.4,9.1],Vision:[10.6,12.4,13.9,15.9],Handling:[2.1,2.1,2.1,2.1],AerialReach:[2.1,2.1,2.1,2],CommandOfArea:[2.1,2.1,2.1,2.2],Communication:[2.1,2.1,2.1,2.3],Kicking:[2.1,2.1,2.1,1.9],Throwing:[2.1,2.1,2.2,2.1],Anticipation:[9.1,11.3,13,14.8],Decisions:[10.9,11.6,12.8,14.4],OneOnOnes:[2.1,2.1,2.1,2],Positioning:[6.7,8.2,9.2,9.9],Reflexes:[2.1,2.1,2.1,2.1],FirstTouch:[11.5,12.6,14.2,16.1],Technique:[11.7,13.1,14.8,16.4],Flair:[11.9,13,14.4,15.6],Corners:[6.7,9.9,11.8,12.5],Teamwork:[9.2,11.3,12.7,14.1],WorkRate:[10.2,11.7,13.1,14.6],LongThrows:[4,5.4,5.9,6.5],Eccentricity:[2.1,2.1,2.1,2.1],RushingOut:[2.1,2.1,2.1,1.9],Punching:[2.1,2.1,2.1,1.9],Acceleration:[12,12.3,13.3,14.3],FreeKicks:[6.6,9.8,11.6,12.7],Strength:[6.7,8.8,10,11.9],Stamina:[9.7,11.4,13,14.6],Pace:[11.7,12,13,14.3],JumpingReach:[8,8.6,8.9,9.8],Leadership:[8.1,8.7,9.7,10.9],Balance:[9.1,11.1,12.8,14.6],Bravery:[7.5,9.8,11.2,12.1],Aggression:[9.7,10.1,11,12.1],Agility:[11.5,12.5,14,15.6],NaturalFitness:[12,12.2,13,14.1],Determination:[10.8,12.2,13.4,15.4],Composure:[9.5,11.5,13,15.1],Concentration:[7.5,10,11.6,13.3]},DC:{Crossing:[5.1,7.2,8.4,8.9],Dribbling:[4.8,7.8,9.8,11.3],Finishing:[4,6.1,7,8],Heading:[11,12.7,14,15.4],LongShots:[4.6,6.8,7.7,8.3],Marking:[11.7,12.6,13.9,15.4],OffTheBall:[5.8,8.3,9.5,9.8],Passing:[7.5,10.6,12.4,14.1],PenaltyTaking:[3.9,6.2,7.6,8.4],Tackling:[11.6,12.7,14,15.6],Vision:[6.3,9.5,11.3,13.2],Handling:[2.1,2.1,2.1,2.1],AerialReach:[2.1,2.1,2.1,1.9],CommandOfArea:[2.1,2.1,2.1,2.1],Communication:[2.1,2.1,2.1,2],Kicking:[2.1,2.1,2.1,2.1],Throwing:[2.1,2.1,2.2,2.1],Anticipation:[10,12,13.8,15.8],Decisions:[11.6,11.7,12.7,14.6],OneOnOnes:[2.1,2.1,2.1,1.9],Positioning:[11.6,12.6,13.8,15.5],Reflexes:[2.1,2.1,2,2],FirstTouch:[7.5,10.2,11.7,13.4],Technique:[6.9,10,11.8,13.5],Flair:[5.8,7.1,8.6,9.8],Corners:[3.6,5.1,5.4,5.2],Teamwork:[8.3,11.8,13.6,14.7],WorkRate:[9,12,13.8,15.1],LongThrows:[4.8,7.9,9.4,9.7],Eccentricity:[2.1,2.1,2.2,2],RushingOut:[2.1,2.1,2.2,2.3],Punching:[2.1,2.1,2.1,1.9],Acceleration:[10.6,11.3,12.5,13.8],FreeKicks:[4.1,5.6,6.3,6.6],Strength:[9.7,12.4,14.1,15.8],Stamina:[9.3,11.8,13.5,14.5],Pace:[10.9,11.8,13.4,14.9],JumpingReach:[12.1,13.5,14.4,15.6],Leadership:[8.6,10.6,12,13.7],Balance:[9.4,11.6,13.2,14.2],Bravery:[10.7,12.7,14.2,15.6],Aggression:[11.3,12.4,13.6,14.4],Agility:[10.2,10.7,11.8,13.1],NaturalFitness:[12.1,12.6,13.3,14.7],Determination:[11.2,12.6,14.1,15.9],Composure:[7.5,10.8,12.7,14.9],Concentration:[9.7,11.6,13.2,14.8]},DM:{Crossing:[6,8.7,10.2,11.7],Dribbling:[6.5,9.7,11.6,13.8],Finishing:[6,7.8,9,10.6],Heading:[7.5,9.7,10.4,11.5],LongShots:[7.9,9.7,11.1,12.3],Marking:[9.4,11,12,12.8],OffTheBall:[8,10.4,12,14.2],Passing:[10.8,12.4,13.9,16],PenaltyTaking:[4.8,8.1,10,10.8],Tackling:[11.2,11.9,13.1,14],Vision:[9.9,11.7,13.3,15.5],Handling:[2.1,2.1,2,2],AerialReach:[2.1,2.1,2.1,2.1],CommandOfArea:[2.1,2.1,2,2.4],Communication:[2.1,2.1,2.1,2.3],Kicking:[2.1,2.1,2.1,1.9],Throwing:[2.1,2.1,2.1,1.9],Anticipation:[9.9,12.1,13.8,15.8],Decisions:[11.9,12.1,13.2,15],OneOnOnes:[2.1,2.1,2.1,2.3],Positioning:[10.3,11.9,13.3,14.3],Reflexes:[2.1,2.1,2.1,2],FirstTouch:[10.9,12.1,13.4,15.4],Technique:[10.4,12,13.5,15.5],Flair:[6.8,9.3,11.1,13.6],Corners:[5.5,8,9.6,9.7],Teamwork:[10.2,12.9,14.6,15.5],WorkRate:[11.6,13.2,14.7,15.8],LongThrows:[4.2,6.3,7.2,6.9],Eccentricity:[2.1,2.1,2.1,2.1],RushingOut:[2.1,2.1,2.2,2.1],Punching:[2.1,2.1,2.1,1.9],Acceleration:[10.8,11.4,12.4,13.6],FreeKicks:[6,8.3,9.7,10.1],Strength:[8.4,10.9,12.3,13.8],Stamina:[10.2,12.5,14.4,16.1],Pace:[10.9,11.5,12.6,13.7],JumpingReach:[9.6,10.7,11,11.8],Leadership:[8.6,10.4,11.6,12.4],Balance:[9.7,11.7,13.2,14.9],Bravery:[9.5,12,13.5,14.1],Aggression:[10.9,12.2,13.3,14.1],Agility:[10.4,11.4,12.7,14.4],NaturalFitness:[12.2,12.7,13.9,15.1],Determination:[11.2,12.8,14.2,15.5],Composure:[8.6,11.5,13.2,15.4],Concentration:[9.3,11.6,13.4,14.7]},FB:{Crossing:[9.9,11.3,12.6,13.9],Dribbling:[7.6,10.3,12,13.4],Finishing:[4.9,7.1,8.4,9.9],Heading:[7.6,9.3,10.1,11],LongShots:[5.4,8.1,9.4,10.8],Marking:[9.3,10.9,12,12.7],OffTheBall:[7.8,10.8,12.5,14.2],Passing:[8.8,11,12.4,14.5],PenaltyTaking:[4.3,6.9,8.4,9.3],Tackling:[10.7,11.6,12.8,13.3],Vision:[7.8,10.1,11.7,13.8],Handling:[2.1,2.1,2.1,1.9],AerialReach:[2.1,2.1,2.1,2.2],CommandOfArea:[2.1,2.1,2.2,1.8],Communication:[2.1,2.1,2.1,2.2],Kicking:[2.1,2.1,2,1.8],Throwing:[2.1,2.1,2.1,1.9],Anticipation:[9.3,11.4,12.9,14.8],Decisions:[11.1,11.4,12.4,14.3],OneOnOnes:[2.1,2.1,2.1,2],Positioning:[9.4,11.2,12.4,13.9],Reflexes:[2.1,2.1,2.1,2.2],FirstTouch:[9.3,11,12.5,14.3],Technique:[9.2,11.2,12.7,14.4],Flair:[7.4,9.3,11.1,12.7],Corners:[5.4,8,9.1,9.4],Teamwork:[10,12.2,13.6,14.7],WorkRate:[10.3,12.7,14.2,15.1],LongThrows:[6.5,9.8,11.2,11.1],Eccentricity:[2.1,2.1,2.2,2.1],RushingOut:[2.1,2.1,2.2,2.4],Punching:[2.1,2.1,2.1,2.1],Acceleration:[12.4,12.8,14,15.4],FreeKicks:[4.3,7.1,8.5,9.5],Strength:[8,10.2,11.7,13.5],Stamina:[10.9,12.4,14.1,15.2],Pace:[12.2,12.7,14.1,15.5],JumpingReach:[9.2,9.9,10.7,11.6],Leadership:[8.3,9,10,11.3],Balance:[9.8,11.3,12.7,14.5],Bravery:[9.9,11.6,13.2,14],Aggression:[10.5,11.5,12.8,14],Agility:[11.8,12.2,13.3,14.9],NaturalFitness:[12.2,12.7,13.7,15.1],Determination:[11.1,12.4,13.9,15.6],Composure:[7.8,10.5,12.2,14.4],Concentration:[9.7,11.2,12.6,14.1]},GK:{Crossing:[2.1,2.3,2.3,2.3],Dribbling:[2.1,2.4,2.8,3.7],Finishing:[2,2.1,2.1,2.2],Heading:[4.3,5.3,5.4,7.3],LongShots:[2.1,2.5,2.7,2.5],Marking:[2.1,2.3,2.4,1.8],OffTheBall:[2.4,3.4,4.1,3.9],Passing:[8.2,10.1,11.3,12.6],PenaltyTaking:[2.4,2.8,3.5,4.8],Tackling:[2.1,2.5,2.6,3],Vision:[6.6,9,10.5,12],Handling:[11.5,12.3,13.4,15.1],AerialReach:[11.4,13.2,14.1,15.4],CommandOfArea:[9.6,11.5,12.9,14.6],Communication:[9,11.4,12.8,14.6],Kicking:[9.9,11.6,13,14],Throwing:[8.7,11.6,13.2,14.3],Anticipation:[8.8,11.5,13,14.5],Decisions:[11.7,11.5,12.4,13.9],OneOnOnes:[9.9,12.6,14.4,16.6],Positioning:[9.7,12.1,13.3,15.1],Reflexes:[12,13.3,15.2,17.1],FirstTouch:[4.3,7.6,9.7,11.9],Technique:[4.9,8.1,9.9,12],Flair:[2.5,4.4,5.7,8.2],Corners:[3.2,3.7,4.1,4.7],Teamwork:[7.7,10.8,12.2,12.9],WorkRate:[6.8,10.3,11.9,13.4],LongThrows:[2.1,2.6,2.9,3],Eccentricity:[6.5,8,8.9,9.3],RushingOut:[9.5,10.7,12,13.2],Punching:[9.3,10.3,11,10.6],Acceleration:[9.4,9.7,10.3,11.1],FreeKicks:[4.3,4.9,5.2,5.4],Strength:[7.4,10.8,12.4,13.4],Stamina:[5.7,9.4,11.3,12.2],Pace:[8.9,9.6,10.3,11.3],JumpingReach:[12.7,14.1,14.9,15.6],Leadership:[8,9.9,11.4,13],Balance:[8.3,10.8,12,12.4],Bravery:[11.5,12.2,13.2,14.1],Aggression:[9.2,9.5,10.1,11.7],Agility:[10.7,12,13.3,15],NaturalFitness:[11.7,12.2,13.1,13.6],Determination:[11.1,12.3,13.6,15.5],Composure:[7.2,10.7,12.6,14.3],Concentration:[10.2,11.6,12.9,14.5]},MC:{Crossing:[6.7,9.5,10.9,12.2],Dribbling:[7.6,10.6,12.3,14.3],Finishing:[7.2,8.8,10.1,11.8],Heading:[6.6,8.7,9.6,10.9],LongShots:[8.4,10.3,11.6,13],Marking:[8.3,9.7,10.7,11.8],OffTheBall:[9.1,11.3,12.7,14.7],Passing:[11.4,12.7,14,15.9],PenaltyTaking:[5.1,8.6,10.7,11.5],Tackling:[9.1,10.5,11.6,12.6],Vision:[10.8,12.2,13.6,15.7],Handling:[2.1,2.1,2.1,2.1],AerialReach:[2.1,2.1,2.1,2.1],CommandOfArea:[2.1,2.1,2.1,2.2],Communication:[2.1,2.1,2.1,2.2],Kicking:[2.1,2.1,2.1,1.9],Throwing:[2.1,2.1,2.2,1.9],Anticipation:[9.4,11.9,13.5,15.3],Decisions:[11.5,12,13.1,14.9],OneOnOnes:[2.1,2.1,2.1,2.2],Positioning:[8.7,10.8,12.1,13.2],Reflexes:[2.1,2.1,2.1,2],FirstTouch:[11.6,12.4,13.7,15.6],Technique:[11.2,12.6,14,15.8],Flair:[8.8,10.7,12.4,14.4],Corners:[6.1,9,10.6,11],Teamwork:[9.9,12.5,14.1,15.3],WorkRate:[11.4,12.9,14.2,15.6],LongThrows:[4.1,6,6.8,7],Eccentricity:[2.1,2.1,2.1,2.1],RushingOut:[2.1,2.1,2.2,2.2],Punching:[2.1,2.1,2.1,1.9],Acceleration:[11.3,11.7,12.6,13.8],FreeKicks:[6.2,9,10.5,11.4],Strength:[7.7,10.1,11.5,13.1],Stamina:[10.3,12.2,14.1,15.8],Pace:[11.3,11.7,12.7,13.9],JumpingReach:[8.8,9.7,10.3,11.2],Leadership:[8.4,9.9,11,12.1],Balance:[9.4,11.5,13,14.5],Bravery:[8.3,11.2,12.8,13.8],Aggression:[10.6,11.6,12.6,13.8],Agility:[11,11.9,13.1,14.7],NaturalFitness:[12.2,12.5,13.6,15],Determination:[11.2,12.6,13.9,15.7],Composure:[8.9,11.6,13.2,15.3],Concentration:[8.7,11.1,12.8,14.4]},ST:{Crossing:[6.5,8.7,9.7,11.4],Dribbling:[10.6,11.3,12.4,14.9],Finishing:[11.8,12.4,13.9,15.5],Heading:[10.5,11.5,12.7,12.5],LongShots:[7,9.8,11.4,13],Marking:[4.8,6.2,6.9,7.6],OffTheBall:[11.3,12.7,14.1,15.7],Passing:[8.2,10.4,11.8,13.8],PenaltyTaking:[6.4,10.2,12.6,14.5],Tackling:[4.1,6,6.9,7.5],Vision:[7.4,10.1,11.8,13.9],Handling:[2.1,2.1,2.1,2],AerialReach:[2.1,2.1,2.1,2],CommandOfArea:[2.1,2.1,2.1,2.1],Communication:[2.1,2.1,2.1,2.2],Kicking:[2.1,2.1,2.1,2.1],Throwing:[2.1,2.1,2.1,1.9],Anticipation:[9.8,11.8,13.4,15.2],Decisions:[10,11.2,12.4,14.1],OneOnOnes:[2.1,2.1,2.2,2.3],Positioning:[5.7,7.4,7.9,8.1],Reflexes:[2.1,2.1,2.1,1.9],FirstTouch:[11,11.8,13,15.2],Technique:[10.5,11.9,13.4,15.4],Flair:[11,11.5,12.9,15.2],Corners:[5.3,7,7.6,8.9],Teamwork:[8.2,11,12.6,13.9],WorkRate:[9.1,12,13.5,14.4],LongThrows:[3.7,5.5,6.1,6.4],Eccentricity:[2.1,2.1,2.1,2.4],RushingOut:[2.1,2.1,2.1,1.8],Punching:[2.1,2.1,2,2.2],Acceleration:[12,12.5,13.6,15.5],FreeKicks:[5.5,7.7,8.9,10.4],Strength:[8.5,11.4,13,13.8],Stamina:[9.7,11.6,13.2,14.3],Pace:[11.8,12.7,13.8,15.6],JumpingReach:[10,11.8,12.5,12.5],Leadership:[7.8,8.4,9.3,11],Balance:[9.5,11.7,13.1,14.9],Bravery:[7.8,11,12.8,13.2],Aggression:[9.8,10.9,12.2,12.8],Agility:[11.1,11.8,13,15.2],NaturalFitness:[12.1,12.3,13.2,14.9],Determination:[11,12.4,14,15.3],Composure:[10.2,11.6,13,14.9],Concentration:[6.9,10.1,11.8,13.1]},W:{Crossing:[10,11.1,12.2,13.9],Dribbling:[10.7,12.4,14,16.4],Finishing:[9,10.3,11.6,14.1],Heading:[6.4,7.9,8.4,9.2],LongShots:[7.1,10,11.6,13.1],Marking:[5.4,6.7,7.5,8],OffTheBall:[10.2,12,13.3,15.3],Passing:[9.8,11.3,12.5,14.6],PenaltyTaking:[5.4,8.8,10.8,12.4],Tackling:[5.5,6.9,7.7,7.8],Vision:[8.4,10.9,12.6,14.9],Handling:[2.1,2.1,2,2.3],AerialReach:[2.1,2.1,2.1,2],CommandOfArea:[2.1,2.1,2.1,1.9],Communication:[2.1,2.1,2.1,2.2],Kicking:[2.1,2.1,2.1,2],Throwing:[2.1,2.1,2.1,2.1],Anticipation:[8.7,11,12.5,14.3],Decisions:[9.7,10.8,12,14],OneOnOnes:[2.1,2.1,2.1,2.2],Positioning:[5.8,7.5,8.4,8.7],Reflexes:[2.1,2.1,2.1,2],FirstTouch:[10.8,12,13.4,15.8],Technique:[11,12.5,14.1,16.2],Flair:[11.5,12.7,14.2,16],Corners:[6.8,9.3,10.8,12.3],Teamwork:[9,10.7,12,13.2],WorkRate:[10.1,11.6,12.9,14.1],LongThrows:[4.7,6.2,6.6,6.2],Eccentricity:[2.1,2.1,2.1,2.2],RushingOut:[2.1,2.1,2.1,1.8],Punching:[2.1,2.1,2.1,2],Acceleration:[12.5,13.2,14.5,15.7],FreeKicks:[6.1,8.8,10.4,11.8],Strength:[6.6,8.9,10.1,11.6],Stamina:[10,11.4,12.9,14.1],Pace:[12.3,12.9,14.1,15.2],JumpingReach:[7.9,8.6,8.9,9.6],Leadership:[7.7,7.8,8.5,10.4],Balance:[9.5,11.1,12.6,14.7],Bravery:[7.5,9.8,11.3,12],Aggression:[9.6,10.1,11.1,11.6],Agility:[12.2,12.9,14.4,16.2],NaturalFitness:[12,12.2,13.1,14.4],Determination:[11.1,12.1,13.4,15.2],Composure:[8.4,10.7,12.3,14.5],Concentration:[6.9,9.6,11.1,12.9]}};
const POS_GROUP_OF = { GK: 'GK', SW: 'DC', DC: 'DC', DL: 'FB', DR: 'FB', WBL: 'FB', WBR: 'FB',
  DM: 'DM', MC: 'MC', ML: 'W', MR: 'W', AML: 'W', AMR: 'W', AMC: 'AMC', ST: 'ST' };
const posGroupsOf = p => {
  const gs = [...new Set((p.posArr || []).map(x => POS_GROUP_OF[x]).filter(g => POS_ATTR_PROFILE[g]))];
  return gs.length ? gs : ['ALL'];
};
// Positienorm voor attribuut-ankers a op willekeurige CA (lineair tussen ankers, doorgetrokken erbuiten).
function posNorm(a, ca) {
  if (ca <= 80) return a[0] - (80 - ca) * (a[1] - a[0]) / 30;
  if (ca >= 170) return a[3] + (ca - 170) * (a[3] - a[2]) / 30;
  for (let i = 1; i < 4; i++)
    if (ca <= POS_CA_ANCHORS[i]) return a[i - 1] + (a[i] - a[i - 1]) * (ca - POS_CA_ANCHORS[i - 1]) / 30;
  return a[3];
}

function projectAttrs(p) {
  if (!p.pa || !p.ca || p.pa <= p.ca || !p.attrs) return null;
  const age = getAge(p);
  // De positienormen zijn al "leeftijdsecht" (CA-180-spelers zijn doorgaans ~25): een jonge
  // speler groeit er vanzelf realistisch fysiek bij. Alleen voor oudere spelers met rest-
  // potentieel dempen we fysieke groei extra — die komt er niet meer.
  const physF = age == null || age <= 23 ? 1 : physGrowthFactor(age);
  const groups = posGroupsOf(p);
  const keys = Object.keys(p.attrs)
    .filter(k => !['Consistency', 'ImportantMatches', 'Versatility', 'InjuryProneness', 'Dirtiness'].includes(k));
  const proj = {};
  for (const k of keys) {
    let d = 0, n = 0;
    for (const g of groups) {
      const a = POS_ATTR_PROFILE[g][k];
      if (a) { d += Math.max(0, posNorm(a, p.pa) - posNorm(a, p.ca)); n++; }
    }
    d = n ? d / n : 0;
    if (PHYS_ATTRS.has(k)) d *= physF;
    proj[k] = Math.min(20, Math.round(p.attrs[k] + d));
  }
  return proj;
}
function showDetail(p) {
  state.selected = p;
  renderVisible();
  $('detail').classList.remove('hidden');
  const isPlayer = !!p.attrs;
  const on = state.shortlist.has(p.id);
  const ev = estValue(p);
  const valTxt = ev.v == null || ev.v === 0 ? '–' : ev.est ? `${fmtMoney(ev.lo)} – ${fmtMoney(ev.hi)}` : fmtMoney(ev.v);

  const gauge = (!state.hideCapa && (p.ca != null || p.pa != null)) ? `<div class="capa">
    <div class="capa-nums"><span><b>CA</b> <span class="ca-bar">${p.ca ?? '–'}</span></span><span><b>PA</b> <span class="pa-bar">${p.pa ?? '–'}</span></span></div>
    <div class="capa-track"><span class="capa-pa" style="width:${Math.min(100, (p.pa ?? 0) / 2)}%"></span><span class="capa-ca" style="width:${Math.min(100, (p.ca ?? 0) / 2)}%"></span></div>
  </div>` : '';
  const inCmp = state.compare.includes(p.id);
  let html = `<h2>${escHtml(p.name)} <span class="detail-star ${on ? 'on' : ''}" data-star="${p.id}">${starSvg(18)}</span>
    <button class="copybtn" title="Kopieer naam">${icon('clipboard', 13)}</button>
    <button class="cmpbtn ${inCmp ? 'on' : ''}" title="${t('addCompare')}">${icon('compare', 13)}</button></h2>
  <div class="sub">${getAge(p)} · ${natsLabel(p)}${isEu(p) ? ' · <span class="eu-yes">EU</span>' : ''} · ${clubLabel(p)}${p.div ? ` · <span class="dim">${escHtml(p.div)}</span>` : ''}</div>
  ${gauge}
  <div class="kv">
    ${isPlayer ? `<div><b>${t('c_pos')}</b> ${p.pos || '–'}</div><div><b>${t('foot')}</b> ${footLabel(p)}</div>` : `<div><b>${t('c_role')}</b> ${p.job || '–'}</div>`}
    <div><b>${t('estval')}</b> ${valTxt}</div>
    ${!state.hideCapa && feeEstimate(p).v > 0 ? `<div><b>${t('c_fee')}</b> ${fmtMoney(feeEstimate(p).v * 0.85)} – ${fmtMoney(feeEstimate(p).v * 1.15)}</div>` : ''}
    <div><b>${t('wageLabel')}</b> ${fmtMoney(p.wage)}</div>
    ${p.worldRep ? `<div><b>${t('repLabel')}</b> ${p.worldRep}</div>` : ''}
    <div><b>${t('contractLabel')}</b> ${fmtDate(p.expires)}</div>
    ${p.height ? `<div><b>${t('height')}</b> ${p.height} cm</div>` : ''}
    ${isPlayer && !state.hideCapa && metaScore(p) != null ? `<div title="${t('metaHint')}"><b>${t('metaLabel')}</b> <span class="${roleClass(metaScore(p))}">${metaScore(p).toFixed(1)}</span> <span class="col-help">?</span></div>` : ''}
  </div>`;

  const flags = [];
  if (isFree(p)) flags.push(`<span class="pill">${t('tag_free')}</span>`);
  if (p.listed) flags.push(`<span class="pill warn">${t('tag_listed')}</span>`);
  if (p.setForRelease) flags.push(`<span class="pill warn">${t('tag_rel')}</span>`);
  if (p.notForSale) flags.push(`<span class="pill">${t('tag_nfs')}</span>`);
  if (isAttainable(p)) flags.push(`<span class="pill good" title="${t('attainHint')}">${t('attainable')}</span>`);
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
    const proj = state.showPot ? projectAttrs(p) : null;
    const col = {};
    for (const [gk, keys] of groups) {
      const rows = sortByLabel(keys).filter(k => p.attrs[k] != null);
      col[gk] = !rows.length ? '' : `<div class="attr-col"><h3>${t(gk)}</h3>` + rows.map((k, idx) => {
        const raw = p.attrs[k];
        const shown = proj ? (proj[k] ?? raw) : raw;
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
    // Overige verborgen kenmerken. Bij InjuryProneness/Dirtiness is HOOG slecht → kleur omkeren.
    const hd = [['Consistency', true], ['ImportantMatches', true], ['Versatility', true],
      ['InjuryProneness', false], ['Dirtiness', false]]
      .map(([k, good]) => [k, p.attrs ? p.attrs[k] : 0, good]).filter(x => x[1] > 0);
    const hidHtml = hd.length ? `<div class="attr-col"><h3>${t('hiddenTitle')}</h3>` + hd.map(([k, v, good], idx) => {
      const cls = good ? attrClass(v) : attrClass(21 - v);   // "slecht-hoog": omgekeerde kleur
      return `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${t('a_' + k)}</span><span class="v ${cls}">${v}</span></div>`;
    }).join('') + '</div>' : '';
    // Grid: links Technisch/Keepen + Standaardsituaties (Mentaal loopt ernaast over 2 rijen),
    // onderste rij links Fysiek + Verborgen kenmerken, rechts Persoonlijkheid.
    const techKey = isGk ? 'g_goalkeeping' : 'g_technical';
    html += `<div class="attr-grid">
      <div style="grid-area:tech">${col[techKey] || ''}</div>
      <div style="grid-area:sp">${col['g_setpieces'] || ''}</div>
      <div style="grid-area:ment">${col['g_mental'] || ''}</div>
      <div style="grid-area:phys">${col['g_physical'] || ''}${state.hideCapa ? '' : hidHtml}</div>
      <div style="grid-area:pers">${state.hideCapa ? '' : persHtml}</div>
    </div>`;
  } else if (p.staffAttrs) {
    html += `<div class="attr-cols"><div class="attr-col"><h3>${t('staffAttrs')}</h3>` +
      Object.entries(p.staffAttrs).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v], idx) =>
        `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${k.replace(/_/g, ' ')}</span><span class="v ${attrClass(v)}">${v}</span></div>`).join('') + '</div></div>';
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

// ---------- update-melding ----------
// Checkt hooguit 1x per ~20 uur de laatste GitHub-release (API staat CORS toe) en toont
// een wegklikbaar pilletje in de topbar bij een nieuwere versie. Offline/fout = stil.
async function checkUpdate() {
  try {
    let chk = {};
    try { chk = JSON.parse(localStorage.getItem('fmss_updchk') || '{}'); } catch { }
    if (!chk.at || Date.now() - chk.at > 20 * 3600e3) {
      const res = await fetch('https://api.github.com/repos/mavarobli/FMSuperScout/releases/latest');
      if (!res.ok) return;
      chk = { at: Date.now(), tag: (await res.json()).tag_name };
      localStorage.setItem('fmss_updchk', JSON.stringify(chk));
    }
    if (!chk.tag) return;
    const norm = v => String(v).replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    const [l, c] = [norm(chk.tag), norm(APP_VERSION)];
    const newer = l[0] !== c[0] ? l[0] > c[0] : l[1] !== c[1] ? l[1] > c[1] : (l[2] || 0) > (c[2] || 0);
    if (!newer || localStorage.getItem('fmss_upd_dismiss') === chk.tag) return;
    const el = $('update-pill');
    el.innerHTML = `<a href="${REPO_URL}/releases/latest" target="_blank" rel="noopener">${tf('updateAvail', { v: chk.tag })}</a>
      <button title="${t('donateLater')}">${icon('x', 10)}</button>`;
    el.classList.remove('hidden');
    el.querySelector('button').onclick = () => { localStorage.setItem('fmss_upd_dismiss', chk.tag); el.classList.add('hidden'); };
  } catch { }
}

// ---------- probleem melden ----------
// Opent een voorgevuld GitHub-issue met de omgevingsinfo die we hebben; de gebruiker
// hoeft alleen het verhaal en de diagnostiekbestanden toe te voegen.
function reportBug() {
  const m = state.meta || {};
  const body = [
    '### What happened?', '', '_Describe the problem here._', '',
    '### Environment (auto-filled)',
    `- FMSuperScout app: v${APP_VERSION}`,
    `- Plugin: ${m.pluginVersion || 'unknown (dump predates v0.1.34 or no dump loaded)'}`,
    `- FM game version: ${m.gameVersion || 'unknown'} (supported: ${m.supportedVersion || '?'}, ok: ${m.versionOk ?? '?'})`,
    `- Players/staff loaded: ${state.players.length} / ${state.staff.length}`,
    `- Platform: Steam / Epic / Game Pass? _(fill in)_`,
    '',
    '### Attach these files (important!)',
    'From `%LOCALAPPDATA%\\FMSuperScout\\`: `diagnostics.txt` and `status.json`.',
    'From your FM folder: `BepInEx\\LogOutput.log` (if it exists).',
  ].join('\n');
  window.open(`${REPO_URL}/issues/new?title=${encodeURIComponent('[bug] ')}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
}

// ---------- steun (Ko-fi), sympathiek en niet-opdringerig ----------
const KOFI = 'https://ko-fi.com/fmsuperscout';
function openKofi() { window.open(KOFI, '_blank', 'noopener'); }
// Wegklikbare nudges op mijlpalen van echt gebruik (25/500/2000 bekeken profielen),
// max 3 ooit en daarna definitief stil. Minimaal 14 dagen tussen twee nudges, zodat
// een marathonsessie er nooit twee achter elkaar triggert. 'fmss_donate' telt hoeveel
// er getoond zijn (oude installs met '1' vallen automatisch in fase 2).
const DONATE_MILESTONES = [25, 500, 2000];
function maybeDonateNudge() {
  const stage = +localStorage.getItem('fmss_donate') || 0;
  if (stage >= DONATE_MILESTONES.length) return;
  const n = (+localStorage.getItem('fmss_uses') || 0) + 1;
  localStorage.setItem('fmss_uses', String(n));
  if (n < DONATE_MILESTONES[stage]) return;
  const last = +localStorage.getItem('fmss_donate_at') || 0;
  if (stage > 0 && Date.now() - last < 14 * 864e5) return;
  localStorage.setItem('fmss_donate', String(stage + 1));
  localStorage.setItem('fmss_donate_at', String(Date.now()));
  const sfx = stage === 0 ? '' : String(stage + 1);   // '', '2', '3' → donateTitle/donateTitle2/...
  const el = $('donate-nudge');
  el.innerHTML = `<button class="dn-x" title="${t('donateLater')}">${icon('x', 12)}</button>
    <div class="dn-title">☕ ${t('donateTitle' + sfx)}</div>
    <div class="dn-text">${t('donateBody' + sfx)}</div>
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
    return `<span class="ct-chip" data-id="${id}">${p ? escHtml(p.name) : '?'}<span class="x" data-rm="${id}">${icon('x', 10)}</span></span>`;
  }).join('');
  tray.innerHTML = `<div class="ct-label">${t('comparing')}</div>${chips}` +
    `<button class="ct-go" ${state.compare.length < 2 ? 'disabled' : ''}>${t('compare')} (${state.compare.length})</button>` +
    `<button class="ct-clear" title="${t('clear')}">${icon('x', 13)}</button>`;
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
  const n = players.length;
  const two = n === 2;   // bij precies 2 spelers is er een Δ-kolom; bij 3 markeert de rij de winnaar

  // Beste/slechtste per rij (hi=false: laag is beter; hi=null: neutraal, geen markering).
  const marksOf = (vals, hi) => {
    const nums = vals.filter(v => v != null);
    if (hi == null || nums.length < 2) return vals.map(() => '');
    const best = hi ? Math.max(...nums) : Math.min(...nums);
    const worst = hi ? Math.min(...nums) : Math.max(...nums);
    if (best === worst) return vals.map(() => '');
    return vals.map(v => v == null ? '' : v === best ? 'cmp-best' : v === worst ? 'cmp-worst' : '');
  };
  // Δ-cel (alleen bij 2 spelers): speler 1 − speler 2, groen als speler 1 beter af is.
  const deltaCell = (vals, hi, fmtAbs) => {
    if (!two) return '';
    const [a, b] = vals;
    if (a == null || b == null) return '<div class="cmp-cell cmp-delta"><span class="dim">·</span></div>';
    const d = a - b;
    const cls = d === 0 || hi == null ? 'cmp-dzero' : (d > 0) === (hi !== false) ? 'cmp-dpos' : 'cmp-dneg';
    const txt = d === 0 ? '=' : (d > 0 ? '+' : '−') + fmtAbs(Math.abs(d));
    return `<div class="cmp-cell cmp-delta"><span class="${cls}">${txt}</span></div>`;
  };
  // Generieke rij. opts: hi (true/false/null), fmt, dec (decimalen), attr (FM-kleur),
  // invert (hoog=slecht → omgekeerde kleur, bv. blessuregevoeligheid).
  const row = (label, vals, opts = {}) => {
    const hi = 'hi' in opts ? opts.hi : true;
    const fmtV = opts.fmt || (v => opts.dec ? v.toFixed(opts.dec) : String(v));
    const marks = marksOf(vals, hi);
    const cells = vals.map((v, i) => {
      if (v == null) return '<div class="cmp-cell"><span class="dim">·</span></div>';
      const color = opts.attr ? ' ' + (opts.invert ? attrClass(21 - v) : attrClass(v)) : '';
      return `<div class="cmp-cell"><span class="v${color} ${marks[i]}">${fmtV(v)}</span></div>`;
    }).join('');
    return `<div class="cmp-row"><div class="cmp-lbl">${label}</div>${cells}${deltaCell(vals, hi, fmtV)}</div>`;
  };
  const textRow = (label, vals) => `<div class="cmp-row"><div class="cmp-lbl">${label}</div>` +
    vals.map(v => `<div class="cmp-cell">${v ? escHtml(v) : '<span class="dim">·</span>'}</div>`).join('') +
    (two ? '<div class="cmp-cell cmp-delta"></div>' : '') + '</div>';

  // ----- winsttelling (voor het kop-badge): bij hoeveel attributen uniek de beste? -----
  const isGk = players.every(p => (p.posArr || []).includes('GK'));
  const groups = isGk ? ATTR_GROUPS_GK : ATTR_GROUPS_OUTFIELD;
  const wins = players.map(() => 0);
  for (const [, keys] of groups)
    for (const k of keys) {
      const vals = players.map(p => p.attrs ? p.attrs[k] : null);
      const nums = vals.filter(v => v != null);
      if (nums.length < 2) continue;
      const best = Math.max(...nums);
      const idx = vals.map((v, i) => v === best ? i : -1).filter(i => i >= 0);
      if (idx.length === 1 && best !== Math.min(...nums)) wins[idx[0]]++;
    }

  // ----- kop: eigen sticky grid boven de hele scroll (namen + stamdata altijd zichtbaar) -----
  const headRow = `<div class="cmp-row cmp-head"><div class="cmp-lbl"></div>` +
    players.map((p, i) => {
      const ev = estValue(p);
      const val = ev.v > 0 ? fmtMoney(ev.v) : null;
      const bits = [val, p.wage > 0 ? fmtMoney(p.wage) + ' p/w' : null,
        p.expires ? String(p.expires).slice(0, 4) : null].filter(Boolean).join(' · ');
      return `<div class="cmp-cell"><div class="cmp-name">${escHtml(p.name)}</div>` +
        `<div class="cmp-meta">${getAge(p)} · ${p.pos || p.job || ''} · ${p.club ? escHtml(p.club) : '–'}` +
        `${bits ? `<br>${bits}` : ''}` +
        `${p.attrs ? `<br><span class="cmp-winsb">${tf('cmpWinsBadge', { n: wins[i] })}</span>` : ''}</div></div>`;
    }).join('') +
    (two ? `<div class="cmp-cell cmp-delta" title="${t('cmpDeltaHint')}">Δ</div>` : '') + '</div>';

  // ----- kerngetallen -----
  let body = '';
  if (!state.hideCapa) {
    body += row('CA', players.map(p => p.ca));
    body += row('PA', players.map(p => p.pa));
    body += row(t('c_meta'), players.map(p => metaScore(p)), { fmt: v => v.toFixed(1) });
  }
  body += row(t('cmpValue'), players.map(p => estValue(p).v), { fmt: fmtMoney, hi: null });
  if (!state.hideCapa)
    body += row(t('c_fee'), players.map(p => { const f = feeEstimate(p); return f.v > 0 ? f.v : null; }), { fmt: fmtMoney, hi: false });
  body += row(t('wageLabel'), players.map(p => p.wage), { fmt: fmtMoney, hi: false });
  body += row(t('c_age'), players.map(p => getAge(p)), { hi: false });
  body += row(t('height'), players.map(p => p.height || null), { fmt: v => v + ' cm', hi: null });
  body += textRow(t('contractLabel'), players.map(p => fmtDate(p.expires)));
  body += textRow(t('foot'), players.map(p => footLabel(p)));
  const roles = players.map(bestRoleScore);
  body += `<div class="cmp-row"><div class="cmp-lbl">${t('cmpTopRole')}</div>` +
    roles.map(r => `<div class="cmp-cell">${r ? `${r.name}<br><b class="${roleClass(r.score)}">${r.score.toFixed(1)}</b>` : '<span class="dim">·</span>'}</div>`).join('') +
    (two ? '<div class="cmp-cell cmp-delta"></div>' : '') + '</div>';

  // ----- attributen: twee kolommen met panelen, rijen in FM-stijl -----
  // Bij 2 spelers per rij: naam | waarde1 | vergelijkbalkje | waarde2 (zoals FM zelf):
  // het balkje wijst met kleur en lengte naar wie beter is (groen = speler 1, blauw =
  // speler 2), lengte ∝ het verschil. Bij 3 spelers: naam | w1 w2 w3 met winnaar-markering.
  const cmpBar = (a, b, hi, dec) => {
    if (a == null || b == null || hi == null)
      return '<span class="cbar" title="–"><i class="cb-tick"></i></span>';
    const d = a - b;
    const p1beter = (d > 0) === (hi !== false);
    const pct = Math.min(100, Math.round(Math.abs(d) / 8 * 100));   // 8 punten verschil = vol
    const dTxt = d === 0 ? '=' : (d > 0 ? '+' : '−') + (dec ? Math.abs(d).toFixed(dec) : Math.abs(d));
    return `<span class="cbar" title="Δ ${dTxt}"><i class="cb-tick"></i>` +
      (d === 0 ? '' : `<i class="${p1beter ? 'cb-l' : 'cb-r'}" style="width:${Math.max(6, pct / 2)}%"></i>`) + '</span>';
  };
  const attrPanelRow = (label, vals, opts = {}) => {
    const hi = 'hi' in opts ? opts.hi : true;
    const marks = marksOf(vals, hi);
    const fmtV = v => opts.dec ? v.toFixed(opts.dec) : String(v);
    const cellV = (v, i) => v == null ? '<span class="cpv dim">·</span>' :
      `<span class="cpv v ${opts.invert ? attrClass(21 - v) : attrClass(v)} ${marks[i]}">${fmtV(v)}</span>`;
    if (two)
      return `<div class="cpr${opts.foot ? ' cpr-foot' : ''}"><span class="cpl">${label}</span>${cellV(vals[0], 0)}${cmpBar(vals[0], vals[1], hi, opts.dec)}${cellV(vals[1], 1)}</div>`;
    return `<div class="cpr cpr3${opts.foot ? ' cpr-foot' : ''}"><span class="cpl">${label}</span>${vals.map((v, i) => cellV(v, i)).join('')}</div>`;
  };
  const panel = (title, rowsHtml) => rowsHtml ? `<div class="cmpg"><h3>${title}</h3>${rowsHtml}</div>` : '';
  const buildGroup = (gkey, keys) => {
    const present = sortByLabel(keys || []).filter(k => players.some(p => p.attrs && p.attrs[k] != null));
    if (!present.length) return '';
    let rows = present.map(k =>
      attrPanelRow(attrName(k), players.map(p => p.attrs ? p.attrs[k] : null))).join('');
    // FM-stijl voetregel: groepsgemiddelde met eigen vergelijkbalkje.
    if (present.length >= 3) {
      const avgs = players.map(p => {
        const vs = present.map(k => p.attrs ? p.attrs[k] : null).filter(v => v != null);
        return vs.length ? Math.round(10 * vs.reduce((s, v) => s + v, 0) / vs.length) / 10 : null;
      });
      rows += attrPanelRow(t('avgLabel'), avgs, { dec: 1, foot: true });
    }
    return panel(t(gkey), rows);
  };

  let panels = '';
  if (players.some(p => p.attrs)) {
    const gmap = Object.fromEntries(groups.map(([k, keys]) => [k, keys]));
    // Verborgen kenmerken + persoonlijkheid (zelfde zichtbaarheidsregel als het detailpaneel).
    let hidPanel = '', persPanel = '';
    if (!state.hideCapa) {
      const hid = [['Consistency', true], ['ImportantMatches', true], ['Versatility', true],
        ['InjuryProneness', false], ['Dirtiness', false]]
        .filter(([k]) => players.some(p => p.attrs && p.attrs[k] > 0));
      hidPanel = panel(t('hiddenTitle'), hid.map(([k, good]) =>
        attrPanelRow(t('a_' + k), players.map(p => p.attrs && p.attrs[k] > 0 ? p.attrs[k] : null),
          { hi: good, invert: !good })).join(''));
      const pers = [['ambition', true], ['professionalism', true], ['loyalty', null], ['pressure', true],
        ['temperament', true], ['sportsmanship', null], ['adaptability', true], ['controversy', false]]
        .filter(([k]) => players.some(p => p[k] > 0));
      persPanel = panel(t('personaTitle'), pers.map(([k, dir]) =>
        attrPanelRow(t(k), players.map(p => p[k] > 0 ? p[k] : null),
          { hi: dir, invert: dir === false })).join(''));
    }
    // Links de "lange" groepen (technisch/keepen + fysiek), rechts mentaal + standaard;
    // verborgen links en persoonlijkheid rechts houdt beide kolommen in balans.
    const leftStack = buildGroup(isGk ? 'g_goalkeeping' : 'g_technical', gmap[isGk ? 'g_goalkeeping' : 'g_technical'])
      + buildGroup('g_physical', gmap.g_physical) + hidPanel;
    const rightStack = buildGroup('g_mental', gmap.g_mental)
      + buildGroup('g_setpieces', gmap.g_setpieces) + persPanel;
    if (leftStack || rightStack)
      panels = `<div class="cmp-panels"><div>${leftStack}</div><div>${rightStack}</div></div>`;
  }

  const cols = two ? '130px 1fr 1fr 72px' : `130px repeat(${n}, 1fr)`;
  $('compare-inner').innerHTML =
    `<div class="cmp-top"><h2>${t('cmpTitle')}</h2><button id="cmp-close">${icon('x', 15)}</button></div>` +
    `<div class="cmp-scroll">` +
    `<div class="cmp-grid cmp-headgrid" style="grid-template-columns:${cols}">${headRow}</div>` +
    `<div class="cmp-grid" style="grid-template-columns:${cols}">${body}</div>${panels}</div>`;
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
      <div class="an-young">${t('anYoungTalent')}: ${yt ? `${escHtml(yt.name)} <span class="dim">(${getAge(yt)}${state.hideCapa ? '' : `, PA ${yt.pa || '·'}`})</span>` : t('anNone')}</div>
      ${x.rec ? `<div class="an-rec">${x.rec}</div>` : ''}
      ${x.scout ? `<button class="an-scout" data-grp="${x.g.id}">${t('anScout')} ${icon('arrowRight', 11)}</button>` : ''}
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
  showToast([...codes].join(', '), 'search');
}
$('detail-close').onclick = () => { $('detail').classList.add('hidden'); state.selected = null; renderVisible(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('detail-close').onclick(); });

// ---------- UI-bediening ----------
['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-meta-min', 'f-meta-max', 'f-price', 'f-fee', 'f-wage', 'f-nat'].forEach(id => {
  let tm; $(id).addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(applyFilters, 150); });
});
['f-eu', 'f-myclub', 'f-listed', 'f-contract', 'f-shortlist'].forEach(id => $(id).addEventListener('change', applyFilters));
$('btn-adv').onclick = advDialog;
$('f-staffrole').addEventListener('change', applyFilters);
// Divisie-zoekbalk: filter terwijl je typt + eigen suggestie-dropdown (app-stijl, i.p.v.
// de native datalist die als lichte "wolk" uit de donkere UI viel).
$('f-div').addEventListener('input', () => { renderDivSuggest(); applyFilters(); });
$('f-div').addEventListener('focus', renderDivSuggest);
$('f-div').addEventListener('blur', () => setTimeout(() => $('div-suggest').classList.add('hidden'), 120));
$('f-div').addEventListener('keydown', e => {
  const box = $('div-suggest');
  if (box.classList.contains('hidden')) return;
  const items = [...box.querySelectorAll('.ds-item')];
  if (!items.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    divSuggestSel = (divSuggestSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('sel', i === divSuggestSel));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const pick = items[divSuggestSel] || items[0];
    $('f-div').value = pick.dataset.v; box.classList.add('hidden'); applyFilters();
  } else if (e.key === 'Escape') {
    box.classList.add('hidden');
  }
});
$('f-interest').addEventListener('change', applyFilters);
$('f-role').addEventListener('change', () => {
  state.role = $('f-role').value;
  localStorage.setItem('fmss_role', state.role);
  if (state.role) { state.sortKey = 'role'; state.sortDir = -1; }        // meteen op rolscore sorteren
  else if (state.sortKey === 'role') { state.sortKey = 'ca'; state.sortDir = -1; }
  applyFilters();
  if (state.selected) showDetail(state.selected);
});

$('btn-clear').onclick = () => {
  document.querySelectorAll('#filters input[type=text], #filters input[type=number]').forEach(i => i.value = '');
  document.querySelectorAll('#filters input[type=checkbox]').forEach(i => i.checked = false);
  $('f-staffrole').value = ''; $('f-interest').value = '0'; $('f-contract').value = '';
  state.advF = []; saveAdv();
  activePos.clear();
  document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on'));
  state.presetSel = null; renderPresets();   // dropdown-label terug naar de placeholder
  applyFilters();
};
$('btn-sidebar').onclick = () => document.body.classList.toggle('sidebar-collapsed');
$('btn-export').onclick = exportShortlist;
$('btn-coffee').onclick = openKofi;
$('btn-report').onclick = reportBug;
$('es-report').onclick = reportBug;
checkUpdate();

// inklapbare filtersecties (voorkeur onthouden)
// Eerste gebruik (geen opgeslagen stand): secundaire secties dicht zodat de zijbalk op
// één scherm past (progressive disclosure). Eigen klikgedrag wordt daarna onthouden.
const rawSecs = localStorage.getItem('fmss_secs');
const collapsedSecs = new Set(rawSecs ? JSON.parse(rawSecs) : ['presets', 'role', 'financial', 'origin', 'availability']);
document.querySelectorAll('.fsection[data-sec]').forEach(sec => {
  const key = sec.dataset.sec;
  if (collapsedSecs.has(key)) sec.classList.add('collapsed');
  sec.querySelector('.fsec-head').addEventListener('click', () => {
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
  renderMyTeamChips();   // programmatisch aanvinken vuurt geen change-event → chips zelf tonen
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
  if (state.hideCapa) {   // bijbehorende filters leegmaken zodat ze niet stiekem filteren (ook meta/vraagprijs)
    ['f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-meta-min', 'f-meta-max', 'f-fee'].forEach(id => { const e = $(id); if (e) e.value = ''; });
    if (hiddenStatCol(state.sortKey)) { state.sortKey = state.mode === 'staff' ? 'wage' : 'value'; state.sortDir = -1; }
  }
  updateAdvBtn();   // regels op verborgen data tellen niet mee zolang de toggle uit staat
  if (state.mode === 'analysis') renderAnalysis(); else applyFilters();
  if (state.selected) showDetail(state.selected);
}
$('set-hidecapa').checked = !state.hideCapa;   // "tonen" = niet verbergen (standaard aan)
$('set-hidecapa').addEventListener('change', () => {
  state.hideCapa = !$('set-hidecapa').checked;
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
    if (!st.running) { b.className = 'scanning error'; b.innerHTML = bannerMsg('warning', t('fmNotRunning')); b.onclick = null; return; }
    await fetch('/api/refresh', { method: 'POST' });
    b.className = 'scanning'; b.innerHTML = bannerMsg('hourglass', t('reqSent')); b.onclick = null;
  } catch { showToast('!'); }
};

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('[data-i18n-html]').forEach(el => el.innerHTML = t(el.dataset.i18nHtml));
  document.querySelectorAll('[data-help]').forEach(el => el.title = t(el.dataset.help));   // ?-tooltips
  $('f-name').placeholder = t('searchph');
  $('btn-coffee').title = t('donateBtn');
  $('set-version').textContent = 'FMSuperScout v' + APP_VERSION;
  updateAdvBtn();
  renderDumpInfo();
  renderClubBadge();
  renderVerWarn();
  buildStaffRoles();
  buildRoleSelect();
  buildDivisions();
  renderPresets();
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
  $('f-meta-row').style.display = mode === 'staff' ? 'none' : '';   // meta-score bestaat niet voor staf
  $('sl-bar').classList.toggle('hidden', mode !== 'shortlist');
  renderMyTeamChips();
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

// ---------- teamchips: 1e/2e/jeugd binnen "Mijn club" ----------
// Zichtbaar zodra het "Mijn club"-vinkje aanstaat én de dump teamType-data heeft
// (plugin v0.1.10+); oudere dumps → chips blijven verborgen, filter doet niets.
function renderMyTeamChips() {
  const box = $('myteam-chips');
  const myClub = (state.meta.myClub || '').toLowerCase();
  const hasData = myClub && state.players.some(p => p.teamType != null && (p.club || '').toLowerCase() === myClub);
  const show = hasData && $('f-myclub').checked && state.mode !== 'staff';
  box.style.display = show ? '' : 'none';
  if (!show) return;
  const opts = [['all', t('mt_all')], ['first', t('mt_first')], ['res', t('mt_res')], ['youth', t('mt_youth')]];
  box.innerHTML = opts.map(([k, lbl]) =>
    `<button class="mt-chip ${state.myTeam === k ? 'on' : ''}" data-mt="${k}">${lbl}</button>`).join('');
  box.querySelectorAll('.mt-chip').forEach(b => b.onclick = () => {
    state.myTeam = b.dataset.mt;
    renderMyTeamChips();
    applyFilters();
  });
}
$('f-myclub').addEventListener('change', renderMyTeamChips);

// ---------- statuspolling (F9 / knop-feedback) ----------
let lastPluginState = null, lastDumpTime = null;
async function poll() {
  try {
    const st = await (await fetch('/api/status')).json();
    const b = $('banner');
    const pl = st.plugin;
    if (pl && pl.state === 'scanning') {
      b.className = 'scanning';
      // Plugin v0.1.2+ schrijft echte scanvoortgang (0..1) in status.json; oudere
      // plugins niet — dan de oude tekstbanner zonder balk.
      b.innerHTML = typeof pl.progress === 'number'
        ? bannerProgress('hourglass', t('dumping'), pl.progress)
        : bannerMsg('hourglass', t('dumping'));
    }
    else if (pl && pl.state === 'error') {
      b.className = 'scanning error';
      b.innerHTML = bannerMsg('warning', t('dumpError') + (pl.error ? ': ' + pl.error : ''));
      b.onclick = null;
    }
    else if (pl && pl.state === 'done') {
      if ((st.dumpTime && st.dumpTime !== lastDumpTime && lastDumpTime !== null) || lastPluginState === 'scanning') {
        // Nieuwe dump klaar → automatisch laden; de groene balk is alleen nog een
        // korte bevestiging (verdwijnt vanzelf), geen klik meer nodig.
        loadDump().then(() => {
          b.className = 'done';
          b.innerHTML = bannerMsg('check', `${t('dumpLoaded')} (${pl.players.toLocaleString()} · ${pl.staff.toLocaleString()})`);
          b.onclick = () => { b.className = 'hidden'; };
          setTimeout(() => { if (b.className === 'done') b.className = 'hidden'; }, 6000);
        });
      }
    }
    lastPluginState = pl ? pl.state : null;
    if (st.dumpTime) lastDumpTime = st.dumpTime;
  } catch { /* server weg */ }
  // Tijdens een scan sneller pollen zodat de voortgangsbalk vloeiend meeloopt.
  setTimeout(poll, lastPluginState === 'scanning' ? 750 : 2000);
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
