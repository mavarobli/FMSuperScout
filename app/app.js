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
  wagePer: localStorage.getItem('fmss_wageper') || 'w',   // salarisweergave: w(eek)/m(aand)/j(aar)
  lang: ['nl', 'en'].includes(localStorage.getItem('fmss_lang')) ? localStorage.getItem('fmss_lang') : 'nl',
  showPot: false,
  myTeam: 'all',   // teamchip bij "Mijn club": all | first | res | youth
  hideCapa: localStorage.getItem('fmss_hidecapa') === '1',
  hideMeta: localStorage.getItem('fmss_hidemeta') === '1',   // meta-score los van de overige verborgen stats
  role: localStorage.getItem('fmss_role') || '',
  compare: [],
  refYear: new Date().getFullYear(),
  refDoy: 183,
  shortlist: new Set(jread('fmss_shortlist', [])),
  colCfg: jread('fmss_cols', {}),  // per modus: {order:[], hidden:[]}
  colW: jread('fmss_colw', {}),    // per modus: {kolomkey: breedte px}
  advF: jread('fmss_adv', []),     // attribuutfilter-regels [{k,min,max}]
  advStaffF: jread('fmss_adv_staff', []), // staf attribuutfilter-regels [{k,min,max}]
  hist: null,        // {dates, refIdx, map: Map<uid,[caRef,paRef,firstIdx]>} uit /api/history/deltas
  histPeriod: localStorage.getItem('fmss_histperiod') || 'y1',
  bestXiFormation: '4-3-3',
  profThreshold: parseInt(localStorage.getItem('fmss_profthreshold') || '15', 10),
};

const mercatoDismissed = new Set();
// Beschadigde browseropslag (één ongeldige JSON-waarde) mag de app nooit vóór het
// foutscherm laten crashen: kapotte sleutel → standaardwaarde, opslag opgeruimd.
function jread(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { try { localStorage.removeItem(key); } catch { } return fallback; }
}
// Resten van het oude mijlpaal-nudgesysteem (25/500/2000 profielen), vervangen door het
// seizoensrapport. Eenmalig opruimen zodat oude installs geen dode sleutels meeslepen.
try { ['fmss_donate', 'fmss_donate_at', 'fmss_days'].forEach(k => localStorage.removeItem(k)); } catch { }
// FM26 rekent intern in GBP en toont andere valuta met eigen vaste koersen (bevroren rond
// de database-lock, medio 2025). €: gekalibreerd tegen in-game waarden (docs/value-model.md).
// $: xe.com-koers uit diezelfde periode; verifieer tegen FM's eigen USD-weergave.
const CUR_RATE = { '£': 1, '€': 1.16, '$': 1.35 };
// App-versie: bij een release gelijk trekken met MyAppVersion in installer/FMSuperScout.iss.
const APP_VERSION = '1.5.0';
const REPO_URL = 'https://github.com/mavarobli/FMSuperScout';

// ================= i18n =================
const I18N = {
  nl: {
    players: 'Spelers', staff: 'Staf', shortlist: 'Shortlist', searchph: 'Zoek naam of club',
    settings: 'Instellingen', langLabel: 'Taal', curLabel: 'Valuta',
    showHidden: 'Verborgen stats tonen', showMeta: 'Meta-score tonen',
    profileMode: 'Spelersprofiel', profSide: 'Rechts', profPopup: 'Popup',
    devTitle: 'Ontwikkeling',
    cardBtnTip: 'Spelerskaart opslaan (PNG)', cardSaved: 'Kaart opgeslagen in Downloads',
    donateBtn: 'Steun FMSuperScout',
    seasonTitle: 'Dat was seizoen {s}',
    seasonStatProfiles: '{n} profielen bekeken', seasonStatLoads: '{n}× de database geladen',
    seasonStatCards: '{n} spelerskaarten gedeeld', seasonStatShort: '{n} op de shortlist',
    seasonAsk: 'FMSuperScout deed het hele seizoen gratis mee. Een koffie is z\'n complete jaarsalaris.',
    alreadyDonated: 'Al gedoneerd?', neverAsk: 'Vraag het niet meer',
    supporterThanks: 'Dank je wel! Je hoort er niets meer over.',
    donateCta: '☕ Trakteer', donateLater: 'Later',
    position: 'Positie', clear: 'wis', staffrole: 'Staf-rol', quality: 'Kwaliteit & leeftijd',
    age: 'Leeftijd', financial: 'Financieel', maxvalue: 'Max. waarde', maxfee: 'Max. vraagprijs', maxwage: 'Max. loon',
    esSetupTitle: 'Start Football Manager 26 eerst een keer',
    esSetupBody: 'De eerste start na de installatie duurt 1 tot 3 minuten langer en toont een zwart consolevenster. Dat hoort zo: de mod-laag bouwt eenmalig zijn bestanden. Laat het venster open staan, ook als FM lijkt te hangen.',
    esSetupHint: 'Daarna laad je je save en druk je op F9. De volgende keren start FM gewoon weer normaal.',
    devDeltaHint: 'Verandering over de getoonde periode: de laatste meting min de eerste. Groen is vooruitgang, rood achteruitgang.',
    c_growth: 'Groei', grNew: 'nieuw', development: 'Ontwikkeling', histPeriod: 'Periode',
    hp_last: 'Sinds vorige dump', hp_m6: 'Afgelopen 6 maanden', hp_y1: 'Afgelopen jaar',
    hp_season: 'Dit seizoen', hp_all: 'Sinds we meten', growthRange: 'Groei', onlyNew: 'Alleen nieuwe spelers',
    growthHint: 'CA-verandering sinds de gekozen peildatum, gemeten uit je eigen dumps. Groen = groei, rood = verlies, "nieuw" = bestond toen nog niet.\n\nElke F9 voegt een meetpunt toe: hoe langer je de tool gebruikt, hoe verder je terugkijkt.',
    onlyNewHint: 'Spelers die er op de peildatum nog niet waren. Meestal jeugdspelers uit een intake, soms iemand die vanuit een niet-geladen competitie jouw database in komt.',
    intakeTitle: 'Jeugdintake: {n} nieuwe spelers wereldwijd', intakeBest: 'Beste vooruitzicht: {p}',
    intakeShow: 'Toon de intake',
    physical: 'Fysiek', heightCm: 'Lengte (cm)', wonderkidOnly: 'Alleen wonderkids',
    wonderkidHint: 'Hoogstens 21 jaar, PA 150 of hoger en nog minstens 25 punten groei over (PA min CA). Dezelfde grens als het gouden randje op de spelerskaart.',
    origin: 'Herkomst', originComp: 'Herkomst & competitie', nat: 'Nationaliteit', euonly: 'Alleen EU/EEA', availability: 'Beschikbaarheid',
    interestmin: 'Interesse ≥', all: 'Alle', attainable: 'Beschikbaar', listed: 'Op transferlijst',
    tstatus: 'Transferstatus', tsSale: 'Te koop', tsLoan: 'Te huur', tsAny: 'Te koop of te huur',
    attainHint: 'Kan hij weg bij zijn club? Op de transferlijst, aangeboden, clubloos of contract loopt binnen 12 maanden af (en niet "niet te koop"). Zegt niets over of hij naar JOU wil; dat is Interesse.',
    exp6: '< 6 mnd', exp12: '< 1 jaar', free: 'Clubloos', myclub: 'Mijn club', contractF: 'Contract',
    advBtn: 'Attribuutfilter', advTitle: 'Filter op attributen', advSearch: 'Kies of typ een attribuut…',
    advAdd: '+ attribuut', advClear: 'Wissen', advDone: 'Klaar', advMin: 'min', advMax: 'max', advColAttr: 'Attribuut',
    reportBug: 'Probleem melden…', esReportHint: 'F9 gedrukt maar geen data?', updateAvail: 'Update {v} beschikbaar',
    updDl: 'Update downloaden… {pct}%', updVerify: 'Download controleren…',
    updLaunch: 'Installer gestart. Volg de stappen; de app start daarna opnieuw.',
    updErr: 'Updaten mislukt. Open de downloadpagina',
    updCheckBtn: 'Zoek updates', updChecking: 'Zoeken…',
    updNone: 'Je bent up-to-date (v{v})', updFound: 'Update {v} beschikbaar — zie de melding bovenin',
    updCheckErr: 'Controleren mislukt. Ben je online?',
    onlyshortlist: 'Alleen shortlist', clearfilters: 'Filters wissen', fetch: 'Nieuwe data',
    nodata: 'Nog geen data geladen', exportcsv: 'Shortlist exporteren (CSV)',
    results: 'resultaten', c_name: 'Naam', c_age: 'Lft', c_pos: 'Positie', c_club: 'Club', c_nat: 'Nat',
    c_value: 'Waarde', c_fee: 'Vraagprijs', c_wage: 'Salaris', c_expires: 'Contract tot', c_interest: 'Interesse',
    c_status: 'Status', c_role: 'Rol', foot: 'Voet', footR: 'Rechts', footL: 'Links', footB: 'Beide', height: 'Lengte', repLabel: 'Reputatie',
    c_clubrep: 'Clubrep.', c_worldrep: 'Wereldrep.', c_div: 'Divisie',
    estval: 'Gesch. waarde', wageLabel: 'Salaris', contractLabel: 'Contract tot', free_l: 'transfervrij',
    int_big: 'Groot', int_ok: 'Redelijk', int_small: 'Klein', int_no: 'Nee', interestTitle: 'Interesse-inschatting',
    interestHint: 'Wil deze speler naar jouw club? Geschat uit reputatieverschil, salaris, ambitie, loyaliteit, leeftijd en beschikbaarheid. FIFA-artikel 19 telt mee voor niet-EU-spelers onder de 18.\n\nSchatting, geen FM-getal: FM rekent pas tijdens de onderhandeling en weegt dan ook jouw bod. "Klein" kan bij een sterk bod alsnog ja worden.',
    minorNote: 'Te jong voor een transfer.', minorIntlNote: 'Als niet-EU-minderjarige pas vanaf 18 haalbaar (FIFA-regel voor internationale transfers).',
    ambition: 'Ambitie', loyalty: 'Loyaliteit', professionalism: 'Professionaliteit', adaptability: 'Aanpassing',
    pressure: 'Druk', sportsmanship: 'Sportiviteit', temperament: 'Temperament', controversy: 'Controverse', determination: 'Vastberadenheid',
    personaTitle: 'Persoonlijkheid',
    hiddenTitle: 'Verborgen kenmerken', a_Consistency: 'Constantheid', a_ImportantMatches: 'Grote wedstrijden',
    a_InjuryProneness: 'Blessuregevoeligheid', a_Versatility: 'Veelzijdigheid', a_Dirtiness: 'Vals spel',
    showPot: 'Toon geschatte potentie', potNote: 'geschatte waarden op potentieel (PA)',
    loanOut: 'verhuurd aan {c}', loanIn: 'gehuurd van {c}', ownerLabel: 'Moederclub',
    clubless: 'clubloos', clubUnknown: 'onbekende club', copied: 'Gekopieerd',
    copyNameTip: 'Klik = kopieer naam', slEmpty: 'Shortlist leeg',
    copyBtnTip: 'Kopieer naam', clubNotRead: 'Club niet uitgelezen (rep {r})',
    reqSent: 'Spelersdata inlezen…',
    dumping: 'Spelersdata inlezen…', dumpReady: 'Nieuwe data klaar, klik om te laden',
    dumpLoaded: 'Nieuwe data geladen',
    dumpError: 'Uitlezen mislukt', fmNotRunning: 'Start eerst Football Manager 26 en laad je save.',
    dumpIncomplete: 'De dump is onvolledig (FM26 was er waarschijnlijk nog mee bezig). Probeer het zo opnieuw.',
    reqNoPickup: 'FM26 pikt het verzoek niet op. Is je save geladen? Probeer anders F9 in de game, of herstart FM26.',
    reqNoPickupMore: 'Blijft dit terugkomen? Lees de fix',
    scanStalled: 'De scan lijkt gestopt (is FM26 afgesloten of gecrasht?). Herstart FM26 en probeer opnieuw.',
    serverGone: 'Geen verbinding met de lokale server. Sluit dit venster en start FMSuperScout opnieuw.',
    tag_free: 'clubloos', tag_listed: 'transferlijst', tag_loan: 'te huur', tag_rel: 'vrijgegeven', tag_nfs: 'niet te koop',
    colHint: 'Sleep om te verplaatsen · rechtsklik voor kolommen', colsTitle: 'Kolommen tonen', colsReset: 'Standaard herstellen',
    g_technical: 'Technisch', g_setpieces: 'Standaardsituaties', g_mental: 'Mentaal', g_physical: 'Fysiek', g_goalkeeping: 'Keepen', g_coaching: 'Coaching', g_knowledge: 'Kennis & Scouting', g_gkCoaching: 'Keeper-coaching',
    staffAttrs: 'Staf-attributen',
    clearAll: 'alles wissen', chipSearch: 'Zoek',
    loading: 'Data laden…',
    parsing: 'Data verwerken…',
    esErrTitle: 'De dump kon niet geladen worden',
    esErrBig: 'Er staat wél een dump op schijf, maar de app kon hem niet inlezen. Dit gebeurt vooral bij een heel grote save (veel competities geladen tegelijk). Meld het met de knop hieronder, dan kijken we ernaar.',
    esErrSize: 'Dump op schijf: {mb} MB',
    esErrReload: 'Opnieuw proberen',
    esErrCrash: 'De vorige laadpoging is vastgelopen, waarschijnlijk door te weinig vrij geheugen. Tip: sluit FM26 (de dump staat al op schijf, de game is niet nodig om te kijken) en klik daarna op Opnieuw proberen.',
    step1: 'Start <b>FM26</b> en laad je save',
    step2: 'Druk in de game op <kbd>F9</kbd>, of klik hier op <b>Nieuwe data</b>',
    step3: 'De data laadt vanzelf zodra de dump klaar is',
    playersWord: 'spelers', staffWord: 'staf', clickClubFilter: 'Klik = filter op jouw club', repWord: 'reputatie',
    roleFit: 'Tactische rol', roleColHdr: 'Rol', roleAny: 'Geen rol gekozen', bestRoles: 'Beste rollen', profThresholdLabel: 'Min. basisplaats',
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
    scanDb: 'Database', dbMen: 'Mannen', dbWomen: 'Vrouwen', dbBoth: 'Beide',
    genderLabel: 'Geslacht', womenNote: 'Geldt vanaf de volgende scan (F9)',
    scanDbHint: 'Kies welk geslacht de scan inleest bij de volgende F9: alleen mannen, alleen vrouwen, of allebei. Bij Beide verschijnt een geslacht-filter in de zijbalk.',
    wagePer: 'Salaris per', perWeek: 'week', perMonth: 'maand', perYear: 'jaar',
    perWeekSuf: 'p/w', perMonthSuf: 'p/mnd', perYearSuf: 'p/jr', jobStaff: 'Staflid',
    c_meta: 'Meta', metaLabel: 'Meta-score', c_metapa: 'PA-meta',
    metaHint: 'Gewogen gemiddelde (1-20) van de attributen die volgens FM-Arena\'s match-engine-tests wedstrijden winnen; Snelheid en Versnelling tellen veruit het zwaarst. Keepers: eigen weging uit de keeperstest (Reflexen, Behendigheid).\n\n15+ elite, 13-15 sterk, 11-13 degelijk. Bij gelijke CA presteert de hoogste Meta meestal beter.',
    metaPaHint: 'Dezelfde meta-weging, toegepast op de attributen die hij op zijn potentieel (PA) naar verwachting haalt. Projectie volgt het groeiprofiel van zijn positiegroep; fysieke groei stopt na 23.\n\nUitontwikkeld = gelijk aan Meta. Sorteer hierop voor de meta-toppers van morgen.',
    verWarn: 'FM-versie {v} gedetecteerd; de uitlezing is geijkt op {s}.x. Data mogelijk onbetrouwbaar tot een update van FMSuperScout.',
    verWarnOldDump: 'Deze data komt van een oudere FMSuperScout-plugin. Alles werkt, maar haal verse data op (F9 in FM26 met je save geladen) voor het beste resultaat.',
  },
  en: {
    players: 'Players', staff: 'Staff', shortlist: 'Shortlist', searchph: 'Search name or club',
    settings: 'Settings', langLabel: 'Language', curLabel: 'Currency',
    showHidden: 'Show hidden stats', showMeta: 'Show meta score',
    profileMode: 'Player profile', profSide: 'Right side', profPopup: 'Popup',
    devTitle: 'Development',
    cardBtnTip: 'Save player card (PNG)', cardSaved: 'Card saved to Downloads',
    donateBtn: 'Support FMSuperScout',
    seasonTitle: 'That was season {s}',
    seasonStatProfiles: '{n} profiles viewed', seasonStatLoads: '{n} database loads',
    seasonStatCards: '{n} player cards shared', seasonStatShort: '{n} shortlisted',
    seasonAsk: 'FMSuperScout played the whole season for free. A coffee is its entire annual wage.',
    alreadyDonated: 'Already donated?', neverAsk: 'Don\'t ask again',
    supporterThanks: 'Thank you! You won\'t hear about this again.',
    donateCta: '☕ Buy me a coffee', donateLater: 'Maybe later',
    position: 'Position', clear: 'clear', staffrole: 'Staff role', quality: 'Quality & age',
    age: 'Age', financial: 'Financial', maxvalue: 'Max. value', maxfee: 'Max. asking price', maxwage: 'Max. wage',
    esSetupTitle: 'Start Football Manager 26 once first',
    esSetupBody: 'The first launch after installing takes 1 to 3 minutes longer and shows a black console window. That is normal: the mod layer builds its files once. Leave the window open, even if FM looks stuck.',
    esSetupHint: 'After that, load your save and press F9. Later launches are back to normal speed.',
    devDeltaHint: 'Change over the period shown: the last reading minus the first. Green is progress, red is decline.',
    c_growth: 'Growth', grNew: 'new', development: 'Development', histPeriod: 'Period',
    hp_last: 'Since last dump', hp_m6: 'Last 6 months', hp_y1: 'Last year',
    hp_season: 'This season', hp_all: 'Since tracking began', growthRange: 'Growth', onlyNew: 'Only new players',
    growthHint: 'CA change since the chosen reference date, measured from your own dumps. Green = growth, red = decline, "new" = did not exist yet.\n\nEvery F9 adds a data point: the longer you use the tool, the further back you can look.',
    onlyNewHint: 'Players who did not exist at the reference date. Usually youth intake players, sometimes someone arriving in your database from a league you had not loaded.',
    intakeTitle: 'Youth intake: {n} new players worldwide', intakeBest: 'Best prospect: {p}',
    intakeShow: 'Show the intake',
    physical: 'Physical', heightCm: 'Height (cm)', wonderkidOnly: 'Wonderkids only',
    wonderkidHint: 'Age 21 or under, PA of 150 or more, and at least 25 points of growth left (PA minus CA). Same bar as the gold trim on the player card.',
    origin: 'Origin', originComp: 'Origin & competition', nat: 'Nationality', euonly: 'EU/EEA only', availability: 'Availability',
    interestmin: 'Interest ≥', all: 'All', attainable: 'Available', listed: 'Transfer listed',
    tstatus: 'Transfer status', tsSale: 'For sale', tsLoan: 'For loan', tsAny: 'For sale or loan',
    attainHint: 'Can he leave his club? Transfer listed, offered out, a free agent, or contract ends within 12 months (and not "not for sale"). Says nothing about whether he wants to join YOU; that is Interest.',
    exp6: '< 6 mo', exp12: '< 1 yr', free: 'Free agent', myclub: 'My club', contractF: 'Contract',
    advBtn: 'Attribute filter', advTitle: 'Filter on attributes', advSearch: 'Pick or type an attribute…',
    advAdd: '+ attribute', advClear: 'Clear', advDone: 'Done', advMin: 'min', advMax: 'max', advColAttr: 'Attribute',
    reportBug: 'Report a problem…', esReportHint: 'Pressed F9 but no data?', updateAvail: 'Update {v} available',
    updDl: 'Downloading update… {pct}%', updVerify: 'Verifying download…',
    updLaunch: 'Installer started. Follow the steps; the app restarts afterwards.',
    updErr: 'Update failed. Open the download page',
    updCheckBtn: 'Check for updates', updChecking: 'Checking…',
    updNone: "You're up to date (v{v})", updFound: 'Update {v} available — see the notice up top',
    updCheckErr: 'Check failed. Are you online?',
    onlyshortlist: 'Shortlist only', clearfilters: 'Clear filters', fetch: 'New data',
    nodata: 'No data loaded yet', exportcsv: 'Export shortlist (CSV)',
    results: 'results', c_name: 'Name', c_age: 'Age', c_pos: 'Position', c_club: 'Club', c_nat: 'Nat',
    c_value: 'Value', c_fee: 'Asking price', c_wage: 'Wage', c_expires: 'Contract until', c_interest: 'Interest',
    c_status: 'Status', c_role: 'Role', foot: 'Foot', footR: 'Right', footL: 'Left', footB: 'Both', height: 'Height', repLabel: 'Reputation',
    c_clubrep: 'Club rep', c_worldrep: 'World rep', c_div: 'Division',
    estval: 'Est. value', wageLabel: 'Wage', contractLabel: 'Contract until', free_l: 'free',
    int_big: 'High', int_ok: 'Fair', int_small: 'Low', int_no: 'No', interestTitle: 'Interest estimate',
    interestHint: 'Would this player join your club? Estimated from the reputation gap, wages, ambition, loyalty, age and availability. FIFA article 19 applies to non-EU players under 18.\n\nAn estimate, not an FM number: FM decides during the actual negotiation and weighs your offer. A "Low" can still say yes to a strong bid.',
    minorNote: 'Too young for a transfer.', minorIntlNote: 'As a non-EU minor, only feasible from age 18 (FIFA rule on international transfers).',
    ambition: 'Ambition', loyalty: 'Loyalty', professionalism: 'Professionalism', adaptability: 'Adaptability',
    pressure: 'Pressure', sportsmanship: 'Sportsmanship', temperament: 'Temperament', controversy: 'Controversy', determination: 'Determination',
    personaTitle: 'Personality',
    hiddenTitle: 'Hidden', a_Consistency: 'Consistency', a_ImportantMatches: 'Big matches',
    a_InjuryProneness: 'Injury proneness', a_Versatility: 'Versatility', a_Dirtiness: 'Dirtiness',
    showPot: 'Show estimated potential', potNote: 'estimated values at potential (PA)',
    loanOut: 'on loan at {c}', loanIn: 'on loan from {c}', ownerLabel: 'Parent club',
    clubless: 'free agent', clubUnknown: 'unknown club', copied: 'Copied',
    copyNameTip: 'Click = copy name', slEmpty: 'Shortlist is empty',
    copyBtnTip: 'Copy name', clubNotRead: 'Club not resolved (rep {r})',
    reqSent: 'Reading player data…',
    dumping: 'Reading player data…', dumpReady: 'New data ready, click to load',
    dumpLoaded: 'New data loaded',
    dumpError: 'Read failed', fmNotRunning: 'Start Football Manager 26 and load your save first.',
    dumpIncomplete: 'The dump is incomplete (FM26 was probably still writing it). Try again in a moment.',
    reqNoPickup: 'FM26 is not picking up the request. Is your save loaded? Try F9 in the game, or restart FM26.',
    reqNoPickupMore: 'Keeps coming back? Read the fix',
    scanStalled: 'The scan appears to have stopped (was FM26 closed, or did it crash?). Restart FM26 and try again.',
    serverGone: 'Lost connection to the local server. Close this window and start FMSuperScout again.',
    tag_free: 'free', tag_listed: 'listed', tag_loan: 'for loan', tag_rel: 'released', tag_nfs: 'not for sale',
    colHint: 'Drag to reorder · right-click for columns', colsTitle: 'Show columns', colsReset: 'Reset to default',
    g_technical: 'Technical', g_setpieces: 'Set Pieces', g_mental: 'Mental', g_physical: 'Physical', g_goalkeeping: 'Goalkeeping', g_coaching: 'Coaching', g_knowledge: 'Knowledge & Scouting', g_gkCoaching: 'Goalkeeper Coaching',
    staffAttrs: 'Staff attributes',
    clearAll: 'clear all', chipSearch: 'Search',
    loading: 'Loading data…',
    parsing: 'Processing data…',
    esErrTitle: 'The dump could not be loaded',
    esErrBig: 'There is a dump on disk, but the app could not read it. This mostly happens with a very large save (many leagues loaded at once). Report it with the button below and we will look into it.',
    esErrSize: 'Dump on disk: {mb} MB',
    esErrReload: 'Try again',
    esErrCrash: 'The previous load attempt crashed, most likely because the system ran out of free memory. Tip: close FM26 (the dump is already on disk, the game is not needed for viewing), then click Try again.',
    step1: 'Start <b>FM26</b> and load your save',
    step2: 'Press <kbd>F9</kbd> in-game, or click <b>New data</b> here',
    step3: 'The data loads automatically once the dump is ready',
    playersWord: 'players', staffWord: 'staff', clickClubFilter: 'Click = filter on your club', repWord: 'reputation',
    roleFit: 'Tactical role', roleColHdr: 'Role', roleAny: 'No role selected', bestRoles: 'Best roles', profThresholdLabel: 'Min. proficiency',
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
    scanDb: 'Database', dbMen: 'Men', dbWomen: 'Women', dbBoth: 'Both',
    genderLabel: 'Gender', womenNote: 'Applies from the next scan (F9)',
    scanDbHint: 'Choose which gender the next scan (F9) loads: men only, women only, or both. With Both, a gender filter appears in the sidebar.',
    wagePer: 'Wage per', perWeek: 'week', perMonth: 'month', perYear: 'year',
    perWeekSuf: '/wk', perMonthSuf: '/mo', perYearSuf: '/yr', jobStaff: 'Staff member',
    c_meta: 'Meta', metaLabel: 'Meta score', c_metapa: 'PA meta',
    metaHint: 'Weighted average (1-20) of the attributes that win matches according to FM-Arena\'s match-engine tests; Pace and Acceleration count heaviest by far. Goalkeepers: own weighting from the keeper test (Reflexes, Agility).\n\n15+ elite, 13-15 strong, 11-13 decent. At equal CA the higher Meta usually performs better.',
    metaPaHint: 'The same meta weighting, applied to the attributes he is expected to reach at his potential (PA). The projection follows his position group\'s growth profile; physical growth stops after 23.\n\nFully developed = same as Meta. Sort on this for tomorrow\'s meta stars.',
    verWarn: 'FM version {v} detected; memory reading is calibrated for {s}.x. Data may be unreliable until FMSuperScout is updated.',
    verWarnOldDump: 'This data was made by an older FMSuperScout plugin. Everything works, but fetch fresh data (F9 in FM26 with your save loaded) for the best results.',
  },
  fr: {
    players: 'Joueurs', staff: 'Staff', shortlist: 'Shortlist', searchph: 'Nom ou club…',
    settings: 'Paramètres', langLabel: 'Langue', curLabel: 'Devise',
    showHidden: 'Afficher les stats cachées', showMeta: 'Afficher le score méta',
    profileMode: 'Profil du joueur', profSide: 'À droite', profPopup: 'Popup',
    devTitle: 'Progression',
    cardBtnTip: 'Enregistrer la carte du joueur (PNG)', cardSaved: 'Carte enregistrée dans Téléchargements',
    donateBtn: 'Soutenir FMSuperScout',
    seasonTitle: 'C\'était la saison {s}',
    seasonStatProfiles: '{n} profils consultés', seasonStatLoads: '{n} chargements de la base',
    seasonStatCards: '{n} cartes partagées', seasonStatShort: '{n} sur la shortlist',
    seasonAsk: 'FMSuperScout a bossé toute la saison gratuitement. Un café, c\'est son salaire annuel.',
    alreadyDonated: 'Déjà donné ?', neverAsk: 'Ne plus demander',
    supporterThanks: 'Merci ! Vous n\'en entendrez plus parler.',
    donateCta: '☕ Offrir un café', donateLater: 'Plus tard',
    position: 'Poste', clear: 'effacer', staffrole: 'Rôle du staff', quality: 'Qualité et âge',
    age: 'Âge', financial: 'Finances', maxvalue: 'Valeur max.', maxfee: 'Prix demandé max.', maxwage: 'Salaire max.',
    esSetupTitle: 'Lancez d\'abord Football Manager 26 une fois',
    esSetupBody: 'Le premier lancement après l\'installation prend 1 à 3 minutes de plus et affiche une console noire. C\'est normal : la couche de mods génère ses fichiers une seule fois. Laissez la fenêtre ouverte, même si FM semble figé.',
    esSetupHint: 'Ensuite chargez votre sauvegarde et appuyez sur F9. Les lancements suivants seront normaux.',
    devDeltaHint: 'Évolution sur la période affichée : dernière mesure moins la première. Vert = progrès, rouge = recul.',
    c_growth: 'Progrès', grNew: 'nouveau', development: 'Progression', histPeriod: 'Période',
    hp_last: 'Depuis le dernier dump', hp_m6: '6 derniers mois', hp_y1: 'Dernière année',
    hp_season: 'Cette saison', hp_all: 'Depuis le début', growthRange: 'Progrès', onlyNew: 'Nouveaux joueurs uniquement',
    growthHint: 'Évolution de la CA depuis la date de référence, mesurée dans vos propres dumps. Vert = progrès, rouge = recul, "nouveau" = n\'existait pas encore.\n\nChaque F9 ajoute un point de mesure : plus vous utilisez l\'outil, plus vous remontez loin.',
    onlyNewHint: 'Joueurs absents à la date de référence. En général des jeunes issus d\'une intake, parfois un joueur arrivé d\'un championnat non chargé.',
    intakeTitle: 'Intake : {n} nouveaux joueurs dans le monde', intakeBest: 'Meilleur espoir : {p}',
    intakeShow: 'Voir l\'intake',
    physical: 'Physique', heightCm: 'Taille (cm)', wonderkidOnly: 'Wonderkids uniquement',
    wonderkidHint: '21 ans max, PA de 150 ou plus et au moins 25 points de marge (PA moins CA). Même seuil que le liseré doré de la carte.',
    origin: 'Origine', originComp: 'Origine et championnat', nat: 'Nationalité', euonly: 'UE/EEE uniquement', availability: 'Disponibilité',
    interestmin: 'Intérêt ≥', all: 'Tous', attainable: 'Disponible', listed: 'Transférable',
    tstatus: 'Statut de transfert', tsSale: 'À vendre', tsLoan: 'À prêter', tsAny: 'À vendre ou à prêter',
    attainHint: 'Peut-il quitter son club ? Listé, proposé, libre ou en fin de contrat sous 12 mois (et pas "pas à vendre"). Ne dit rien sur son envie de VOUS rejoindre : ça, c\'est l\'Intérêt.',
    exp6: '< 6 mois', exp12: '< 1 an', free: 'Libre', myclub: 'Mon club', contractF: 'Contrat',
    advBtn: 'Filtre d\'attributs', advTitle: 'Filtrer par attributs', advSearch: 'Choisissez ou tapez un attribut…',
    advAdd: '+ attribut', advClear: 'Effacer', advDone: 'OK', advMin: 'min', advMax: 'max', advColAttr: 'Attribut',
    reportBug: 'Signaler un problème…', esReportHint: 'F9 pressé mais pas de données ?', updateAvail: 'Mise à jour {v} disponible',
    updDl: 'Téléchargement… {pct}%', updVerify: 'Vérification du téléchargement…',
    updLaunch: 'Installateur lancé. Suivez les étapes ; l\'app redémarre ensuite.',
    updErr: 'Échec de la mise à jour. Ouvrir la page de téléchargement',
    updCheckBtn: 'Rechercher des mises à jour', updChecking: 'Recherche…',
    updNone: 'Vous êtes à jour (v{v})', updFound: 'Mise à jour {v} disponible, voir la notification en haut',
    updCheckErr: 'Vérification impossible. Êtes-vous en ligne ?',
    onlyshortlist: 'Shortlist uniquement', clearfilters: 'Effacer les filtres', fetch: 'Nouvelles données',
    nodata: 'Aucune donnée chargée', exportcsv: 'Exporter la shortlist (CSV)',
    results: 'résultats', c_name: 'Nom', c_age: 'Âge', c_pos: 'Poste', c_club: 'Club', c_nat: 'Nat',
    c_value: 'Valeur', c_fee: 'Prix demandé', c_wage: 'Salaire', c_expires: 'Contrat jusqu\'au', c_interest: 'Intérêt',
    c_status: 'Statut', c_role: 'Rôle', foot: 'Pied', footR: 'Droit', footL: 'Gauche', footB: 'Les deux', height: 'Taille', repLabel: 'Réputation',
    c_clubrep: 'Rép. club', c_worldrep: 'Rép. mondiale', c_div: 'Division',
    estval: 'Valeur est.', wageLabel: 'Salaire', contractLabel: 'Contrat jusqu\'au', free_l: 'libre',
    int_big: 'Fort', int_ok: 'Correct', int_small: 'Faible', int_no: 'Non', interestTitle: 'Estimation d\'intérêt',
    interestHint: 'Ce joueur rejoindrait-il votre club ? Estimé à partir de l\'écart de réputation, du salaire, de l\'ambition, de la loyauté, de l\'âge et de la disponibilité. L\'article 19 de la FIFA s\'applique aux non-UE de moins de 18 ans.\n\nUne estimation, pas un chiffre FM : FM tranche pendant la négociation et pèse votre offre. Un "Faible" peut dire oui à une belle offre.',
    minorNote: 'Trop jeune pour un transfert.', minorIntlNote: 'Mineur non-UE : possible seulement à partir de 18 ans (règle FIFA sur les transferts internationaux).',
    ambition: 'Ambition', loyalty: 'Loyauté', professionalism: 'Professionnalisme', adaptability: 'Adaptabilité',
    pressure: 'Pression', sportsmanship: 'Fair-play', temperament: 'Tempérament', controversy: 'Controverse', determination: 'Détermination',
    personaTitle: 'Personnalité',
    hiddenTitle: 'Caractéristiques cachées', a_Consistency: 'Régularité', a_ImportantMatches: 'Grands matchs',
    a_InjuryProneness: 'Fragilité', a_Versatility: 'Polyvalence', a_Dirtiness: 'Antijeu',
    showPot: 'Voir le potentiel estimé', potNote: 'valeurs estimées au potentiel (PA)',
    loanOut: 'prêté à {c}', loanIn: 'prêté par {c}', ownerLabel: 'Club propriétaire',
    clubless: 'sans club', clubUnknown: 'club inconnu', copied: 'Copié',
    copyNameTip: 'Clic = copier le nom', slEmpty: 'Shortlist vide',
    copyBtnTip: 'Copier le nom', clubNotRead: 'Club non résolu (rép {r})',
    reqSent: 'Lecture des données…',
    dumping: 'Lecture des données…', dumpReady: 'Nouvelles données prêtes, cliquez pour charger',
    dumpLoaded: 'Nouvelles données chargées',
    dumpError: 'Échec de la lecture', fmNotRunning: 'Lancez d\'abord Football Manager 26 et chargez votre sauvegarde.',
    dumpIncomplete: 'Le dump est incomplet (FM26 était sans doute encore occupé). Réessayez dans un instant.',
    reqNoPickup: 'FM26 ne reçoit pas la demande. Sauvegarde chargée ? Essayez F9 dans le jeu, ou relancez FM26.',
    reqNoPickupMore: 'Ça revient sans cesse ? Lisez le correctif',
    scanStalled: 'Le scan semble arrêté (FM26 fermé ou planté ?). Relancez FM26 et réessayez.',
    serverGone: 'Pas de connexion au serveur local. Fermez cette fenêtre et relancez FMSuperScout.',
    tag_free: 'libre', tag_listed: 'transférable', tag_loan: 'à prêter', tag_rel: 'libéré', tag_nfs: 'pas à vendre',
    colHint: 'Glissez pour déplacer · clic droit pour les colonnes', colsTitle: 'Colonnes affichées', colsReset: 'Rétablir par défaut',
    g_technical: 'Technique', g_setpieces: 'Coups de pied arrêtés', g_mental: 'Mental', g_physical: 'Physique', g_goalkeeping: 'Gardien', g_coaching: 'Entraînement', g_knowledge: 'Connaissances et recrutement', g_gkCoaching: 'Entraînement des gardiens',
    staffAttrs: 'Attributs du staff',
    clearAll: 'tout effacer', chipSearch: 'Rechercher',
    loading: 'Chargement…',
    parsing: 'Traitement…',
    esErrTitle: 'Impossible de charger le dump',
    esErrBig: 'Un dump existe sur le disque, mais l\'app n\'a pas pu le lire. Cela arrive surtout avec une très grosse sauvegarde (beaucoup de championnats chargés). Signalez-le avec le bouton ci-dessous.',
    esErrSize: 'Dump sur disque : {mb} Mo',
    esErrReload: 'Réessayer',
    esErrCrash: 'Le chargement précédent a échoué, probablement par manque de mémoire. Astuce : fermez FM26 (le dump est déjà sur le disque) puis cliquez sur Réessayer.',
    step1: 'Lancez <b>FM26</b> et chargez votre sauvegarde',
    step2: 'Appuyez sur <kbd>F9</kbd> dans le jeu, ou cliquez ici sur <b>Nouvelles données</b>',
    step3: 'Les données se chargent dès que le dump est prêt',
    playersWord: 'joueurs', staffWord: 'staff', clickClubFilter: 'Clic = filtrer sur votre club', repWord: 'réputation',
    roleFit: 'Rôle tactique', roleColHdr: 'Rôle', roleAny: 'Aucun rôle choisi', bestRoles: 'Meilleurs rôles', profThresholdLabel: 'Min. maîtrise',
    compare: 'Comparer', comparing: 'Comparaison', addCompare: 'Comparer', compareFull: '3 joueurs max.',
    cmpTitle: 'Comparaison de joueurs', cmpValue: 'Valeur', cmpTopRole: 'Meilleur rôle',
    cmpWinsBadge: '{n}× meilleur attribut', avgLabel: 'Moyenne',
    mt_all: 'Tout', mt_first: 'Équipe première', mt_res: 'Réserve', mt_youth: 'Jeunes',
    cmpDeltaHint: 'Écart : joueur 1 moins joueur 2 (vert = avantage joueur 1)',
    analysis: 'Analyse', anTitle: 'Analyse des besoins de l\'effectif', anNoClub: 'Aucun club à vous trouvé dans les données.',
    anPlayers: 'joueurs', anAvgAge: 'âge moyen', anAvgCa: 'CA moyenne', anTopCa: 'meilleure CA',
    anOk: 'Au niveau', anThin: 'Effectif mince', anShort: 'Manque', anAging: 'Vieillissant', anNoSucc: 'Pas de relève',
    anScout: 'Scouter des joueurs', anYoungTalent: 'plus jeune talent', anNone: 'aucun',
    anBiggestNeed: 'Plus grand besoin', anSquadSize: 'Effectif',
    anRecAging: 'Vieillissant ; cherchez un successeur de moins de {age} ans avec plus de {pa} de PA.',
    anRecShort: 'Trop peu de joueurs ; recrutez au moins {n} de plus ({pa}+ PA).',
    anRecThin: 'Couverture mince ; un renfort de {pa}+ PA étoffera la rotation.',
    anRecSucc: 'Aucun jeune au niveau ; cherchez un U{age} avec plus de {pa} de PA.',
    anRecAgingNp: 'Vieillissant ; cherchez un successeur plus jeune.',
    anRecShortNp: 'Trop peu de joueurs ; recrutez-en {n} de plus.',
    anRecThinNp: 'Couverture mince ; un renfort étoffera la rotation.',
    anRecSuccNp: 'Aucun jeune au niveau ; cherchez un grand talent U{age}.',
    competition: 'Championnat', divLabel: 'Division', divSearch: 'Tapez un championnat…',
    gameDateMemory: 'Date en jeu (lue en mémoire)', gameDateDerived: 'Date en jeu estimée (année sûre, jour approché)',
    presetsTitle: 'Filtres enregistrés', presetSave: 'Enregistrer les filtres actuels', presetNamePrompt: 'Nom de cette recherche',
    presetSaved: 'Filtre enregistré', presetNone: 'Aucun filtre enregistré.', presetPick: 'Choisir un filtre…',
    presetDelConfirm: 'Supprimer "{name}" ?',
    presetEmptyFilters: 'Aucun filtre actif à enregistrer',
    presetSaveTitle: 'Enregistrer les filtres', presetDelTitle: 'Supprimer le filtre',
    saveBtn: 'Enregistrer', deleteBtn: 'Supprimer', cancelBtn: 'Annuler',
    scanDb: 'Base de données', dbMen: 'Hommes', dbWomen: 'Femmes', dbBoth: 'Les deux',
    genderLabel: 'Sexe', womenNote: 'Valable à partir du prochain scan (F9)',
    scanDbHint: 'Choisissez quel sexe le prochain scan (F9) charge : hommes seuls, femmes seules, ou les deux. Avec Les deux, un filtre sexe apparaît dans la barre latérale.',
    wagePer: 'Salaire par', perWeek: 'semaine', perMonth: 'mois', perYear: 'an',
    perWeekSuf: '/sem', perMonthSuf: '/mois', perYearSuf: '/an', jobStaff: 'Membre du staff',
    c_meta: 'Méta', metaLabel: 'Score méta', c_metapa: 'Méta PA',
    metaHint: 'Moyenne pondérée (1-20) des attributs qui gagnent des matchs selon les tests du moteur de FM-Arena ; Vitesse et Accélération pèsent de loin le plus lourd. Gardiens : pondération propre issue du test des gardiens (Réflexes, Agilité).\n\n15+ élite, 13-15 fort, 11-13 correct. À CA égale, le Méta le plus haut performe en général mieux.',
    metaPaHint: 'La même pondération méta, appliquée aux attributs qu\'il devrait atteindre à son potentiel (PA). La projection suit le profil de progression de son groupe de postes ; le physique cesse de progresser après 23 ans.\n\nJoueur abouti = identique au Méta. Triez dessus pour trouver les stars méta de demain.',
    verWarn: 'Version FM {v} détectée ; la lecture est calibrée pour {s}.x. Données possiblement peu fiables avant une mise à jour de FMSuperScout.',
    verWarnOldDump: 'Ces données viennent d\'un plugin FMSuperScout plus ancien. Tout fonctionne, mais rechargez des données fraîches (F9 dans FM26, sauvegarde chargée) pour un meilleur résultat.',
  },
  de: {
    players: 'Spieler', staff: 'Mitarbeiter', shortlist: 'Shortlist', searchph: 'Name oder Verein…',
    settings: 'Einstellungen', langLabel: 'Sprache', curLabel: 'Währung',
    showHidden: 'Versteckte Werte anzeigen', showMeta: 'Meta-Score anzeigen',
    profileMode: 'Spielerprofil', profSide: 'Rechts', profPopup: 'Popup',
    devTitle: 'Entwicklung',
    cardBtnTip: 'Spielerkarte speichern (PNG)', cardSaved: 'Karte in Downloads gespeichert',
    donateBtn: 'FMSuperScout unterstützen',
    seasonTitle: 'Das war Saison {s}',
    seasonStatProfiles: '{n} Profile angesehen', seasonStatLoads: '{n}× Datenbank geladen',
    seasonStatCards: '{n} Spielerkarten geteilt', seasonStatShort: '{n} auf der Shortlist',
    seasonAsk: 'FMSuperScout hat die ganze Saison gratis mitgearbeitet. Ein Kaffee ist sein komplettes Jahresgehalt.',
    alreadyDonated: 'Schon gespendet?', neverAsk: 'Nicht mehr fragen',
    supporterThanks: 'Danke! Du hörst nichts mehr davon.',
    donateCta: '☕ Kaffee spendieren', donateLater: 'Später',
    position: 'Position', clear: 'leeren', staffrole: 'Mitarbeiterrolle', quality: 'Qualität & Alter',
    age: 'Alter', financial: 'Finanzen', maxvalue: 'Max. Wert', maxfee: 'Max. Forderung', maxwage: 'Max. Gehalt',
    esSetupTitle: 'Starte Football Manager 26 zuerst einmal',
    esSetupBody: 'Der erste Start nach der Installation dauert 1 bis 3 Minuten länger und zeigt ein schwarzes Konsolenfenster. Das ist normal: Die Mod-Ebene erzeugt einmalig ihre Dateien. Fenster offen lassen, auch wenn FM zu hängen scheint.',
    esSetupHint: 'Danach Spielstand laden und F9 drücken. Die nächsten Starts laufen wieder normal.',
    devDeltaHint: 'Veränderung im angezeigten Zeitraum: letzte Messung minus erste. Grün = Fortschritt, Rot = Rückschritt.',
    c_growth: 'Wachstum', grNew: 'neu', development: 'Entwicklung', histPeriod: 'Zeitraum',
    hp_last: 'Seit letztem Dump', hp_m6: 'Letzte 6 Monate', hp_y1: 'Letztes Jahr',
    hp_season: 'Diese Saison', hp_all: 'Seit Beginn', growthRange: 'Wachstum', onlyNew: 'Nur neue Spieler',
    growthHint: 'CA-Veränderung seit dem gewählten Stichtag, gemessen aus deinen eigenen Dumps. Grün = Wachstum, Rot = Verlust, "neu" = existierte damals noch nicht.\n\nJedes F9 fügt einen Messpunkt hinzu: Je länger du das Tool nutzt, desto weiter blickst du zurück.',
    onlyNewHint: 'Spieler, die es am Stichtag noch nicht gab. Meist Jugendspieler aus einer Intake, manchmal jemand aus einer nicht geladenen Liga.',
    intakeTitle: 'Jugend-Intake: {n} neue Spieler weltweit', intakeBest: 'Bestes Talent: {p}',
    intakeShow: 'Intake anzeigen',
    physical: 'Physis', heightCm: 'Größe (cm)', wonderkidOnly: 'Nur Wonderkids',
    wonderkidHint: 'Höchstens 21 Jahre, PA 150 oder mehr und mindestens 25 Punkte Luft (PA minus CA). Gleiche Schwelle wie der Goldrand auf der Spielerkarte.',
    origin: 'Herkunft', originComp: 'Herkunft & Liga', nat: 'Nationalität', euonly: 'Nur EU/EWR', availability: 'Verfügbarkeit',
    interestmin: 'Interesse ≥', all: 'Alle', attainable: 'Verfügbar', listed: 'Auf Transferliste',
    tstatus: 'Transferstatus', tsSale: 'Zu verkaufen', tsLoan: 'Zu verleihen', tsAny: 'Verkauf oder Leihe',
    attainHint: 'Kann er weg? Auf der Transferliste, angeboten, vereinslos oder Vertrag läuft binnen 12 Monaten aus (und nicht "unverkäuflich"). Sagt nichts darüber, ob er zu DIR will: das ist Interesse.',
    exp6: '< 6 Mon.', exp12: '< 1 Jahr', free: 'Vereinslos', myclub: 'Mein Verein', contractF: 'Vertrag',
    advBtn: 'Attributfilter', advTitle: 'Nach Attributen filtern', advSearch: 'Attribut wählen oder tippen…',
    advAdd: '+ Attribut', advClear: 'Leeren', advDone: 'Fertig', advMin: 'min', advMax: 'max', advColAttr: 'Attribut',
    reportBug: 'Problem melden…', esReportHint: 'F9 gedrückt, aber keine Daten?', updateAvail: 'Update {v} verfügbar',
    updDl: 'Update wird geladen… {pct}%', updVerify: 'Download wird geprüft…',
    updLaunch: 'Installer gestartet. Folge den Schritten; die App startet danach neu.',
    updErr: 'Update fehlgeschlagen. Downloadseite öffnen',
    updCheckBtn: 'Nach Updates suchen', updChecking: 'Suche…',
    updNone: 'Du bist aktuell (v{v})', updFound: 'Update {v} verfügbar, siehe Hinweis oben',
    updCheckErr: 'Prüfung fehlgeschlagen. Bist du online?',
    onlyshortlist: 'Nur Shortlist', clearfilters: 'Filter leeren', fetch: 'Neue Daten',
    nodata: 'Noch keine Daten geladen', exportcsv: 'Shortlist exportieren (CSV)',
    results: 'Treffer', c_name: 'Name', c_age: 'Alter', c_pos: 'Position', c_club: 'Verein', c_nat: 'Nat',
    c_value: 'Wert', c_fee: 'Forderung', c_wage: 'Gehalt', c_expires: 'Vertrag bis', c_interest: 'Interesse',
    c_status: 'Status', c_role: 'Rolle', foot: 'Fuß', footR: 'Rechts', footL: 'Links', footB: 'Beide', height: 'Größe', repLabel: 'Reputation',
    c_clubrep: 'Vereinsrep.', c_worldrep: 'Weltrep.', c_div: 'Liga',
    estval: 'Gesch. Wert', wageLabel: 'Gehalt', contractLabel: 'Vertrag bis', free_l: 'ablösefrei',
    int_big: 'Hoch', int_ok: 'Ordentlich', int_small: 'Gering', int_no: 'Nein', interestTitle: 'Interesse-Einschätzung',
    interestHint: 'Würde dieser Spieler zu deinem Verein wechseln? Geschätzt aus Reputationsunterschied, Gehalt, Ambition, Loyalität, Alter und Verfügbarkeit. FIFA-Artikel 19 gilt für Nicht-EU-Spieler unter 18.\n\nEine Schätzung, keine FM-Zahl: FM entscheidet erst in der Verhandlung und wägt dein Angebot mit. Ein "Gering" kann bei einem starken Angebot trotzdem Ja sagen.',
    minorNote: 'Zu jung für einen Transfer.', minorIntlNote: 'Als Nicht-EU-Minderjähriger erst ab 18 machbar (FIFA-Regel für internationale Transfers).',
    ambition: 'Ambition', loyalty: 'Loyalität', professionalism: 'Professionalität', adaptability: 'Anpassung',
    pressure: 'Druck', sportsmanship: 'Fairness', temperament: 'Temperament', controversy: 'Kontroverse', determination: 'Entschlossenheit',
    personaTitle: 'Persönlichkeit',
    hiddenTitle: 'Versteckte Merkmale', a_Consistency: 'Konstanz', a_ImportantMatches: 'Wichtige Spiele',
    a_InjuryProneness: 'Verletzungsanfälligkeit', a_Versatility: 'Vielseitigkeit', a_Dirtiness: 'Unfairness',
    showPot: 'Geschätztes Potenzial anzeigen', potNote: 'geschätzte Werte beim Potenzial (PA)',
    loanOut: 'verliehen an {c}', loanIn: 'ausgeliehen von {c}', ownerLabel: 'Stammverein',
    clubless: 'vereinslos', clubUnknown: 'unbekannter Verein', copied: 'Kopiert',
    copyNameTip: 'Klick = Name kopieren', slEmpty: 'Shortlist leer',
    copyBtnTip: 'Name kopieren', clubNotRead: 'Verein nicht ausgelesen (Rep {r})',
    reqSent: 'Spielerdaten werden gelesen…',
    dumping: 'Spielerdaten werden gelesen…', dumpReady: 'Neue Daten bereit, zum Laden klicken',
    dumpLoaded: 'Neue Daten geladen',
    dumpError: 'Auslesen fehlgeschlagen', fmNotRunning: 'Starte zuerst Football Manager 26 und lade deinen Spielstand.',
    dumpIncomplete: 'Der Dump ist unvollständig (FM26 war vermutlich noch beschäftigt). Versuche es gleich noch einmal.',
    reqNoPickup: 'FM26 nimmt die Anfrage nicht an. Spielstand geladen? Versuche F9 im Spiel oder starte FM26 neu.',
    reqNoPickupMore: 'Kommt das immer wieder? Lies den Fix',
    scanStalled: 'Der Scan scheint gestoppt (FM26 beendet oder abgestürzt?). Starte FM26 neu und versuche es erneut.',
    serverGone: 'Keine Verbindung zum lokalen Server. Schließe dieses Fenster und starte FMSuperScout neu.',
    tag_free: 'vereinslos', tag_listed: 'Transferliste', tag_loan: 'zu verleihen', tag_rel: 'freigestellt', tag_nfs: 'unverkäuflich',
    colHint: 'Ziehen zum Verschieben · Rechtsklick für Spalten', colsTitle: 'Spalten anzeigen', colsReset: 'Standard wiederherstellen',
    g_technical: 'Technik', g_setpieces: 'Standards', g_mental: 'Mental', g_physical: 'Physis', g_goalkeeping: 'Torwart', g_coaching: 'Coaching', g_knowledge: 'Wissen & Scouting', g_gkCoaching: 'Torwart-Coaching',
    staffAttrs: 'Mitarbeiter-Attribute',
    clearAll: 'alles leeren', chipSearch: 'Suchen',
    loading: 'Daten werden geladen…',
    parsing: 'Daten werden verarbeitet…',
    esErrTitle: 'Der Dump konnte nicht geladen werden',
    esErrBig: 'Auf der Festplatte liegt ein Dump, aber die App konnte ihn nicht lesen. Das passiert vor allem bei sehr großen Spielständen (viele Ligen gleichzeitig geladen). Melde es mit dem Button unten.',
    esErrSize: 'Dump auf Festplatte: {mb} MB',
    esErrReload: 'Erneut versuchen',
    esErrCrash: 'Der letzte Ladeversuch ist hängen geblieben, vermutlich wegen zu wenig freiem Speicher. Tipp: Schließe FM26 (der Dump liegt schon auf der Festplatte) und klicke dann auf Erneut versuchen.',
    step1: 'Starte <b>FM26</b> und lade deinen Spielstand',
    step2: 'Drücke im Spiel <kbd>F9</kbd> oder klicke hier auf <b>Neue Daten</b>',
    step3: 'Die Daten laden automatisch, sobald der Dump fertig ist',
    playersWord: 'Spieler', staffWord: 'Mitarbeiter', clickClubFilter: 'Klick = nach deinem Verein filtern', repWord: 'Reputation',
    roleFit: 'Taktische Rolle', roleColHdr: 'Rolle', roleAny: 'Keine Rolle gewählt', bestRoles: 'Beste Rollen', profThresholdLabel: 'Mind. Kompetenz',
    compare: 'Vergleichen', comparing: 'Vergleich', addCompare: 'Vergleichen', compareFull: 'Max. 3 Spieler',
    cmpTitle: 'Spielervergleich', cmpValue: 'Wert', cmpTopRole: 'Beste Rolle',
    cmpWinsBadge: '{n}× bestes Attribut', avgLabel: 'Durchschnitt',
    mt_all: 'Alle', mt_first: '1. Mannschaft', mt_res: 'Reserve', mt_youth: 'Jugend',
    cmpDeltaHint: 'Differenz: Spieler 1 minus Spieler 2 (grün = Vorteil Spieler 1)',
    analysis: 'Analyse', anTitle: 'Kaderbedarfsanalyse', anNoClub: 'Kein eigener Verein in den Daten gefunden.',
    anPlayers: 'Spieler', anAvgAge: 'Ø Alter', anAvgCa: 'Ø CA', anTopCa: 'beste CA',
    anOk: 'Gut besetzt', anThin: 'Dünn besetzt', anShort: 'Unterbesetzt', anAging: 'Überaltert', anNoSucc: 'Keine Nachfolge',
    anScout: 'Spieler scouten', anYoungTalent: 'jüngstes Talent', anNone: 'keins',
    anBiggestNeed: 'Größter Bedarf', anSquadSize: 'Kader',
    anRecAging: 'Überaltert; suche einen Nachfolger unter {age} mit PA über {pa}.',
    anRecShort: 'Zu wenige Spieler; verpflichte mindestens {n} weitere ({pa}+ PA).',
    anRecThin: 'Dünne Absicherung; ein Zugang mit {pa}+ PA stärkt die Tiefe.',
    anRecSucc: 'Kein junges Talent auf Niveau; suche einen U{age} mit PA über {pa}.',
    anRecAgingNp: 'Überaltert; suche einen jüngeren Nachfolger.',
    anRecShortNp: 'Zu wenige Spieler; verpflichte {n} weitere.',
    anRecThinNp: 'Dünne Absicherung; ein Zugang stärkt die Tiefe.',
    anRecSuccNp: 'Kein junges Talent auf Niveau; suche ein großes U{age}-Talent.',
    competition: 'Liga', divLabel: 'Liga', divSearch: 'Liga eintippen…',
    gameDateMemory: 'Datum im Spiel (aus dem Speicher)', gameDateDerived: 'Geschätztes Spieldatum (Jahr sicher, Tag angenähert)',
    presetsTitle: 'Gespeicherte Filter', presetSave: 'Aktuelle Filter speichern', presetNamePrompt: 'Name für diese Suche',
    presetSaved: 'Filter gespeichert', presetNone: 'Noch keine gespeicherten Filter.', presetPick: 'Gespeicherten Filter wählen…',
    presetDelConfirm: '"{name}" wirklich löschen?',
    presetEmptyFilters: 'Keine aktiven Filter zum Speichern',
    presetSaveTitle: 'Filter speichern', presetDelTitle: 'Filter löschen',
    saveBtn: 'Speichern', deleteBtn: 'Löschen', cancelBtn: 'Abbrechen',
    scanDb: 'Datenbank', dbMen: 'Männer', dbWomen: 'Frauen', dbBoth: 'Beide',
    genderLabel: 'Geschlecht', womenNote: 'Gilt ab dem nächsten Scan (F9)',
    scanDbHint: 'Wähle, welches Geschlecht der nächste Scan (F9) lädt: nur Männer, nur Frauen oder beide. Bei Beide erscheint ein Geschlechtsfilter in der Seitenleiste.',
    wagePer: 'Gehalt pro', perWeek: 'Woche', perMonth: 'Monat', perYear: 'Jahr',
    perWeekSuf: '/Wo', perMonthSuf: '/Mon.', perYearSuf: '/Jahr', jobStaff: 'Mitarbeiter',
    c_meta: 'Meta', metaLabel: 'Meta-Score', c_metapa: 'PA-Meta',
    metaHint: 'Gewichteter Durchschnitt (1-20) der Attribute, die laut FM-Arenas Match-Engine-Tests Spiele gewinnen; Schnelligkeit und Antritt zählen mit Abstand am meisten. Torhüter: eigene Gewichtung aus dem Torwart-Test (Reflexe, Beweglichkeit).\n\n15+ Elite, 13-15 stark, 11-13 solide. Bei gleicher CA spielt der höhere Meta meist besser.',
    metaPaHint: 'Dieselbe Meta-Gewichtung, angewandt auf die Attribute, die er an seinem Potenzial (PA) voraussichtlich erreicht. Die Projektion folgt dem Wachstumsprofil seiner Positionsgruppe; Physis wächst nach 23 nicht mehr.\n\nAusentwickelt = gleich Meta. Sortiere danach für die Meta-Stars von morgen.',
    verWarn: 'FM-Version {v} erkannt; das Auslesen ist auf {s}.x geeicht. Daten bis zu einem FMSuperScout-Update möglicherweise unzuverlässig.',
    verWarnOldDump: 'Diese Daten stammen von einem älteren FMSuperScout-Plugin. Alles funktioniert, aber hole frische Daten (F9 in FM26 mit geladenem Spielstand) für das beste Ergebnis.',
  },
};
// Onbekende taalcode (oude versie in localStorage, gesynct profiel) mag de app niet
// slopen vóór er ook maar iets gerenderd is → altijd via een geldige tabel.
const t = k => ((I18N[state.lang] || I18N.en)[k] ?? I18N.en[k] ?? I18N.nl[k] ?? k);
// Locale voor getallen/datums per app-taal (toLocaleString/-DateString).
const LOCALES = { nl: 'nl-NL', en: 'en-GB', fr: 'fr-FR', de: 'de-DE' };
const uiLocale = () => LOCALES[state.lang] || 'en-GB';

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
  card: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  // Voetbal: gevulde vijfhoek in het midden, vijf dunne naden naar de rand en korte
  // hints van de randvlakken. Bewust een eigen, dunne lijndikte (1.1): met dikke naden
  // leest dit als een stuurwiel in plaats van een bal (varianten vergeleken 26-07).
  ball: '<g stroke-width="1.1"><circle cx="12" cy="12" r="10.2"/><path d="M12 8.8 12 1.8 M15.1 11.05 21.7 8.9 M13.9 14.7 18 20.4 M10.1 14.7 6 20.4 M8.9 11.05 2.3 8.9 M4.6 17.2 7.4 16.4 M19.4 17.2 16.6 16.4 M6 4.5 8.2 6.3 M18 4.5 15.8 6.3"/></g><polygon points="12,8.8 15.1,11.05 13.9,14.7 10.1,14.7 8.9,11.05" fill="currentColor" stroke="none"/>',
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
  // FR/DE volgen de gangbare FM-termen; correcties van native spelers zijn welkom via een issue/PR.
  fr: {
    Corners: 'Corners', Crossing: 'Centres', Dribbling: 'Dribble', Finishing: 'Finition', FirstTouch: 'Contrôle', FreeKicks: 'Coups francs', Heading: 'Jeu de tête', LongShots: 'Tirs de loin', LongThrows: 'Touches longues', Marking: 'Marquage', Passing: 'Passes', PenaltyTaking: 'Penaltys', Tackling: 'Tacles', Technique: 'Technique',
    Aggression: 'Agressivité', Anticipation: 'Anticipation', Bravery: 'Courage', Composure: 'Sang-froid', Concentration: 'Concentration', Decisions: 'Décisions', Determination: 'Détermination', Flair: 'Flair', Leadership: 'Leadership', OffTheBall: 'Déplacements', Positioning: 'Placement', Teamwork: 'Collectif', Vision: 'Vision du jeu', WorkRate: 'Volume de jeu',
    Acceleration: 'Accélération', Agility: 'Agilité', Balance: 'Équilibre', JumpingReach: 'Détente', NaturalFitness: 'Condition naturelle', Pace: 'Vitesse', Stamina: 'Endurance', Strength: 'Force',
    AerialReach: 'Jeu aérien', CommandOfArea: 'Autorité dans la surface', Communication: 'Communication', Eccentricity: 'Excentricité', Handling: 'Prise de balle', Kicking: 'Dégagements', OneOnOnes: 'Un contre un', Punching: 'Sorties aux poings', Reflexes: 'Réflexes', RushingOut: 'Sorties', Throwing: 'Relances à la main',
  },
  de: {
    Corners: 'Ecken', Crossing: 'Flanken', Dribbling: 'Dribbling', Finishing: 'Abschluss', FirstTouch: 'Ballannahme', FreeKicks: 'Freistöße', Heading: 'Kopfball', LongShots: 'Weitschüsse', LongThrows: 'Weite Einwürfe', Marking: 'Manndeckung', Passing: 'Passspiel', PenaltyTaking: 'Elfmeter', Tackling: 'Tackling', Technique: 'Technik',
    Aggression: 'Aggressivität', Anticipation: 'Antizipation', Bravery: 'Mut', Composure: 'Gelassenheit', Concentration: 'Konzentration', Decisions: 'Entscheidungen', Determination: 'Entschlossenheit', Flair: 'Flair', Leadership: 'Führungsqualität', OffTheBall: 'Freilaufen', Positioning: 'Stellungsspiel', Teamwork: 'Teamarbeit', Vision: 'Übersicht', WorkRate: 'Einsatzfreude',
    Acceleration: 'Antritt', Agility: 'Beweglichkeit', Balance: 'Balance', JumpingReach: 'Sprungkraft', NaturalFitness: 'Natürliche Fitness', Pace: 'Schnelligkeit', Stamina: 'Ausdauer', Strength: 'Kraft',
    AerialReach: 'Luftbeherrschung', CommandOfArea: 'Strafraumbeherrschung', Communication: 'Kommunikation', Eccentricity: 'Exzentrik', Handling: 'Fangsicherheit', Kicking: 'Abschlag', OneOnOnes: 'Eins gegen eins', Punching: 'Fausten', Reflexes: 'Reflexe', RushingOut: 'Herauslaufen', Throwing: 'Abwurf',
  },
};
const attrName = k => ((ATTR_LABEL[state.lang] || ATTR_LABEL.en)[k] ?? k);

// Localized labels for staff attributes exported by the plugin (plugin/Fields.cs StaffAttrs).
const STAFF_ATTR_LABEL = {
  nl: {
    Aanvallen: 'Aanvallen', Verdedigen: 'Verdedigen', Fitheid: 'Fitheid', Balbezit: 'Balbezit',
    Technisch: 'Technisch', Tactisch: 'Tactisch', Standaardsituaties: 'Standaardsituaties',
    Vastberadenheid: 'Vastberadenheid', 'Man-management': 'Man-management', Motiveren: 'Motiveren',
    Oordeel_vermogen: 'Oordeel vermogen', Oordeel_potentie: 'Oordeel potentie', Oordeel_staf: 'Oordeel staf',
    Onderhandelen: 'Onderhandelen', Tactische_kennis: 'Tactische kennis', Fysiotherapie: 'Fysiotherapie',
    Sportwetenschap: 'Sportwetenschap', Data_analyse: 'Data-analyse', Jeugd: 'Jeugd',
    KV_distributie: 'GK Distributie', KV_vangen: 'GK Balbeheersing', KV_reflexen: 'GK Reflexen',
  },
  en: {
    Aanvallen: 'Attacking', Verdedigen: 'Defending', Fitheid: 'Fitness', Balbezit: 'Possession',
    Technisch: 'Technical', Tactisch: 'Tactical', Standaardsituaties: 'Set Pieces',
    Vastberadenheid: 'Determination', 'Man-management': 'Man Management', Motiveren: 'Motivating',
    Oordeel_vermogen: 'Judging Player Ability', Oordeel_potentie: 'Judging Player Potential', Oordeel_staf: 'Judging Staff Ability',
    Onderhandelen: 'Negotiating', Tactische_kennis: 'Tactical Knowledge', Fysiotherapie: 'Physiotherapy',
    Sportwetenschap: 'Sports Science', Data_analyse: 'Data Analysis', Jeugd: 'Working With Youngsters',
    KV_distributie: 'GK Distribution', KV_vangen: 'GK Handling', KV_reflexen: 'GK Shot Stopping',
  },
  fr: {
    Aanvallen: 'Attaque', Verdedigen: 'Défense', Fitheid: 'Physique', Balbezit: 'Possession',
    Technisch: 'Technique', Tactisch: 'Tactique', Standaardsituaties: 'Coups de pied arrêtés',
    Vastberadenheid: 'Détermination', 'Man-management': 'Gestion des hommes', Motiveren: 'Motivation',
    Oordeel_vermogen: 'Évaluation du niveau', Oordeel_potentie: 'Évaluation du potentiel', Oordeel_staf: 'Évaluation du staff',
    Onderhandelen: 'Négociation', Tactische_kennis: 'Connaissances tactiques', Fysiotherapie: 'Kinésithérapie',
    Sportwetenschap: 'Science du sport', Data_analyse: 'Analyse de données', Jeugd: 'Travail avec les jeunes',
    KV_distributie: 'GBD Distribution', KV_vangen: 'GBD Prise de balle', KV_reflexen: 'GBD Réflexes',
  },
  de: {
    Aanvallen: 'Angriffsspiel', Verdedigen: 'Abwehrspiel', Fitheid: 'Fitness', Balbezit: 'Ballbesitz',
    Technisch: 'Technik', Tactisch: 'Taktik', Standaardsituaties: 'Standardsituationen',
    Vastberadenheid: 'Entschlossenheit', 'Man-management': 'Menschenführung', Motiveren: 'Motivation',
    Oordeel_vermogen: 'Spielerfähigkeit bewerten', Oordeel_potentie: 'Spielerpotenzial bewerten', Oordeel_staf: 'Mitarbeiterfähigkeit bewerten',
    Onderhandelen: 'Verhandeln', Tactische_kennis: 'Taktikkenntnisse', Fysiotherapie: 'Physiotherapy',
    Sportwetenschap: 'Sportwissenschaft', Data_analyse: 'Datenanalyse', Jeugd: 'Arbeit mit Jugendlichen',
    KV_distributie: 'TW-Passspiel', KV_vangen: 'TW-Fangsicherheit', KV_reflexen: 'TW-Schussabwehr',
  },
};
const staffAttrName = k => ((STAFF_ATTR_LABEL[state.lang] || STAFF_ATTR_LABEL.en)[k] ?? k.replace(/_/g, ' '));
const isStaffAttrKey = k => typeof k === 'string' && k in STAFF_ATTR_LABEL.en;
const STAFF_ATTR_GROUPS = [
  ['g_coaching', ['Aanvallen', 'Verdedigen', 'Fitheid', 'Balbezit', 'Technisch', 'Tactisch', 'Standaardsituaties']],
  ['g_mental', ['Vastberadenheid', 'Man-management', 'Motiveren']],
  ['g_knowledge', ['Oordeel_vermogen', 'Oordeel_potentie', 'Oordeel_staf', 'Onderhandelen', 'Tactische_kennis', 'Fysiotherapie', 'Sportwetenschap', 'Data_analyse', 'Jeugd']],
  ['g_gkCoaching', ['KV_distributie', 'KV_vangen', 'KV_reflexen']],
];

// FM sorteert attributen binnen een groep alfabetisch in de taal van de game; wij dus ook,
// op de vertaalde naam. Gebruikt door profiel, vergelijking en het attribuutfilter.
const sortByLabel = keys => [...keys].sort((a, b) => attrName(a).localeCompare(attrName(b), state.lang));

// ---------- EU/EEA-landen ----------
// Landnamen komen uit de dump in de TAAL WAARIN FM DRAAIT. Daarom staat dezelfde lijst
// hier in de gangbare FM-talen; ontbreekt de taal, dan herkent de app geen enkel EU-land
// (filter leeg + elke minderjarige als niet-EU behandeld). Structurele fix — een
// taalonafhankelijk land-ID uit het geheugen — staat in de backlog.
const EU_NATIONS = new Set([
  // nl
  'Nederland', 'België', 'Duitsland', 'Frankrijk', 'Italië', 'Spanje', 'Portugal', 'Ierland',
  'Oostenrijk', 'Polen', 'Zweden', 'Denemarken', 'Finland', 'Tsjechië', 'Slowakije', 'Hongarije',
  'Roemenië', 'Bulgarije', 'Griekenland', 'Kroatië', 'Slovenië', 'Luxemburg', 'Estland', 'Letland',
  'Litouwen', 'Malta', 'Cyprus', 'Noorwegen', 'IJsland', 'Liechtenstein', 'Zwitserland',
  // en
  'Netherlands', 'Belgium', 'Germany', 'France', 'Italy', 'Spain', 'Ireland', 'Austria', 'Poland',
  'Sweden', 'Denmark', 'Czechia', 'Czech Republic', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria',
  'Greece', 'Croatia', 'Slovenia', 'Luxembourg', 'Estonia', 'Latvia', 'Lithuania', 'Norway',
  'Iceland', 'Switzerland',
  // de
  'Niederlande', 'Belgien', 'Deutschland', 'Frankreich', 'Italien', 'Spanien', 'Irland',
  'Österreich', 'Schweden', 'Dänemark', 'Finnland', 'Tschechien', 'Slowakei', 'Ungarn',
  'Rumänien', 'Bulgarien', 'Griechenland', 'Kroatien', 'Slowenien', 'Luxemburg', 'Estland',
  'Lettland', 'Litauen', 'Zypern', 'Norwegen', 'Island', 'Schweiz',
  // fr
  'Pays-Bas', 'Belgique', 'Allemagne', 'Italie', 'Espagne', 'Irlande', 'Autriche', 'Pologne',
  'Suède', 'Danemark', 'Finlande', 'Tchéquie', 'République tchèque', 'Slovaquie', 'Hongrie',
  'Roumanie', 'Bulgarie', 'Grèce', 'Croatie', 'Slovénie', 'Estonie', 'Lettonie', 'Lituanie',
  'Malte', 'Chypre', 'Norvège', 'Islande', 'Suisse',
  // es
  'Países Bajos', 'Bélgica', 'Alemania', 'Francia', 'España', 'Irlanda', 'Polonia', 'Suecia',
  'Dinamarca', 'Finlandia', 'Chequia', 'República Checa', 'Eslovaquia', 'Hungría', 'Rumanía',
  'Rumania', 'Grecia', 'Croacia', 'Eslovenia', 'Luxemburgo', 'Letonia', 'Lituania', 'Chipre',
  'Noruega', 'Islandia', 'Suiza',
  // it
  'Paesi Bassi', 'Belgio', 'Germania', 'Spagna', 'Portogallo', 'Svezia', 'Danimarca',
  'Cechia', 'Repubblica Ceca', 'Slovacchia', 'Ungheria', 'Croazia', 'Lussemburgo', 'Lettonia',
  'Lituania', 'Cipro', 'Norvegia', 'Islanda', 'Svizzera',
  // pt
  'Países Baixos', 'Holanda', 'Alemanha', 'França', 'Itália', 'Espanha', 'Áustria', 'Polónia',
  'Polônia', 'Suécia', 'Chéquia', 'República Tcheca', 'Eslováquia', 'Hungria', 'Roménia',
  'Romênia', 'Bulgária', 'Grécia', 'Croácia', 'Eslovénia', 'Eslovênia', 'Estónia', 'Estônia',
  'Letónia', 'Letônia', 'Lituânia', 'Islândia', 'Suíça',
  // hu
  'Hollandia', 'Németország', 'Franciaország', 'Olaszország', 'Spanyolország', 'Portugália',
  'Írország', 'Ausztria', 'Lengyelország', 'Svédország', 'Dánia', 'Finnország', 'Csehország',
  'Szlovákia', 'Magyarország', 'Görögország', 'Horvátország', 'Szlovénia', 'Észtország',
  'Lettország', 'Litvánia', 'Málta', 'Ciprus', 'Norvégia', 'Izland', 'Svájc',
  // tr
  'Hollanda', 'Belçika', 'Almanya', 'Fransa', 'İtalya', 'İspanya', 'Portekiz', 'İrlanda',
  'Avusturya', 'Polonya', 'İsveç', 'Danimarka', 'Finlandiya', 'Çekya', 'Slovakya', 'Macaristan',
  'Romanya', 'Bulgaristan', 'Yunanistan', 'Hırvatistan', 'Slovenya', 'Lüksemburg', 'Estonya',
  'Letonya', 'Litvanya', 'Kıbrıs', 'Norveç', 'İzlanda', 'Lihtenştayn', 'İsviçre',
].map(s => s.toLowerCase()));
// EU/EER-check: via het nation-ID als dat er is (taalonafhankelijk), anders de naamlijst.
const isEu = p => { const r = natRec(p); return r ? r[4] === 1 : (p.nat || []).some(n => EU_NATIONS.has((n || '').toLowerCase())); };

// Voet: de plugin schrijft NL ('Rechts'/'Links'/'Beide') in de dump → vertalen bij tonen.
// ---------- ontwikkeling: groei t.o.v. een peildatum ----------
// Alles hieronder leest uit één bron: state.hist, opgehaald bij het laden van een dump.
// Daarop draaien de groeikolom, het groeifilter, "alleen nieuwe spelers" en de intakebalk.
//
// Peildatum uit de gekozen periode. De grens van "dit seizoen" is 1 juli, net als bij het
// seizoensrapport. Valt de peildatum vóór de eerste momentopname, dan wordt het stilzwijgend
// de vroegste datum die we hebben: liever "sinds we meten" dan een lege kolom.
const HIST_PERIODS = ['last', 'm6', 'y1', 'season', 'all'];
function histRefDate() {
  const gd = state.meta.gameDate;
  const dates = state.hist ? state.hist.dates : null;
  if (!gd || !dates || dates.length < 2) return null;
  const d = parseGameDate(gd);
  // Lokaal formatteren, consistent met parseGameDate: toISOString zou ten westen van UTC
  // een dag terugvallen.
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const r = (() => {
    switch (state.histPeriod) {
      case 'last': return dates[dates.length - 2];
      case 'm6': { const x = new Date(d); x.setMonth(x.getMonth() - 6); return iso(x); }
      case 'season': { const y = seasonYearOf(); return y ? `${y}-07-01` : dates[0]; }
      case 'all': return dates[0];
      default: { const x = new Date(d); x.setFullYear(x.getFullYear() - 1); return iso(x); }
    }
  })();
  // De belofte uit de comment hierboven waarmaken: peildatum vóór de eerste momentopname
  // wordt de vroegste datum. Zonder clamp kreeg iedereen het stempel "nieuw" zodra de
  // historie korter was dan de gekozen periode. (ISO-strings vergelijken lexicografisch.)
  return r && r < dates[0] ? dates[0] : r;
}
// Basislijn onder CA 40 is geen echte speler maar een half ingevuld record (FM vult
// newgens en niet-gescoute spelers gaandeweg aan). Zonder deze ondergrens bestaat de
// stijgerslijst uit "CA 1 -> 98" zonder naam; mét ondergrens uit echte doorbraken.
const HIST_MIN_BASE = 40;
// De map is op numerieke uid gesleuteld (zie refreshHistDeltas): deze twee functies draaien
// per rij bij elk filter én bij het sorteren, dus een String()-conversie per aanroep zou
// tienduizenden overbodige allocaties per toetsaanslag kosten.
function caGrowth(p) {
  const h = state.hist && state.hist.map.get(p.id);
  if (!h || h[0] == null || h[0] < HIST_MIN_BASE) return null;
  return (p.ca || 0) - h[0];
}
// Nieuw sinds de peildatum: eerste waarneming ligt ná de peildatum.
function isNewSince(p) {
  const h = state.hist && state.hist.map.get(p.id);
  return !!h && h[2] > state.hist.refIdx;
}
// Zonder meetpunten in de map is er niets te tonen, ook al kennen we wel datums (bv. een
// save zonder in-game datum, waardoor er geen peildatum te bepalen valt).
const histReady = () => !!(state.hist && state.hist.dates.length >= 2 && state.hist.map.size);

async function setHistPeriod(per) {
  state.histPeriod = per;
  try { localStorage.setItem('fmss_histperiod', per); } catch { }
  $('f-hist-period').value = per;
  await refreshHistDeltas();
}
// De hele sectie verdwijnt zonder historie of met verborgen CA: een periodekeuze zonder
// data eronder is alleen maar verwarrend.
function renderDevSection() {
  const on = histReady() && !state.hideCapa && state.mode !== 'staff';
  const sec = $('fg-development');
  if (sec) sec.style.display = on ? '' : 'none';
  if (!on) return;
  $('f-hist-period').value = state.histPeriod;
}

async function loadHistDeltas() {
  state.hist = null;
  try {
    const mgr = encodeURIComponent(state.meta.manager || 'default');
    // Eerst alleen de datumlijst (kleine respons), want "sinds de vorige dump" heeft die
    // nodig om een peildatum te kunnen kiezen. Daarna pas de volle set ophalen.
    const probe = await fetch(`/api/history/deltas?manager=${mgr}`);
    if (!probe.ok) return;
    const meta = await probe.json();
    if (!meta.dates || meta.dates.length < 2) return;
    state.hist = { dates: meta.dates, refIdx: 0, map: new Map() };
    await refreshHistDeltas();
  } catch { /* historie is nice-to-have, nooit het laden blokkeren */ }
}
async function refreshHistDeltas() {
  if (!state.hist) return;
  const ref = histRefDate();
  if (!ref) return;
  try {
    const mgr = encodeURIComponent(state.meta.manager || 'default');
    const r = await fetch(`/api/history/deltas?manager=${mgr}&since=${ref}`);
    if (!r.ok) return;
    const j = await r.json();
    // refIdx = laatste momentopname op of vóór de peildatum; alles daarna telt als "nieuw".
    let ri = -1;
    j.dates.forEach((d, i) => { if (d <= ref) ri = i; });
    // Numerieke sleutels: uid's komen als string uit JSON, maar p.id is een getal.
    const map = new Map();
    for (const k in j.p) map.set(+k, j.p[k]);
    state.hist = { dates: j.dates, refIdx: ri, map };
    intakeCache = null;
  } catch { /* laat de vorige stand staan */ }
}

// ---------- intakebalk ----------
// Een jeugdintake is te herkennen aan de vorm van de instroom: veel spelers ineens, en
// bijna allemaal 17 of jonger. Gekalibreerd op 24 echte dumpovergangen: die drempels
// vinden alle zeven intakes (incl. de zuidelijke ronde in oktober) en wijzen elke
// transferwindow-piek af (bv. 510 nieuwe spelers waarvan 11% jong).
const INTAKE_MIN = 200, INTAKE_YOUNG_SHARE = 0.7, INTAKE_MAX_SHARE = 0.4;
// De uitkomst hangt alleen aan de dump en de historie, niet aan filters of taal. Zonder
// deze memo loopt renderIntakeBar bij elke tab- of taalwissel opnieuw door 51k spelers.
let intakeCache = null;
function intakeSince() {
  if (!histReady() || state.hideCapa) return null;
  if (intakeCache) return intakeCache.v;
  const lastIdx = state.hist.dates.length - 1;
  const done = v => { intakeCache = { v }; return v; };
  const fresh = state.players.filter(p => {
    const h = state.hist.map.get(p.id);
    return h && h[2] === lastIdx;
  });
  if (fresh.length < INTAKE_MIN) return done(null);
  // Nieuwe carrière of ineens veel meer competities geladen: dan is "nieuw" betekenisloos.
  if (fresh.length > state.players.length * INTAKE_MAX_SHARE) return done(null);
  const withAge = fresh.filter(p => getAge(p) > 0);
  const young = withAge.filter(p => getAge(p) <= 17).length;
  if (!withAge.length || young / withAge.length < INTAKE_YOUNG_SHARE) return done(null);
  let best = null;
  for (const p of fresh) if (p.pa > 0 && (!best || p.pa > best.pa)) best = p;   // geen sort van 1500 rijen
  return done({ n: fresh.length, best });
}
function renderIntakeBar() {
  const bar = $('intake-bar');
  if (!bar) return;
  const key = state.hist ? state.hist.dates[state.hist.dates.length - 1] : '';
  const info = state.mode === 'players' && localStorage.getItem('fmss_intake_seen') !== key ? intakeSince() : null;
  if (!info) { bar.classList.add('hidden'); return; }
  const best = info.best
    ? `<span class="ib-best">${tf('intakeBest', { p: `${escHtml(info.best.name)}, ${getAge(info.best)}, ${escHtml(info.best.club || '?')}` })} · PA ${info.best.pa}</span>` : '';
  bar.innerHTML = `${icon('ball', 14)}<span class="ib-txt">${escHtml(tf('intakeTitle', { n: info.n.toLocaleString(uiLocale()) }))}</span>${best}
    <button class="ib-go">${t('intakeShow')}</button>
    <button class="ib-x" title="${t('donateLater')}">${icon('x', 12)}</button>`;
  bar.classList.remove('hidden');
  const dismiss = () => { try { localStorage.setItem('fmss_intake_seen', key); } catch { } bar.classList.add('hidden'); };
  bar.querySelector('.ib-x').onclick = dismiss;
  bar.querySelector('.ib-go').onclick = async () => {
    dismiss();
    $('btn-clear').onclick();
    await setHistPeriod('last');
    $('f-new').checked = true;
    $('f-age-max').value = 18;
    state.sortKey = 'pa'; state.sortDir = -1;
    renderTable(); applyFilters();
  };
}

// Wonderkid: jong, veel groei over én een top uitzicht. Eén definitie voor het filter en
// het gouden randje op de spelerskaart, zodat die twee niet uit elkaar kunnen lopen.
// Leeftijd 0/onbekend telt niet mee.
//
// De PA-drempel is er bewust bij (26-07): zonder die eis haalt bijna elke zestienjarige de
// 25 punten groei, en dan is 28% van de database "wonderkid" (14.201 van 51.345 spelers in
// een echte save). Met PA >= 150 blijven er 556 over: een lijst waar je echt op kunt scouten,
// en goud op de kaart betekent weer iets.
const WONDERKID_PA = 150;
function isWonderkid(p) {
  const a = getAge(p);
  return a > 0 && a <= 21 && (p.pa || 0) >= WONDERKID_PA && (p.pa || 0) - (p.ca || 0) >= 25;
}
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
// Landnamen: bij voorkeur via het taalonafhankelijke nation-ID uit de dump (natId,
// plugin 0.1.44+) en de NATIONS-tabel uit nations.js: dan klopt de weergave in elke
// game- én app-taal (issue #15). Oude dumps zonder natId vallen terug op de naamstring,
// met de NL→EN-tabel voor niet-NL app-talen.
const NAT_LANG_IDX = { nl: 0, en: 1, fr: 2, de: 3 };
const natRec = p => (typeof NATIONS !== 'undefined' && p && p.natId && NATIONS[p.natId]) || null;
const natLabel = n => state.lang !== 'nl' ? (NATION_EN[n] || n) : n;
const natsLabel = p => { const r = natRec(p); return r ? r[NAT_LANG_IDX[state.lang] ?? 1] : (p.nat || []).map(natLabel).join(', '); };

// Kolommen die onder de "verborgen stats"-toggle vallen: CA/PA zelf, plus meta-score en
// vraagprijs (beide afgeleid van/verweven met verborgen data, Marks keuze).
// Groei is uit CA afgeleid, dus die valt onder dezelfde verberg-toggle. Zonder historie
// bestaat de kolom niet: hem tonen met overal "–" zou alleen maar vragen oproepen.
// PA-meta valt onder béíde toggles: hij is uit meta-gewichten én PA afgeleid.
const hiddenStatCol = k => (state.hideCapa && (k === 'ca' || k === 'pa' || k === 'fee' || k === 'growth' || k === 'metapa'))
  || (state.hideMeta && (k === 'meta' || k === 'metapa')) || (k === 'growth' && !histReady());

// ---------- geld ----------
// Salarisweergave: de dump bewaart loon per week; alleen de wéérgave rekent om.
// Filters en interne modellen (interesse, loonplafond) blijven op weekbasis werken.
const WAGE_FACTOR = { w: 1, m: 52 / 12, y: 52 };
const wageFactor = () => WAGE_FACTOR[state.wagePer] || 1;
const fmtWage = v => v == null ? '–' : fmtMoney(v * wageFactor());
const wageSuf = () => t(state.wagePer === 'm' ? 'perMonthSuf' : state.wagePer === 'y' ? 'perYearSuf' : 'perWeekSuf');
function fmtMoney(v) {
  if (v == null) return '–';
  const sym = CUR_RATE[state.cur] ? state.cur : '£';   // onbekende localStorage-waarde → £
  const val = v * CUR_RATE[sym];
  if (val === 0) return sym + '0';
  const abs = Math.abs(val);
  if (abs >= 1e9) return sym + (val / 1e9).toFixed(2) + ({ nl: ' mld', en: 'B', fr: ' Md', de: ' Mrd.' }[state.lang] || 'B');
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
// In-game datums ('yyyy-mm-dd') als LOKALE middernacht parsen. new Date('yyyy-mm-dd') is
// UTC-middernacht; wie daarna lokale velden leest (getMonth/getDate) zit ten westen van
// UTC een dag te vroeg: leeftijden en de seizoensgrens verschoven voor Amerikaanse gebruikers.
const parseGameDate = s => new Date(String(s) + 'T00:00:00');
function gameNow() {
  const g = state.meta.gameDate ? parseGameDate(state.meta.gameDate) : new Date();
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
  { key: 'pos', label: 'c_pos', get: p => posRank(p), render: p => p.pos ? escHtml(p.pos) : '<span class="dim">–</span>', w: 95 },
  { key: 'club', label: 'c_club', get: p => p.club || '', render: p => clubLabel(p), w: 175 },
  { key: 'div', label: 'c_div', get: p => p.div || '', render: p => p.div ? escHtml(p.div) : '<span class="dim">–</span>', defHidden: true, w: 170 },
  { key: 'nat', label: 'c_nat', get: p => natsLabel(p), w: 115 },
  { key: 'eu', label: 'EU', get: p => isEu(p) ? 1 : 0, render: p => isEu(p) ? `<span class="eu-yes">${icon('check', 12)}</span>` : '<span class="dim">–</span>', w: 42 },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca), w: 56 },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa), w: 56 },
  // Groei: null bij spelers zonder basislijn (nieuw of te dun record). Bewust géén 0, want
  // de sortering zet null onderaan; met 0 zouden newgens bovenin een stijgerslijst staan.
  { key: 'growth', label: 'c_growth', num: true, help: 'growthHint', get: caGrowth, render: p => growthHtml(p), w: 74 },
  { key: 'meta', label: 'c_meta', num: true, help: 'metaHint', get: p => metaScore(p), render: p => metaHtml(p), w: 64 },
  { key: 'metapa', label: 'c_metapa', num: true, help: 'metaPaHint', get: p => metaPaScore(p), render: p => metaPaHtml(p), w: 68 },
  { key: 'value', label: 'c_value', num: true, get: p => estValue(p).v, render: p => estHtml(p), w: 95 },
  { key: 'fee', label: 'c_fee', num: true, get: p => { const f = feeEstimate(p); return f.v == null ? -1 : f.v; }, render: p => feeHtml(p), w: 105 },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtWage, w: 100 },
  { key: 'expires', label: 'c_expires', get: p => p.expires, fmt: fmtDate, tdCls: p => expiresHtml(p).cls, w: 110 },
  { key: 'interest', label: 'c_interest', help: 'interestHint', get: p => { const i = interestEstimate(p); return i ? i.score : -1; }, render: p => intHtml(p), w: 110 },
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
  { key: 'job', label: 'c_role', get: p => jobLabel(p), w: 150 },
  { key: 'club', label: 'c_club', get: p => p.club || '', render: p => clubLabel(p), w: 175 },
  { key: 'nat', label: 'c_nat', get: p => natsLabel(p), w: 115 },
  { key: 'ca', label: 'CA', num: true, get: p => p.ca, render: p => qHtml(p.ca), w: 56 },
  { key: 'pa', label: 'PA', num: true, get: p => p.pa, render: p => qHtml(p.pa), w: 56 },
  { key: 'wage', label: 'c_wage', num: true, get: p => p.wage, fmt: fmtWage, w: 100 },
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
  if (p.clubRep > 0) return `<span class="dim" data-tip="${escHtml(tf('clubNotRead', { r: p.clubRep }))}">${t('clubUnknown')}</span>`;
  // Transfervrij: streepje met tooltip (de status-pill "clubloos" vertelt het al).
  return `<span class="dim" data-help="clubless">–</span>`;
}
// Gememoiseerd per speler (_ev); zie metaScore. Consumers lezen het object alleen.
function estValue(p) {
  if (p._ev !== undefined) return p._ev;
  return p._ev = estValueCalc(p);
}
function estValueCalc(p) {
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
  if (e.v === 0) return `<span class="dim" data-help="free_l">–</span>`;
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
// Gememoiseerd per speler (_fee); zie metaScore.
function feeEstimate(p) {
  if (p._fee !== undefined) return p._fee;
  return p._fee = feeEstimateCalc(p);
}
function feeEstimateCalc(p) {
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
  if (f.v === 0) return `<span class="dim" data-help="free_l">–</span>`;
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
// Gememoiseerd per speler (_int); het label bevat vertaalde tekst, dus de cache is
// gestempeld met de taal en wordt bij een taalwissel per speler opnieuw berekend.
function interestEstimate(p) {
  if (p._int !== undefined && p._intL === state.lang) return p._int;
  p._intL = state.lang;
  return p._int = interestEstimateCalc(p);
}
function interestEstimateCalc(p) {
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
  return `<span class="int ${i.cls}" data-tip="${i.score}/100">${i.label}</span>`;
}

function statusHtml(p) {
  let h = '';
  if (isFree(p)) h += `<span class="tag free">${t('tag_free')}</span>`;
  if (p.listed) h += `<span class="tag listed">${t('tag_listed')}</span>`;
  if (p.loanListed) h += `<span class="tag listed">${t('tag_loan')}</span>`;
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
const advLabel = k => isStaffAttrKey(k) ? staffAttrName(k) : ADV_PERS_KEYS.includes(k) ? t(k) : ADV_HIDDEN_KEYS.includes(k) ? t('a_' + k) : attrName(k);
const advValue = (p, k) => p.staffAttrs ? (p.staffAttrs[k] ?? null) : ADV_PERS_KEYS.includes(k) ? (p[k] || null) : (p.attrs ? p.attrs[k] : null);
const getCurAdvRules = () => state.mode === 'staff' ? (state.advStaffF ||= []) : state.advF;
const activeAdvRules = () => getCurAdvRules().filter(r => r.k && (r.min || r.max) && !(state.hideCapa && advIsHidden(r.k)));
const advChipTxt = r => `${advLabel(r.k)} ${r.min && r.max ? r.min + '–' + r.max : r.min ? '≥ ' + r.min : '≤ ' + r.max}`;
function saveAdv() {
  localStorage.setItem('fmss_adv', JSON.stringify(state.advF));
  localStorage.setItem('fmss_adv_staff', JSON.stringify(state.advStaffF || []));
  updateAdvBtn();
}
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
  const isStaff = state.mode === 'staff';
  const getRules = () => isStaff ? (state.advStaffF ||= []) : state.advF;
  let curRules = getRules();

  // Doorzoekbare attributencatalogus: speler-, staf-, verborgen en persoonlijkheidsattributen.
  const catalog = [];
  if (isStaff) {
    for (const [g, keys] of STAFF_ATTR_GROUPS) {
      const sortedKeys = [...keys].sort((a, b) => staffAttrName(a).localeCompare(staffAttrName(b), state.lang));
      for (const k of sortedKeys) catalog.push({ k, label: staffAttrName(k), group: t(g) });
    }
  } else {
    const gkOnly = ATTR_GROUPS_GK[0][1].filter(k => !ATTR_GROUPS_OUTFIELD.some(([, ks]) => ks.includes(k)));
    for (const [g, keys] of [...ATTR_GROUPS_OUTFIELD, ['g_goalkeeping', gkOnly]])
      for (const k of sortByLabel(keys)) catalog.push({ k, label: attrName(k), group: t(g) });
    if (!state.hideCapa) {
      const byT = (a, b) => a.localeCompare(b, state.lang);
      for (const k of [...ADV_HIDDEN_KEYS].sort((a, b) => byT(t('a_' + a), t('a_' + b)))) catalog.push({ k, label: t('a_' + k), group: t('hiddenTitle') });
      for (const k of [...ADV_PERS_KEYS].sort((a, b) => byT(t(a), t(b)))) catalog.push({ k, label: t(k), group: t('personaTitle') });
    }
  }
  // Escape sluit eerst een open attributen-dropdown, daarna pas de popup zelf.
  const esc = e => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    const dd = m.querySelector('.adv-dd:not(.hidden)');
    if (dd) dd.classList.add('hidden'); else close();
  };
  const close = () => {
    if (isStaff) state.advStaffF = state.advStaffF.filter(r => r.k);
    else state.advF = state.advF.filter(r => r.k);
    saveAdv();
    m.classList.add('hidden');
    document.removeEventListener('keydown', esc, true);
  };
  const render = () => {
    curRules = getRules();
    m.innerHTML = `<div class="pm-card adv-card">
      <div class="pm-title">${t('advTitle')}</div>
      <div class="adv-head"><span class="ah-attr">${t('advColAttr')}</span><span class="ah-mm">${t('advMin')}</span><span class="ah-mm">${t('advMax')}</span><span class="ah-sp"></span></div>
      <div id="adv-rows">` + curRules.map((r, i) => `
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
      const r = curRules[+row.dataset.i];
      const kin = row.querySelector('.adv-kin'), dd = row.querySelector('.adv-dd');
      // Combobox: klikken opent de volledige (gegroepeerde) lijst, typen filtert hem.
      const buildDd = termRaw => {
        const term = (termRaw || '').trim().toLowerCase();
        const used = new Set(curRules.filter(x => x !== r && x.k).map(x => x.k));
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
      row.querySelector('.adv-x').onclick = () => { curRules.splice(+row.dataset.i, 1); saveAdv(); applyFilters(); render(); };
    });
    m.querySelector('.adv-add').onclick = () => {
      curRules.push({ k: '', min: 0, max: 0 });
      render();
      const kins = m.querySelectorAll('.adv-kin');
      const last = kins[kins.length - 1];
      last.focus(); last.onfocus();   // dropdown meteen open, ook als het focus-event niet vuurt
    };
    m.querySelector('.pm-cancel').onclick = () => { curRules.length = 0; saveAdv(); applyFilters(); render(); };
    m.querySelector('.pm-ok').onclick = close;
  };
  document.addEventListener('keydown', esc, true);
  m.onclick = e => { if (e.target === m) close(); };
  if (!curRules.length) curRules.push({ k: '', min: 0, max: 0 });
  render();
  m.classList.remove('hidden');   // eerst zichtbaar, anders pakt focus() niet
  const firstEmpty = [...m.querySelectorAll('.adv-row')].find(row => !curRules[+row.dataset.i].k);
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
  fr: { gk: 'Gardien', sk: 'Gardien libéro', cd: 'Défenseur central', bpd: 'Défenseur relanceur', fb: 'Arrière latéral', wb: 'Piston', dm: 'Milieu défensif', dlp: 'Meneur reculé', bwm: 'Récupérateur', cm: 'Milieu central', b2b: 'Milieu box-to-box', ap: 'Meneur avancé', wing: 'Ailier', if: 'Attaquant intérieur', am: 'Milieu offensif', af: 'Attaquant avancé', poacher: 'Renard des surfaces', tm: 'Pivot', cf: 'Attaquant complet' },
  de: { gk: 'Torwart', sk: 'Mitspielender Torwart', cd: 'Innenverteidiger', bpd: 'Ballspielender Innenverteidiger', fb: 'Außenverteidiger', wb: 'Flügelverteidiger', dm: 'Defensiver Mittelfeldspieler', dlp: 'Tiefer Spielmacher', bwm: 'Balleroberer', cm: 'Zentraler Mittelfeldspieler', b2b: 'Box-to-Box-Spieler', ap: 'Offensiver Spielmacher', wing: 'Flügelspieler', if: 'Inverser Flügelstürmer', am: 'Offensiver Mittelfeldspieler', af: 'Vorgezogene Spitze', poacher: 'Knipser', tm: 'Zielspieler', cf: 'Komplette Spitze' },
};
const roleName = id => (ROLE_LABEL[state.lang]?.[id] ?? ROLE_LABEL.en[id] ?? id);

// Staffuncties: de dump draagt sinds plugin 0.1.45 het functie-byte (jobId) naast de
// NL-naamstring. Met het id vertalen we per app-taal; oude dumps of onbekende id's
// vallen terug op de dumpstring, en het generieke "Staflid" krijgt zijn eigen sleutel.
const JOB_LABEL = {
  nl: { 1: 'Speler', 2: 'Coach', 3: 'Speler/Coach', 4: 'Voorzitter', 6: 'Directeur', 8: 'Algemeen directeur', 10: 'Technisch directeur', 12: 'Fysiotherapeut', 14: 'Scout', 16: 'Manager', 17: 'Speler/Manager', 20: 'Assistent-manager', 21: 'Speler/Assistent-manager', 22: 'Media-analist', 24: 'Algemeen manager', 26: 'Fitnesscoach', 27: 'Speler/Fitnesscoach', 34: 'Keeperstrainer', 35: 'Speler/Keeperstrainer', 36: 'Hoofd data-analyse', 38: 'Clubarts', 40: 'Hoofd sportwetenschap', 42: 'Data-analist', 44: 'Hoofdscout', 45: 'Speler/Hoofdscout', 46: 'Arts', 48: 'Sportwetenschapper', 49: 'Speler/Jeugdtrainer', 50: 'Hoofd fysiotherapie', 52: 'U19-manager', 54: 'Trainer eerste elftal', 64: 'Hoofd jeugdopleiding', 65: 'Speler/Hoofd jeugd', 66: 'Eigenaar', 70: 'President', 86: 'Loanmanager', 88: 'Technisch directeur', 144: 'Interim-manager' },
  en: { 1: 'Player', 2: 'Coach', 3: 'Player/Coach', 4: 'Chairman', 6: 'Director', 8: 'Managing director', 10: 'Director of football', 12: 'Physio', 14: 'Scout', 16: 'Manager', 17: 'Player/Manager', 20: 'Assistant manager', 21: 'Player/Assistant manager', 22: 'Media analyst', 24: 'General manager', 26: 'Fitness coach', 27: 'Player/Fitness coach', 34: 'Goalkeeping coach', 35: 'Player/GK coach', 36: 'Head of data analysis', 38: 'Club doctor', 40: 'Head of sports science', 42: 'Data analyst', 44: 'Chief scout', 45: 'Player/Chief scout', 46: 'Doctor', 48: 'Sports scientist', 49: 'Player/Youth coach', 50: 'Head physio', 52: 'U19 manager', 54: 'First-team coach', 64: 'Head of youth development', 65: 'Player/Head of youth', 66: 'Owner', 70: 'President', 86: 'Loan manager', 88: 'Technical director', 144: 'Caretaker manager' },
  fr: { 1: 'Joueur', 2: 'Entraîneur', 3: 'Joueur/Entraîneur', 4: 'Président du conseil', 6: 'Directeur', 8: 'Directeur général', 10: 'Directeur sportif', 12: 'Kinésithérapeute', 14: 'Recruteur', 16: 'Manager', 17: 'Joueur/Manager', 20: 'Adjoint', 21: 'Joueur/Adjoint', 22: 'Analyste média', 24: 'Manager général', 26: 'Préparateur physique', 27: 'Joueur/Préparateur physique', 34: 'Entraîneur des gardiens', 35: 'Joueur/Entraîneur des gardiens', 36: 'Resp. analyse de données', 38: 'Médecin du club', 40: 'Resp. sciences du sport', 42: 'Analyste de données', 44: 'Recruteur en chef', 45: 'Joueur/Recruteur en chef', 46: 'Médecin', 48: 'Scientifique du sport', 49: 'Joueur/Entraîneur de jeunes', 50: 'Kiné en chef', 52: 'Manager U19', 54: 'Entraîneur équipe première', 64: 'Resp. formation', 65: 'Joueur/Resp. formation', 66: 'Propriétaire', 70: 'Président', 86: 'Resp. des prêts', 88: 'Directeur technique', 144: 'Entraîneur intérimaire' },
  de: { 1: 'Spieler', 2: 'Trainer', 3: 'Spielertrainer', 4: 'Vorsitzender', 6: 'Direktor', 8: 'Geschäftsführer', 10: 'Sportdirektor', 12: 'Physiotherapeut', 14: 'Scout', 16: 'Manager', 17: 'Spielermanager', 20: 'Co-Trainer', 21: 'Spieler/Co-Trainer', 22: 'Medienanalyst', 24: 'General Manager', 26: 'Fitnesstrainer', 27: 'Spieler/Fitnesstrainer', 34: 'Torwarttrainer', 35: 'Spieler/Torwarttrainer', 36: 'Leiter Datenanalyse', 38: 'Vereinsarzt', 40: 'Leiter Sportwissenschaft', 42: 'Datenanalyst', 44: 'Chefscout', 45: 'Spieler/Chefscout', 46: 'Arzt', 48: 'Sportwissenschaftler', 49: 'Spieler/Jugendtrainer', 50: 'Leitender Physiotherapeut', 52: 'U19-Trainer', 54: 'Trainer 1. Mannschaft', 64: 'Leiter Nachwuchs', 65: 'Spieler/Nachwuchsleiter', 66: 'Eigentümer', 70: 'Präsident', 86: 'Leihspielermanager', 88: 'Technischer Direktor', 144: 'Interimstrainer' },
};
const jobLabel = p => {
  const L = JOB_LABEL[state.lang] || JOB_LABEL.en;
  if (p && p.jobId && L[p.jobId]) return L[p.jobId];
  if (p && p.job === 'Staflid') return t('jobStaff');
  return (p && p.job) || '–';
};
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
// Weights = measured points-impact per attribute from FM-Arena's attribute testing
// (fm-arena.com/table/26-player-attributes-testing). Pace/Acceleration dominate by far.
// The score (1-20 scale) expresses "how meta are this player's attributes" independently
// of role or CA. Attributes with no measurable positive effect are excluded.
// Global baseline (fallback / PA projection). Not used by per-position routing any more.
const META_W = {
  Pace: 20.5, Acceleration: 20.4, JumpingReach: 11.6, Dribbling: 9.8, Balance: 5.3,
  Concentration: 4.5, Anticipation: 4.3, Determination: 2.7, Agility: 2.7, Stamina: 2.5,
  Strength: 1.9, Composure: 1.2, WorkRate: 1.1, Finishing: 1.1, LongShots: 1.0,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// GK: harvestgreen22 FM24 keeper retest (fm-arena.com/thread/18816). FM26 unchanged.
// Pressure on p.pressure (personality field), not p.attrs.
const META_GK_W = {
  Reflexes: 12.8, Agility: 8.0, Acceleration: 4.7, Pressure: 4.1, Pace: 3.5, AerialReach: 3.4,
  Consistency: 2.0, ImportantMatches: 2.0, InjuryProneness: 1.5,
};

// ---------- per-position weight tables ----------
// Source: harvestgreen22 FM26 global test + Orion FM24 per-position regression (same engine).
// Tier 1 (Pace/Acc ~20): unchanged across all outfield positions.
// Tier 2+: derived from Orion's per-position coefficients, scaled to same range.
// Hidden attrs: Pressure (non-linear, massive effect), Consistency, ImportantMatches (modest).
// Adverse attrs (high = bad): InjuryProneness (mid-match injury risk), Dirtiness (card risk).
//   These are scored as (21 - value) * weight — NEVER use negative weights.
// To tune a group: change its constant; everything else adapts automatically.

// DC — JumpingReach rises to tier-1 (equal to Pace/Acc per Orion). Finishing removed.
const META_DC_W = {
  Pace: 20.5, Acceleration: 20.4, JumpingReach: 18.0,
  WorkRate: 6.5, Anticipation: 6.5, Concentration: 5.5, Balance: 4.0,
  Strength: 3.5, Determination: 3.0, Stamina: 2.5, Agility: 2.0, Aggression: 1.5,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// FB/WB — Stamina/WorkRate up vs DC; Crossing added (WB role); JumpingReach less critical.
const META_FB_W = {
  Pace: 20.5, Acceleration: 20.4,
  Stamina: 7.0, WorkRate: 7.0, Agility: 4.5, Anticipation: 5.0,
  Concentration: 5.0, Balance: 5.0, Dribbling: 3.5, Determination: 3.0,
  Crossing: 2.5, JumpingReach: 1.5,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// DM — WorkRate/Anticipation up vs MC; JumpingReach present; Dribbling minimal.
const META_DM_W = {
  Pace: 20.5, Acceleration: 20.4,
  WorkRate: 7.0, Stamina: 6.5, Anticipation: 6.0, JumpingReach: 5.0,
  Concentration: 5.0, Balance: 4.0, Determination: 3.0,
  Agility: 3.0, Strength: 2.5, Dribbling: 1.5,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// MC — Dribbling/Agility up vs DM; LongShots added (3× more impactful vs FM24).
const META_MC_W = {
  Pace: 20.5, Acceleration: 20.4,
  WorkRate: 6.0, Stamina: 6.0, Agility: 5.5, Anticipation: 5.0,
  Concentration: 5.0, Balance: 4.5, Dribbling: 4.5,
  Determination: 3.0, LongShots: 2.5, Composure: 2.0,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// WM (ML/MR) — Dribbling/Crossing prominent; balanced Stamina/WorkRate.
const META_WM_W = {
  Pace: 20.5, Acceleration: 20.4,
  Dribbling: 7.0, Agility: 6.0, Stamina: 5.5, WorkRate: 5.5, Balance: 5.0,
  Anticipation: 4.0, Concentration: 4.0, Determination: 3.0,
  Crossing: 3.5, Finishing: 2.5,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// AM/Wing (AML/AMR/AMC) — Dribbling/Finishing up; Crossing de-emphasised (non-linear per GFO).
const META_AM_W = {
  Pace: 20.5, Acceleration: 20.4,
  Dribbling: 9.0, Agility: 7.0, Balance: 5.5, Finishing: 5.0,
  WorkRate: 4.0, Stamina: 4.0, Anticipation: 4.0,
  Composure: 3.5, Concentration: 3.0, Determination: 2.5,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// ST — Finishing rises to near-tier-1; LongShots significant (3× impact); JumpingReach still relevant.
const META_ST_W = {
  Pace: 20.5, Acceleration: 20.4, Finishing: 12.0, Dribbling: 7.5,
  Agility: 5.5, Composure: 4.5, Balance: 4.5, LongShots: 4.0,
  JumpingReach: 3.5, WorkRate: 3.5, Determination: 3.0, Concentration: 2.5,
  Pressure: 5.0, Consistency: 2.0, ImportantMatches: 2.0,
  InjuryProneness: 1.5, Dirtiness: 1.5,
};

// ---------- per-position routing ----------
// Each FM position code maps to one of these named groups. To give a group its own
// weight table, replace the entry in META_W_BY_GROUP below.
const POS_TO_META_GROUP = {
  GK:  'GK',
  DC:  'DC',  DL: 'FB',  DR: 'FB',  WBL: 'FB',  WBR: 'FB',
  DM:  'DM',
  MC:  'MC',  ML: 'WM',  MR: 'WM',
  AML: 'AM',  AMR: 'AM', AMC: 'AM',
  ST:  'ST',
};

// Label shown next to each group's score in the player card
const META_GROUP_LABEL = {
  GK: 'GK', DC: 'DC', FB: 'FB', DM: 'DM', MC: 'MC', WM: 'WM', AM: 'AM', ST: 'ST',
};

// Weight table per group — each outfield group now has its own research-derived table.
const META_W_BY_GROUP = {
  GK: META_GK_W,
  DC: META_DC_W,
  FB: META_FB_W,
  DM: META_DM_W,
  MC: META_MC_W,
  WM: META_WM_W,
  AM: META_AM_W,
  ST: META_ST_W,
};

// High value = bad. Use (21 - value) to keep the 1-20 scale intact.
// NEVER add these to a weight table with a negative weight — that breaks the floor.
const META_ADVERSE = new Set(['InjuryProneness', 'Dirtiness']);

// Non-linear attribute transforms applied after adverse-inversion.
// WorkRate/Pressure: severe floor penalty below 6 (harvestgreen22: -18% win rate in 1-6 range).
// Pace/Acc: accelerating returns above 15 (research: 17+ dominates; not strictly linear).
const ATTR_TRANSFORM = {
  WorkRate:     v => v < 6 ? v * 0.5 : v,
  Pressure:     v => v < 6 ? v * 0.5 : v,
  Pace:         v => v < 15 ? v : 15 + (v - 15) * 1.5,
  Acceleration: v => v < 15 ? v : 15 + (v - 15) * 1.5,
};

function weightedMetaWithWeights(p, attrs, W) {
  let sum = 0, w = 0;
  for (const k in W) {
    const raw = k === 'Pressure' ? (p.pressure > 0 ? p.pressure : null) : (attrs ? attrs[k] : null);
    if (raw == null) continue;
    const effective = META_ADVERSE.has(k) ? 21 - raw : raw;
    const transformed = ATTR_TRANSFORM[k] ? ATTR_TRANSFORM[k](effective) : effective;
    sum += transformed * W[k];
    w += W[k];
  }
  return w ? sum / w : null;
}

// Proficiency factor: linear fit to harvestgreen22's data (FM24/FM26 same engine).
// prof=20 → 1.0, prof=4 → 0.592, prof=0 (untrained) → 0.40 (max penalty), clamped to [0.40, 1.0].
// null = no proficiency data at all → 1.0 (no penalty; assume data unavailable, not untrained).
function proficiencyFactor(prof) {
  if (prof == null) return 1.0;
  if (prof <= 0) return 0.40;
  return Math.max(0.40, 0.49 + 0.51 * (prof / 20));
}

// Returns {group → rawScore} for all meta groups using the given attrs (no proficiency applied).
function rawMetaByGroup(p, attrs) {
  const out = {};
  for (const [g, W] of Object.entries(META_W_BY_GROUP)) {
    const s = weightedMetaWithWeights(p, attrs, W);
    if (s != null) out[g] = s;
  }
  return out;
}

// Returns [{pos, group, label, prof, meta, effectiveMeta}] for each trained FM position,
// sorted by effectiveMeta desc.
//   meta         = raw score from the group's weight table (DR and WBR share the FB table)
//   effectiveMeta = meta × proficiencyFactor(prof for that specific FM position only)
// Falls back to posArr with prof=null (no penalty) when posProficiency is absent (old dump).
function metaScoresByPosition(p, attrs) {
  if (!attrs) return [];
  const raw = rawMetaByGroup(p, attrs);
  const profDict = p.posProficiency;
  const hasProfData = profDict && Object.keys(profDict).length > 0;
  const posEntries = hasProfData
    ? Object.entries(profDict)
    : (p.posArr || []).map(pos => [pos, null]);
  const seen = new Set();
  return posEntries
    .map(([pos, prof]) => {
      if (seen.has(pos)) return null;
      seen.add(pos);
      const group = POS_TO_META_GROUP[pos];
      if (!group) return null;
      const meta = raw[group];
      if (meta == null) return null;
      const effectiveMeta = meta * proficiencyFactor(prof);
      return { pos, group, label: META_GROUP_LABEL[group], prof, meta, effectiveMeta };
    })
    .filter(Boolean)
    .sort((a, b) => b.effectiveMeta - a.effectiveMeta);
}

// Single number for table sorting: best effective meta across all trained positions.
function metaScore(p) {
  if (p._meta !== undefined) return p._meta;
  if (!p.attrs) return p._meta = null;
  const positions = metaScoresByPosition(p, p.attrs);
  return p._meta = positions.length ? positions[0].effectiveMeta : null;
}

// PA-meta: same logic with projected attributes, same proficiency.
function metaPaScore(p) {
  if (p._metaPa !== undefined) return p._metaPa;
  const cur = metaScore(p);
  if (cur == null) return p._metaPa = null;
  const proj = projectAttrs(p);
  if (!proj) return p._metaPa = cur;
  const positions = metaScoresByPosition(p, proj);
  const s = positions.length ? positions[0].effectiveMeta : null;
  return p._metaPa = s == null ? cur : Math.max(cur, s);
}

function metaHtml(p) {
  const s = metaScore(p);
  return s == null ? '<span class="dim">–</span>' : `<span class="${roleClass(s)}" data-help="metaLabel">${s.toFixed(1)}</span>`;
}
function metaPaHtml(p) {
  const s = metaPaScore(p);
  return s == null ? '<span class="dim">–</span>' : `<span class="${roleClass(s)}" data-help="metaPaHint">${s.toFixed(1)}</span>`;
}
// Groei in de tabel: dezelfde kleurtaal als de ontwikkelgrafiek. Nieuwe spelers krijgen
// "nieuw" in plaats van een streepje, want dát is de informatie die je zoekt.
function growthHtml(p) {
  const g = caGrowth(p);
  if (g == null) return isNewSince(p) ? `<span class="gr-new">${t('grNew')}</span>` : '<span class="dim">–</span>';
  if (g === 0) return '<span class="dim">0</span>';
  return `<span class="gr-${g > 0 ? 'up' : 'down'}">${g > 0 ? '+' : '−'}${Math.abs(g)}</span>`;
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
  const thr = $('f-prof-threshold');
  if (thr) {
    thr.value = state.profThreshold;
    thr.oninput = () => {
      const v = Math.max(1, Math.min(20, parseInt(thr.value, 10) || 1));
      state.profThreshold = v;
      localStorage.setItem('fmss_profthreshold', v);
      if (activePos.size) applyFilters();
    };
  }
}

// ---------- data laden ----------
// Streamende dump-parser: knipt meta/speler-/stafobjecten één voor één uit de bytestroom.
// Nodig omdat een dump van een volledig geladen database (600k+ personen, honderden MB's)
// niet in één JavaScript-string of JSON.parse past (V8-limiet ~512 MB per string).
// Leunt op de vaste plugin-structuur: {"meta":{...},"players":[{...}...],"staff":[{...}...]}.
// String-interning: JSON.parse maakt voor elke voorkomen een nieuw string-object, ook
// als de inhoud identiek is. Club-, divisie- en datumwaarden komen in een grote dump
// honderdduizenden keren voor; één canonieke instantie per waarde scheelt honderden MB
// piekgeheugen bij mega-dumps (600k+ personen).
const INTERN_KEYS = ['club', 'ownerClub', 'div', 'pos', 'foot', 'expires', 'dob', 'job'];
function internStrings(obj, pool) {
  for (const k of INTERN_KEYS) {
    const v = obj[k];
    if (typeof v === 'string') { const c = pool.get(v); if (c !== undefined) obj[k] = c; else pool.set(v, v); }
  }
  for (const arrK of ['nat', 'posArr']) {
    const a = obj[arrK];
    if (a) for (let i = 0; i < a.length; i++) { const c = pool.get(a[i]); if (c !== undefined) a[i] = c; else pool.set(a[i], a[i]); }
  }
}

async function parseDumpStream(resp, total, onProgress) {
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  const data = { meta: {}, players: [], staff: [] };
  const pool = new Map();
  let buf = '', pos = 0;            // onverwerkte staart + scanpositie daarin
  let depth = 0, inStr = false, esc = false;
  let key = '', keyStart = -1;      // top-level sleutel (op diepte 1)
  let curKey = null;                // actieve sectie: meta | players | staff
  let elemStart = -1, elemDepth = 0;
  let got = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value.length;
    onProgress(got);
    buf += dec.decode(value, { stream: true });
    for (; pos < buf.length; pos++) {
      const c = buf.charCodeAt(pos);
      if (inStr) {
        if (esc) esc = false;
        else if (c === 92) esc = true;                          // \
        else if (c === 34) {                                    // sluitende "
          inStr = false;
          if (keyStart >= 0) { key = buf.slice(keyStart, pos); keyStart = -1; }
        }
      } else if (c === 34) {                                    // openende "
        inStr = true;
        if (depth === 1 && elemStart < 0) keyStart = pos + 1;
      } else if (c === 58) {                                    // :
        if (depth === 1 && key) { curKey = key; key = ''; }
      } else if (c === 123 || c === 91) {                       // { of [
        depth++;
        if (elemStart < 0 && c === 123 &&
            ((curKey === 'meta' && depth === 2) ||
             ((curKey === 'players' || curKey === 'staff') && depth === 3))) {
          elemStart = pos; elemDepth = depth;
        }
      } else if (c === 125 || c === 93) {                       // } of ]
        if (elemStart >= 0 && depth === elemDepth) {
          const obj = JSON.parse(buf.slice(elemStart, pos + 1));
          if (curKey === 'meta') data.meta = obj;
          else { internStrings(obj, pool); data[curKey].push(obj); }
          elemStart = -1;
        }
        depth--;
      }
    }
    // Verwerkte deel weggooien; loopt er nog een element of sleutel, dan vanaf daar bewaren.
    const cut = Math.min(elemStart >= 0 ? elemStart : buf.length, keyStart >= 0 ? keyStart - 1 : buf.length, pos);
    if (cut > 0) {
      buf = buf.slice(cut);
      pos -= cut;
      if (elemStart >= 0) elemStart -= cut;
      if (keyStart >= 0) keyStart -= cut;
    }
    // De parse-lus blokkeert de UI; regelmatig een frame vrijgeven voor de voortgangsbalk
    // en de GC (elke 8 MB — bij mega-dumps bleef de UI anders tientallen seconden bevroren).
    if (got % (1 << 23) < value.length) await new Promise(r => setTimeout(r, 0));
  }
  // Volledig = de buitenste accolade is netjes gesloten (diepte terug op 0) en er kwam
  // überhaupt data binnen. Een afgebroken stream of half geschreven bestand faalt hier.
  data._complete = depth === 0 && !inStr && got > 0;
  return data;
}

// Laatst opgehaalde /api/status (voor het probleemrapport: dump-grootte op schijf) en
// de laatste laadfout, indien er wél een dump ligt maar hij niet ingelezen kon worden.
let lastStatus = null;
let loadError = null;

async function loadDump(force = false) {
  let st = null;
  try {
    st = await (await fetch('/api/status')).json();
    lastStatus = st;
    if (!st.hasDump) {
      $('dump-info').textContent = '';
      loadError = null; renderEmptyState();
      return false;
    }
    // Crash-detector: de marker wordt vóór het parsen gezet en alleen bij succes of een
    // nette fout weer verwijderd. Staat hij er bij de start nog, dan is de vorige poging
    // hard gecrasht (tab-OOM bij een mega-dump laat geen JS-fout achter). Dan niet blind
    // opnieuw proberen, maar een hint tonen; "Opnieuw proberen" forceert alsnog een load.
    if (!force && localStorage.getItem('fmss_loadmark')) {
      localStorage.removeItem('fmss_loadmark');
      loadError = { msg: t('esErrCrash'), size: st.dumpSize, crash: true };
      $('empty-state').classList.remove('hidden');
      renderEmptyState();
      return false;
    }
    localStorage.setItem('fmss_loadmark', '1');
    const b = $('banner');
    b.className = 'scanning'; b.innerHTML = bannerMsg('hourglass', t('loading')); b.onclick = null;
    // Streamend binnenhalen én parsen, met echte voortgang (bytes / Content-Length).
    const resp = await fetch('/api/dump');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const total = Number(resp.headers.get('Content-Length')) || 0;
    let data;
    if (resp.body && total > 0) {
      let lastUi = 0;
      data = await parseDumpStream(resp, total, got => {
        const now = performance.now();
        if (now - lastUi > 100) {   // UI hooguit 10×/s verversen
          lastUi = now;
          const mb = `${t('loading')} ${(got / 1048576).toFixed(0)} / ${(total / 1048576).toFixed(0)} MB`;
          b.innerHTML = bannerProgress('hourglass', mb, got / total);
        }
      });
    } else {
      data = await resp.json();
      data._complete = true;   // JSON.parse gooit zelf al bij een afgekapt bestand
    }
    // Volledigheidscheck: een dump die midden in het schrijven is gelezen (of afgebroken
    // stream) mag nooit stilletjes als geldige — maar halve — spelerslijst doorgaan.
    // "generated" staat sinds de allereerste release in elk metablok; "pluginVersion" pas
    // sinds plugin 0.1.34. Op die laatste weigeren gooide complete dumps van oudere plugins
    // weg met een misleidende "onvolledig"-melding (issue #8) — die krijgen nu een
    // waarschuwingsbanner (zie renderVerWarn) in plaats van een fout.
    if (!data._complete || !data.meta || !data.meta.generated)
      throw new Error(t('dumpIncomplete'));
    b.className = 'hidden';
    // Spookrecords eruit: FM genereert newgens alvast in het geheugen (o.a. voor de
    // jeugdintake) vóórdat ze in de spelwereld bestaan. Kenmerk: clubloos én reputatie
    // op de 0xFFFF-sentinel ("niet ingesteld"). Ze ogen als transfervrije parels maar
    // zijn in de game onvindbaar en niet te tekenen; echte clublozen hebben wél een
    // reputatiewaarde.
    state.players = (data.players || []).filter(p => p.club || p.worldRep !== 0xFFFF);
    state.staff = data.staff || [];
    state.meta = data.meta || {};
    state._wageCeil = undefined;   // loonplafond opnieuw berekenen voor deze dump
    state._clubWages = null;       // loonrang-cache (vraagprijs) opnieuw opbouwen
    state._nowTs = undefined;      // "nu"-tijdstip volgt de nieuwe in-game datum (monthsUntil)
    _expTsCache.clear();           // contractdatum → timestamp-cache leegmaken
    // Per-speler memo's (_meta/_ev/_fee/_int/_q) hoeven niet gewist: de parser levert
    // verse objecten, de oude nemen hun cache mee het geheugen uit.
    // Peiljaar (voor leeftijdsberekening) automatisch uit de in-game datum; geen UI-veld meer.
    if (state.meta.gameDate) {
      const g = parseGameDate(state.meta.gameDate);
      state.refYear = state.meta.gameYear || g.getFullYear();
      state.refDoy = Math.floor((g - new Date(g.getFullYear(), 0, 0)) / 864e5);
    } else if (state.meta.gameYear) {
      state.refYear = state.meta.gameYear;
    }
    state.dumpStamp = st.dumpTime;
    localStorage.removeItem('fmss_loadmark');   // geladen: geen crash
    renderDumpInfo();
    renderClubBadge();
    renderVerWarn();
    renderMyTeamChips();
    loadError = null; renderEmptyState();
    $('empty-state').classList.add('hidden');
    buildStaffRoles();
    buildGenderFilter();
    buildFootOptions();
    buildDivisions();   // divisiefilter vullen zodra er dump-data met divisies is
    renderTable();      // nieuwe dump kan de kolomset raken (bv. groei-kolom)
    applyFilters();
    // Historie komt ná de eerste render binnen: de lijst hoeft er niet op te wachten.
    // Trends bijwerken en daarna pas de groeidata ophalen: de momentopname van déze dump
    // moet erin staan, anders ontbreekt de nieuwste datum en klopt "nieuw sinds" niet.
    // Allemaal ná de eerste render, de lijst hoeft er niet op te wachten.
    setTimeout(() => postHistorySnapshot().then(loadHistDeltas).then(() => {
      renderDevSection();
      if (histReady()) { renderTable(); applyFilters(); renderIntakeBar(); }
    }), 100);
    // Seizoensrapport eerst (rolt het in-game seizoen over 1 juli?), daarna pas de
    // gloed: die blijft vanzelf stil zolang het rapportkaartje open staat.
    const loads = (+localStorage.getItem('fmss_loads') || 0) + 1;
    localStorage.setItem('fmss_loads', String(loads));
    maybeSeasonReport();
    if (loads >= 3) coffeeGlow();
    return true;
  } catch (e) {
    console.error(e);
    localStorage.removeItem('fmss_loadmark');   // nette fout, geen crash: marker weg
    $('dump-info').textContent = 'fout';
    // Er ligt (waarschijnlijk) wél een dump, maar het inlezen faalde. Maak dat zichtbaar
    // op het lege scherm i.p.v. het stil weg te slikken; anders blijft de gebruiker met
    // een leeg scherm en de misleidende "druk op F9"-stappen achter.
    if (st && st.hasDump) {
      loadError = { msg: String((e && e.message) || e), size: st.dumpSize };
      const b = $('banner');
      b.className = 'scanning error'; b.onclick = null;
      b.innerHTML = bannerMsg('warning', t('esErrTitle'));
      $('empty-state').classList.remove('hidden');
    }
    renderEmptyState();
    return false;
  }
}

// ---------- ontwikkel-historie (trends) ----------
// Stuurt na elke geladen dump een compacte momentopname (id → [ca, pa, waarde]) naar de
// server, die delta-only opslaat (zie server.js). Best effort en buiten het laadpad om;
// per dump maar één keer (herladen van dezelfde dump slaat niets dubbel op).
async function postHistorySnapshot() {
  try {
    const gd = state.meta.gameDate;
    if (!gd || !state.players.length) return;
    if (localStorage.getItem('fmss_hist_at') === String(state.dumpStamp)) return;
    const compact = {};
    for (const p of state.players) compact[p.id] = [p.ca ?? 0, p.pa ?? 0, p.value ?? null];
    const r = await fetch('/api/history', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manager: state.meta.manager || 'default', gameDate: gd, players: compact }),
    });
    if (r.ok) localStorage.setItem('fmss_hist_at', String(state.dumpStamp));
  } catch { /* historie is nice-to-have, nooit het laden storen */ }
}

// Toont op het lege scherm ofwel de normale "nog geen data"-stappen, ofwel — als er een
// dump op schijf staat die niet ingelezen kon worden — een foutblok met de oorzaak, de
// dump-grootte en knoppen om opnieuw te proberen of het te melden. Zo is een mislukte
// load nooit meer een stil, onverklaard leeg scherm.
// Eerste FM-start na installatie: BepInEx bouwt dan zijn interop-map, wat 1-3 minuten
// duurt achter een zwart consolevenster. Zolang die map ontbreekt heeft "druk op F9" geen
// zin, en denken mensen dat FM vastloopt (meest gemelde probleem, juli 2026). Daarom in
// dat geval een eigen uitleg in plaats van de gewone stappen.
let setupState = null;
function checkSetupState() {
  fetch('/api/setup').then(r => r.json()).then(s => { setupState = s; renderEmptyState(); }).catch(() => {});
}
function renderEmptyState() {
  const normal = $('es-normal'), errBox = $('es-error'), setupBox = $('es-setup');
  if (!errBox) return;
  const needsFirstRun = !loadError && setupState && setupState.known
    && setupState.pluginInstalled && !setupState.interopReady;
  if (setupBox) {
    setupBox.classList.toggle('hidden', !needsFirstRun);
    if (needsFirstRun) setupBox.innerHTML =
      `<h2>${escHtml(t('esSetupTitle'))}</h2><p>${escHtml(t('esSetupBody'))}</p>` +
      `<p class="es-setup-hint">${escHtml(t('esSetupHint'))}</p>`;
  }
  if (!loadError) {
    errBox.classList.add('hidden');
    if (normal) normal.classList.toggle('hidden', needsFirstRun);
    return;
  }
  if (normal) normal.classList.add('hidden');
  if (setupBox) setupBox.classList.add('hidden');
  const sizeLine = loadError.size
    ? `<p class="es-err-size">${tf('esErrSize', { mb: (loadError.size / 1048576).toFixed(0) })}</p>` : '';
  // Crash (tab-OOM): de melding ís de uitleg + tip; er is geen technisch foutdetail.
  errBox.innerHTML =
    `<h2>${escHtml(t('esErrTitle'))}</h2>` +
    `<p class="es-err-msg">${escHtml(loadError.crash ? loadError.msg : t('esErrBig'))}</p>` +
    sizeLine +
    (loadError.crash ? '' : `<pre class="es-err-detail">${escHtml(loadError.msg)}</pre>`) +
    `<div class="es-help">` +
      `<button id="es-err-reload">${escHtml(t('esErrReload'))}</button>` +
      `<button id="es-err-fetch">${escHtml(t('fetch'))}</button>` +
      `<button id="es-err-report">${escHtml(t('reportBug'))}</button>` +
    `</div>`;
  errBox.classList.remove('hidden');
  $('es-err-reload').onclick = () => loadDump(true);   // force: langs de crash-detector
  // Uitweg die er niet was (issue #8): een verse dump vragen, zelfde route als de knop
  // "Nieuwe data" in de balk — mét de FM-draait-check en de niet-opgepikt-time-out.
  $('es-err-fetch').onclick = () => $('btn-fetch').onclick();
  $('es-err-report').onclick = reportBug;
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
      const txt = isNaN(d) ? ds : d.toLocaleDateString(uiLocale(),
        { day: 'numeric', month: 'short', year: 'numeric' });
      gd.innerHTML = icon('calendar', 12) + ' ' + escHtml((derived ? '~ ' : '') + txt);
      gd.title = derived ? t('gameDateDerived') : t('gameDateMemory');
    }
  }
}
// Waarschuwing als de dump uit een andere FM-versie komt dan waarop de offsets zijn gepind:
// de geheugen-uitlezing kan dan stilletjes verkeerde waarden geven. Zelfde banner voor een
// dump van een plugin ouder dan 0.1.34 (geen pluginVersion in het metablok): wel laden,
// maar aanraden verse data op te halen.
function renderVerWarn() {
  const el = $('ver-warn');
  const m = state.meta;
  if (m.gameVersion && m.versionOk === false) {
    el.innerHTML = bannerMsg('warning', tf('verWarn', { v: m.gameVersion, s: m.supportedVersion || '26.3' }));
    el.classList.remove('hidden');
  } else if (m.generated && !m.pluginVersion) {
    el.innerHTML = bannerMsg('warning', t('verWarnOldDump'));
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
}
function renderClubBadge() {
  const mgr = state.meta.manager, club = state.meta.myClub, rep = state.meta.myClubRep;
  // FM-data (namen uit het geheugen) altijd escapen vóór innerHTML.
  $('club-badge').innerHTML = (mgr || club) ? `${mgr ? escHtml(mgr) + ' · ' : ''}<b>${escHtml(club || '?')}</b>` : '';
  $('club-badge').title = t('clickClubFilter') + (rep ? ` · ${t('repWord')} ${rep}` : '');
}
function buildStaffRoles() {
  // Optie-values blijven de rauwe dumpstring (daar filtert applyFilters op); alleen het
  // label vertaalt mee via jobId. Zo blijven opgeslagen presets geldig over talen heen.
  const cur = $('f-staffrole').value;
  const byJob = new Map();
  for (const s of state.staff) if (s.job && !byJob.has(s.job)) byJob.set(s.job, s);
  const items = [...byJob.values()].map(s => ({ v: s.job, l: jobLabel(s) }))
    .sort((a, b) => a.l.localeCompare(b.l, uiLocale()));
  $('f-staffrole').innerHTML = `<option value="">${t('all')}</option>` +
    items.map(x => `<option value="${escHtml(x.v)}">${escHtml(x.l)}</option>`).join('');
  $('f-staffrole').value = cur;
}
// Geslacht-filter: alleen zichtbaar als de geladen data écht gemengd is (scan met
// "Beide"); in een puur mannen- of vrouwenbestand is hij ruis. Waardes m/v zijn
// taalvast, de labels vertalen mee via dbMen/dbWomen.
function buildGenderFilter() {
  const rows = state.mode === 'staff' ? state.staff : state.players;
  let men = false, women = false;
  for (const p of rows) { if (p.gender === 1) women = true; else men = true; if (men && women) break; }
  const mixed = men && women;
  $('fg-gender').style.display = mixed ? '' : 'none';
  if (!mixed && $('f-gender').value) { $('f-gender').value = ''; }
}

// Voetkeuze uit de dump zelf: de plugin leest de tekst zoals FM hem toont, dus die is
// afhankelijk van de speltaal ("Rechts" / "Right"). Opties opbouwen uit de aanwezige
// waarden houdt het filter goed in elke taal; het label komt uit footLabel waar we hem
// kennen, anders gewoon de waarde uit het geheugen.
const FOOT_ORDER = { footR: 0, footL: 1, footB: 2 };
function buildFootOptions() {
  const cur = $('f-foot').value;
  const vals = [...new Set(state.players.map(p => p.foot).filter(Boolean))]
    .sort((a, b) => (FOOT_ORDER[FOOT_KEY[a.toLowerCase()]] ?? 9) - (FOOT_ORDER[FOOT_KEY[b.toLowerCase()]] ?? 9));
  $('f-foot').innerHTML = `<option value="">${t('all')}</option>` +
    vals.map(v => `<option value="${escHtml(v)}">${escHtml(footLabel({ foot: v }))}</option>`).join('');
  $('f-foot').value = vals.includes(cur) ? cur : '';
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
  const headsBy = {
    nl: { GK: 'Keeper', DEF: 'Verdediging', MID: 'Middenveld', AANV: 'Aanval' },
    en: { GK: 'Goalkeeper', DEF: 'Defence', MID: 'Midfield', AANV: 'Attack' },
    fr: { GK: 'Gardien', DEF: 'Défense', MID: 'Milieu', AANV: 'Attaque' },
    de: { GK: 'Torwart', DEF: 'Abwehr', MID: 'Mittelfeld', AANV: 'Angriff' },
  };
  const H = headsBy[state.lang] || headsBy.en;
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
  v /= CUR_RATE[state.cur] || 1;   // invoer in gekozen valuta → intern GBP
  return isNaN(v) ? null : v;
};
// Contractdatums clusteren op een handvol unieke waarden (30-06, 31-12 per jaar), dus een
// klein Map'je vervangt honderdduizenden Date-allocaties per filterslag. "Nu" is per dump
// constant (state._nowTs, gewist in loadDump).
const _expTsCache = new Map();
function monthsUntil(expires) {
  if (!expires) return null;
  let ts = _expTsCache.get(expires);
  if (ts === undefined) { ts = +new Date(expires); _expTsCache.set(expires, ts); }
  if (isNaN(ts)) return null;
  return (ts - (state._nowTs ??= +gameNow())) / (1000 * 60 * 60 * 24 * 30.44);
}

function applyFilters() {
  let rows = state.mode === 'staff' ? state.staff : state.players;
  const name = $('f-name').value.trim().toLowerCase();
  const ageMin = +$('f-age-min').value || 0, ageMax = +$('f-age-max').value || 99;
  const caMin = +$('f-ca-min').value || 0, caMax = +$('f-ca-max').value || 999;
  const paMin = +$('f-pa-min').value || 0, paMax = +$('f-pa-max').value || 999;
  const metaMin = +$('f-meta-min').value || 0, metaMax = +$('f-meta-max').value || 99;
  const mpMin = +$('f-metapa-min').value || 0, mpMax = +$('f-metapa-max').value || 99;
  // Meta-score bestaat alleen voor spelers met attributen (staf en keepers vallen erbuiten).
  const wantMeta = state.mode !== 'staff' && (metaMin > 0 || metaMax < 99);
  const wantMetaPa = state.mode !== 'staff' && !state.hideCapa && (mpMin > 0 || mpMax < 99);
  const price = parseMoney($('f-price').value);
  const fee = parseMoney($('f-fee').value);
  // Max. loon-invoer volgt de gekozen weergaveperiode; intern vergelijken we per week.
  const wageIn = parseMoney($('f-wage').value);
  const wage = wageIn == null ? null : wageIn / wageFactor();
  const nat = $('f-nat').value.trim().toLowerCase();
  // Ontwikkeling: alleen actief met historie én zichtbare CA (groei is CA-afgeleid).
  const devOn = histReady() && !state.hideCapa && state.mode !== 'staff';
  const gMinRaw = $('f-growth-min').value, gMaxRaw = $('f-growth-max').value;
  const gMin = devOn && gMinRaw !== '' ? +gMinRaw : null;
  const gMax = devOn && gMaxRaw !== '' ? +gMaxRaw : null;
  const onlyNew = devOn && $('f-new').checked;
  const hMin = +$('f-height-min').value || 0, hMax = +$('f-height-max').value || 999;
  const footF = $('f-foot').value;
  // Wonderkids: staf heeft geen PA-groei, en zonder zichtbare PA is het filter verstopt.
  const onlyWk = state.mode !== 'staff' && !state.hideCapa && $('f-wonderkid').checked;
  const onlyEu = $('f-eu').checked, onlyMyClub = $('f-myclub').checked;
  const minInterest = +$('f-interest').value || 0;
  const tstatus = $('f-tstatus').value, contractF = $('f-contract').value;
  const onlySl = $('f-shortlist').checked || state.mode === 'shortlist';
  const advRules = activeAdvRules();
  const staffRole = $('f-staffrole').value;
  const gsel = $('f-gender').value;   // '' = beide, 'm' = mannen, 'v' = vrouwen
  const divVal = $('f-div').value.trim().toLowerCase();   // zoekbalk: substring, hoofdletterongevoelig
  const myClub = (state.meta.myClub || '').toLowerCase();
  if (state.mode === 'shortlist') rows = [...state.players, ...state.staff];

  state.filtered = rows.filter(p => {
    if (!p.name || !p.name.trim() || p.name.trim() === '?') return false;   // naamloze stubs verbergen
      if (onlySl && !state.shortlist.has(p.id)) return false;
    // Zoek-haystack per speler cachen: 2 toLowerCase-allocaties per rij per toetsaanslag
    // wordt één .includes op een vaste string. Een NUL-teken (\u0000) als scheiding kan nooit in de
    // zoekterm zitten, dus de matchsemantiek (naam óf club bevat de term) is identiek.
    if (name && !(p._q ??= ((p.name || '') + '\u0000' + (p.club || '')).toLowerCase()).includes(name)) return false;
    const age = getAge(p);
    if (age < ageMin || age > ageMax) return false;
    if ((p.ca ?? 0) < caMin || (p.ca ?? 0) > caMax) return false;
    if ((p.pa ?? 0) < paMin || (p.pa ?? 0) > paMax) return false;
    if (wantMeta) { const s = metaScore(p); if (s == null || s < metaMin || s > metaMax) return false; }
    if (wantMetaPa) { const s = metaPaScore(p); if (s == null || s < mpMin || s > mpMax) return false; }
    if (price != null && (estValue(p).v ?? Infinity) > price) return false;
    if (fee != null && (feeEstimate(p).v ?? Infinity) > fee) return false;
    if (wage != null && (p.wage ?? Infinity) > wage) return false;
    if (nat && !((p.nat || []).some(n => n.toLowerCase().includes(nat) || natLabel(n).toLowerCase().includes(nat))
      || natsLabel(p).toLowerCase().includes(nat))) return false;
    if (onlyWk && !isWonderkid(p)) return false;
    if (onlyNew && !isNewSince(p)) return false;
    // Onbekende groei (nieuw, of te dunne basislijn) valt buiten een ingestelde grens,
    // net als bij lengte: anders zou "groei ≥ 10" vol nieuwe spelers staan.
    if (gMin != null || gMax != null) {
      const g = caGrowth(p);
      if (g == null || (gMin != null && g < gMin) || (gMax != null && g > gMax)) return false;
    }
    // Lengte/voet: onbekend valt buiten een ingesteld filter, net als bij de attribuutregels.
    if (hMin > 0 || hMax < 999) { const h = p.height || 0; if (h < hMin || h > hMax) return false; }
    if (footF && p.foot !== footF) return false;
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
    // Transferstatus: te koop (transferlijst), te huur (huurlijst, plugin v0.1.36+) of allebei goed.
    if (tstatus === 'sale' && !p.listed) return false;
    if (tstatus === 'loan' && !p.loanListed) return false;
    if (tstatus === 'any' && !p.listed && !p.loanListed) return false;
    for (const r of advRules) {
      const av = advValue(p, r.k);
      if (av == null || av <= 0) return false;   // onbekend attribuut telt als geen match
      if (r.min && av < r.min) return false;
      if (r.max && av > r.max) return false;
    }
    if (activePos.size) {
      const prof = p.posProficiency;
      const hasProfData = prof && Object.keys(prof).length > 0;
      const pass = hasProfData
        ? [...activePos].some(pos => (prof[pos] ?? 0) >= state.profThreshold)
        : (p.posArr || []).some(x => activePos.has(x));   // old dump fallback
      if (!pass) return false;
    }
    if (state.mode === 'staff' && staffRole && p.job !== staffRole) return false;
    if (gsel === 'm' && p.gender === 1) return false;
    if (gsel === 'v' && p.gender !== 1) return false;
    if (divVal && !(p.div || '').toLowerCase().includes(divVal)) return false;
    return true;
  });
  sortRows();
  renderChips(buildChips());
  updateSecDots();
  // Alleen de rijen; de kolomkoppen hangen niet van filters af. Aanroepers die de
  // kolomset wél veranderen (modus, taal, verborgen stats, nieuwe dump) doen zelf
  // renderTable() — een volledige headerrebuild + hermeting per toetsaanslag was zonde.
  renderVisible();
}

// Stip op de sectiekop zodra er binnen die sectie een filter actief is; zo zie je ook
// bij ingeklapte secties waar je moet zijn.
function updateSecDots() {
  const val = id => { const e = $(id); return e ? e.value.trim() : ''; };
  const on = {
    position: activePos.size > 0,
    role: !!$('f-role').value,
    staffrole: !!$('f-staffrole').value,
    quality: ['f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-meta-min', 'f-meta-max', 'f-metapa-min', 'f-metapa-max'].some(id => val(id))
      || activeAdvRules().length > 0 || (!state.hideCapa && $('f-wonderkid').checked),
    development: histReady() && !state.hideCapa
      && (['f-growth-min', 'f-growth-max'].some(id => val(id)) || $('f-new').checked),
    physical: ['f-height-min', 'f-height-max'].some(id => val(id)) || !!$('f-foot').value,
    financial: state.mode === 'staff' ? !!val('f-wage') : ['f-price', 'f-fee', 'f-wage'].some(id => val(id)),
    origin: !!(val('f-nat') || $('f-eu').checked || val('f-div')),
    availability: (state.mode !== 'staff' && (+$('f-interest').value > 0 || !!$('f-tstatus').value)) || !!$('f-contract').value || $('f-myclub').checked || $('f-shortlist').checked,
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
  if ($('f-gender').value) add(t($('f-gender').value === 'm' ? 'dbMen' : 'dbWomen'), () => { $('f-gender').value = ''; });
  if ($('f-div').value.trim()) add(`${t('divLabel')}: ${$('f-div').value.trim()}`, () => { $('f-div').value = ''; });
  range('f-age-min', 'f-age-max', t('age'));
  range('f-ca-min', 'f-ca-max', 'CA');
  range('f-pa-min', 'f-pa-max', 'PA');
  range('f-meta-min', 'f-meta-max', t('c_meta'));
  range('f-metapa-min', 'f-metapa-max', t('c_metapa'));
  if (!state.hideCapa && $('f-wonderkid').checked) add(t('wonderkidOnly'), uncheck('f-wonderkid'));
  if (histReady() && !state.hideCapa) {
    if ($('f-new').checked) add(t('onlyNew'), uncheck('f-new'));
    range('f-growth-min', 'f-growth-max', t('growthRange'));
  }
  range('f-height-min', 'f-height-max', t('heightCm'));
  if ($('f-foot').value) add(`${t('foot')}: ${$('f-foot').selectedOptions[0].textContent}`, () => { $('f-foot').value = ''; });
  if (v('f-price')) add(`${t('maxvalue')} ${v('f-price')}`, clearInput('f-price'));
  if (v('f-fee')) add(`${t('maxfee')} ${v('f-fee')}`, clearInput('f-fee'));
  if (v('f-wage')) add(`${t('maxwage')} ${v('f-wage')}`, clearInput('f-wage'));
  if (v('f-nat')) add(`${t('nat')}: ${v('f-nat')}`, clearInput('f-nat'));
  if ($('f-eu').checked) add(t('euonly'), uncheck('f-eu'));
  if (+$('f-interest').value > 0) add(`${t('interestmin')} ${$('f-interest').selectedOptions[0].textContent}`, () => { $('f-interest').value = '0'; });
  if ($('f-tstatus').value) add(`${t('tstatus')}: ${$('f-tstatus').selectedOptions[0].textContent}`, () => { $('f-tstatus').value = ''; });
  if ($('f-contract').value) add(`${t('contractF')}: ${$('f-contract').selectedOptions[0].textContent}`, () => { $('f-contract').value = ''; });
  for (const r of activeAdvRules()) add(advChipTxt(r), () => {
    if (state.mode === 'staff') state.advStaffF = state.advStaffF.filter(x => x !== r);
    else state.advF = state.advF.filter(x => x !== r);
    saveAdv();
  });
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
const PRESET_TEXT_IDS = ['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-meta-min', 'f-meta-max', 'f-metapa-min', 'f-metapa-max', 'f-growth-min', 'f-growth-max', 'f-height-min', 'f-height-max', 'f-price', 'f-fee', 'f-wage', 'f-nat', 'f-div'];
const PRESET_CHECK_IDS = ['f-eu', 'f-myclub', 'f-shortlist', 'f-wonderkid', 'f-new'];
// De peilperiode hoort bewust bij de preset: "doorbraken dit seizoen" betekent niets als
// het venster erbij wegvalt. Zie applyPreset voor het opnieuw ophalen van de groeidata.
const PRESET_SELECT_IDS = ['f-interest', 'f-staffrole', 'f-role', 'f-contract', 'f-tstatus', 'f-foot', 'f-hist-period', 'f-gender'];
function loadPresets() { try { return JSON.parse(localStorage.getItem('fmss_presets') || '[]'); } catch { return []; } }
function storePresets(list) { localStorage.setItem('fmss_presets', JSON.stringify(list)); }
function snapshotFilters() {
  const s = { text: {}, check: {}, select: {}, pos: [...activePos] };
  for (const id of PRESET_TEXT_IDS) { const v = $(id).value.trim(); if (v) s.text[id] = v; }
  for (const id of PRESET_CHECK_IDS) if ($(id).checked) s.check[id] = true;
  for (const id of PRESET_SELECT_IDS) { const v = $(id).value; if (v && v !== '0') s.select[id] = v; }
  const adv = state.advF.filter(r => r.k && (r.min || r.max));
  if (adv.length) s.adv = adv.map(r => ({ ...r }));
  const advStaff = (state.advStaffF || []).filter(r => r.k && (r.min || r.max));
  if (advStaff.length) s.advStaff = advStaff.map(r => ({ ...r }));
  return s;
}
// f-hist-period heeft altijd een waarde (standaard 'y1') en telt dus niet als "actief
// filter" — anders was de lege-preset-waarschuwing onbereikbaar en sleepte elke preset
// stilletjes een groeiperiode mee die de gebruiker nooit aanraakte.
const presetIsEmpty = s => !s.pos.length && !Object.keys(s.text).length && !Object.keys(s.check).length
  && !Object.keys(s.select).some(k => k !== 'f-hist-period') && !(s.adv || []).length && !(s.advStaff || []).length;
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
  // Idem vóór de transferstatus-select (v1.2): transferlijst-checkbox → "te koop".
  if (oc['f-listed']) $('f-tstatus').value = 'sale';
  state.advF = (s.adv || []).map(r => ({ ...r }));
  state.advStaffF = (s.advStaff || []).map(r => ({ ...r }));
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
  // Andere peilperiode = andere groeidata, dus eerst ophalen en dán filteren.
  const per = (s.select || {})['f-hist-period'];
  if (per && HIST_PERIODS.includes(per) && per !== state.histPeriod && histReady()) {
    setHistPeriod(per).then(applyFilters);
    return;
  }
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
  // Sorteersleutel één keer per rij berekenen i.p.v. per vergelijking (n i.p.v. n·log n):
  // scheelt bij berekende kolommen (meta, waardeschatting) en mega-dumps een orde van
  // grootte. Strings via één hergebruikte Collator (veel sneller dan losse localeCompare).
  const rows = state.filtered;
  const keys = rows.map(col.get);
  const idx = rows.map((_, i) => i);
  const coll = new Intl.Collator(state.lang);
  idx.sort((ia, ib) => {
    const va = keys[ia], vb = keys[ib];
    if (va == null && vb == null) return 0;
    if (va == null) return 1; if (vb == null) return -1;
    if (typeof va === 'number') return (va - vb) * dir;
    return coll.compare(va, vb) * dir;
  });
  state.filtered = idx.map(i => rows[i]);
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
function colLabel(c) {
  if (c.star) return starSvg(13);
  const base = c.label.startsWith('c_') || I18N.nl[c.label] ? t(c.label) : c.label;
  return c.key === 'wage' ? base + ' ' + wageSuf() : base;   // salarisperiode in de kop
}
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
    const help = c.help ? `<span class="col-help" data-help="${c.help}">?</span>` : '';
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
// Huurstatus voor de naamkleuring. Elke gehuurde speler (moederclub ≠ huidige club,
// bv. eigendom Man City maar spelend bij Nordsjælland) kleurt blauw (loan-in). Onder het
// "Mijn club"-filter geldt bovendien: eigen spelers die elders gestald zijn = rood (loan-out).
function loanStatus(p) {
  const cl = (p.club || '').toLowerCase(), ow = (p.ownerClub || '').toLowerCase();
  if (!ow || !cl || ow === cl) return '';
  if ($('f-myclub').checked) {
    const my = (state.meta.myClub || '').toLowerCase();
    if (my && ow === my && cl !== my) return 'loan-out';
  }
  return 'loan-in';
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
        return `<td class="pname ${ls} ${stick}" data-tip="${escHtml(t('copyNameTip') + lt)}">${v ? escHtml(v) : '?'}</td>`;
      }
      if (c.dimNull && !v) return `<td class="dim">–</td>`;
      if (c.fmt) v = c.fmt(v);
      if (v == null || v === '') v = '–';
      // v is hier altijd platte tekst (kolommen met HTML gebruiken render) en kan uit
      // game-data komen (nationaliteit, staf-rol) → escapen, custom databases kunnen alles bevatten.
      return `<td class="${c.num ? 'num' : ''} ${c.cls || ''} ${c.tdCls ? c.tdCls(p) : ''}">${escHtml(String(v))}</td>`;
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
let lastScrollRow = -1;
$('table-wrap').addEventListener('scroll', () => {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    // Horizontaal scrollen en verticale deltas binnen dezelfde rij verschuiven het
    // zichtbare rijvenster niet — dan is opnieuw renderen (50 rijen innerHTML +
    // handlers per frame) verspilling. Andere aanroepers van renderVisible (filters,
    // shortlist, valuta) blijven onvoorwaardelijk tekenen.
    const row = Math.floor($('table-wrap').scrollTop / ROW_H);
    if (row === lastScrollRow) return;
    lastScrollRow = row;
    renderVisible();
  });
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
  if (!all.length) { showToast(t('slEmpty')); return; }
  const withCapa = !state.hideCapa;   // vraagprijs valt ook onder de verborgen-stats-toggle
  const cols = ['Name', 'Position', 'Age', 'Club', 'Nationality',
    ...(withCapa ? ['CA', 'PA'] : []), 'Value(GBP)', ...(withCapa ? ['AskingPrice(GBP)'] : []), 'Wage(GBP)', 'Contract', 'Interest'];
  const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const p of all) {
    const i = interestEstimate(p);
    lines.push([p.name, p.pos || jobLabel(p), getAge(p), p.club || '', natsLabel(p),
      ...(withCapa ? [p.ca, p.pa] : []), estValue(p).v ?? '', ...(withCapa ? [feeEstimate(p).v ?? ''] : []), p.wage ?? '', p.expires || '', i ? i.label : ''].map(esc).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  // revoke pas ná de download (Firefox breekt hem anders af) — zelfde patroon als downloadPlayerCard
  a.download = 'fmsuperscout-shortlist.csv';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  showToast(all.length + ' → CSV', 'check');
  coffeeGlow();
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
// Profielweergave: 'side' = paneel rechts (default), 'popup' = gecentreerde modal.
function profMode() { return localStorage.getItem('fmss_profmode') || 'side'; }
function closeDetail() {
  $('detail').classList.add('hidden');
  $('detail-backdrop').classList.add('hidden');
  state.selected = null; renderVisible();
}
function showDetail(p) {
  state.selected = p;
  renderVisible();
  const pop = profMode() === 'popup';
  $('detail').classList.toggle('popup', pop);
  $('detail-backdrop').classList.toggle('hidden', !pop);
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
    <button class="copybtn" title="${t('copyBtnTip')}">${icon('clipboard', 13)}</button>
    <button class="cmpbtn ${inCmp ? 'on' : ''}" title="${t('addCompare')}">${icon('compare', 13)}</button>${isPlayer && p.attrs ? `<button class="cardbtn" title="${t('cardBtnTip')}">${icon('card', 13)}</button>` : ''}</h2>
  <div class="sub">${getAge(p)} · ${escHtml(natsLabel(p))}${isEu(p) ? ' · <span class="eu-yes">EU</span>' : ''} · ${clubLabel(p)}${p.div ? ` · <span class="dim">${escHtml(p.div)}</span>` : ''}</div>
  ${gauge}
  <div class="kv">
    ${isPlayer ? `<div><b>${t('c_pos')}</b> ${escHtml(p.pos || '–')}</div><div><b>${t('foot')}</b> ${escHtml(footLabel(p))}</div>` : `<div><b>${t('c_role')}</b> ${escHtml(jobLabel(p))}</div>`}
    <div><b>${t('estval')}</b> ${valTxt}</div>
    ${!state.hideCapa && feeEstimate(p).v > 0 ? `<div><b>${t('c_fee')}</b> ${fmtMoney(feeEstimate(p).v * 0.85)} – ${fmtMoney(feeEstimate(p).v * 1.15)}</div>` : ''}
    <div><b>${t('wageLabel')}</b> ${fmtWage(p.wage)}${p.wage > 0 ? ` <span class="dim">${wageSuf()}</span>` : ''}</div>
    ${p.worldRep ? `<div><b>${t('repLabel')}</b> ${p.worldRep}</div>` : ''}
    <div><b>${t('contractLabel')}</b> ${fmtDate(p.expires)}</div>
    ${p.ownerClub && p.ownerClub !== p.club ? `<div><b>${t('ownerLabel')}</b> ${escHtml(p.ownerClub)}</div>` : ''}
    ${p.height ? `<div><b>${t('height')}</b> ${p.height} cm</div>` : ''}
    ${isPlayer && !state.hideMeta && p.attrs ? (() => {
      const positions = metaScoresByPosition(p, p.attrs);
      if (!positions.length) return '';
      const paMeta = !state.hideCapa ? metaPaScore(p) : null;
      const paRow = paMeta != null
        ? `<div data-help="metaPaHint" style="margin-bottom:2px"><b>${t('c_metapa')}<\/b> <span class="${roleClass(paMeta)}">${paMeta.toFixed(1)}<\/span> <span class="col-help">?<\/span><\/div>`
        : '';
      const td = (a = 'left') => `style="text-align:${a};padding:1px 5px 1px 0"`;
      const th = (a = 'left') => `style="text-align:${a};padding:0 5px 3px 0;opacity:0.5;font-weight:normal"`;
      const rows = positions.map(({ pos, prof, meta, effectiveMeta }) => {
        const profCell = prof != null ? `<span class="${attrClass(prof)}">${prof}<\/span>` : '<span class="dim">?<\/span>';
        return `<tr><td ${td()}>${pos}<\/td><td ${td('right')}>${profCell}<\/td><td ${td('right')}><span class="${roleClass(meta)}">${meta.toFixed(1)}<\/span><\/td><td ${td('right')}><span class="${roleClass(effectiveMeta)}">${effectiveMeta.toFixed(1)}<\/span><\/td><\/tr>`;
      }).join('');
      return `${paRow}<table data-help="metaHint" style="border-collapse:collapse;width:100%;font-size:0.83em;margin-top:2px"><tr><th ${th()}>Pos<\/th><th ${th('right')}>Prof<\/th><th ${th('right')}>Meta<\/th><th ${th('right')}>Eff<\/th><\/tr>${rows}<\/table>`;
    })() : ''}
  </div>`;

  const flags = [];
  if (isFree(p)) flags.push(`<span class="pill">${t('tag_free')}</span>`);
  if (p.listed) flags.push(`<span class="pill warn">${t('tag_listed')}</span>`);
  if (p.loanListed) flags.push(`<span class="pill warn">${t('tag_loan')}</span>`);
  if (p.setForRelease) flags.push(`<span class="pill warn">${t('tag_rel')}</span>`);
  if (p.notForSale) flags.push(`<span class="pill">${t('tag_nfs')}</span>`);
  if (isAttainable(p)) flags.push(`<span class="pill good" data-help="attainHint">${t('attainable')}</span>`);
  if (flags.length) html += '<div>' + flags.join('') + '</div>';

  if (isPlayer) {
    const i = interestEstimate(p);
    if (i) html += `<div class="interest-box" data-help="interestHint"><b>${t('interestTitle')}:</b> <span class="int ${i.cls}">${i.label}</span> <span class="dim">(${i.score}/100)</span> <span class="col-help">?</span>${i.note ? `<div class="int-note">${t(i.note === 'minor' ? 'minorNote' : 'minorIntlNote')}</div>` : ''}</div>`;
    html += '<div id="dev-box"></div>';   // ontwikkel-grafiek (trends) laadt async
  }


  if (isPlayer && p.attrs) {
    // Potentie leunt op PA (verborgen stat): toggle alleen tonen als verborgen stats aan staan.
    const canPot = !state.hideCapa && p.pa > p.ca;
    if (!state.hideCapa)
      html += `<label class="potswitch${canPot ? '' : ' off'}"><input type="checkbox" id="pot-toggle" ${state.showPot ? 'checked' : ''} ${canPot ? '' : 'disabled'}> ${t('showPot')}${state.showPot ? ` <span class="dim">(${t('potNote')})</span>` : ''}</label>`;
    const isGk = (p.posArr || []).includes('GK');
    const groups = isGk ? ATTR_GROUPS_GK : ATTR_GROUPS_OUTFIELD;
    const proj = (!state.hideCapa && state.showPot) ? projectAttrs(p) : null;
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
        `<div class="attr-row ${idx % 2 ? 'odd' : ''}"><span>${staffAttrName(k)}</span><span class="v ${attrClass(v)}">${v}</span></div>`).join('') + '</div></div>';
  }
  $('detail-body').innerHTML = html;
  document.querySelector('.detail-star').onclick = () => toggleShortlist(p.id);
  document.querySelector('.copybtn').onclick = () => copyName(p.name);
  const cmp = document.querySelector('.cmpbtn');
  if (cmp) cmp.onclick = () => { toggleCompare(p.id); cmp.classList.toggle('on', state.compare.includes(p.id)); };
  const cb = document.querySelector('.cardbtn');
  if (cb) cb.onclick = () => downloadPlayerCard(p);
  const pt = $('pot-toggle');
  if (pt) pt.onchange = () => { state.showPot = pt.checked; showDetail(p); };
  if (isPlayer) renderDevChart(p);
  if (p.id !== state._donLast) { state._donLast = p.id; bumpStat('fmss_uses'); }   // teller voor het seizoensrapport
}

// ---------- ontwikkel-grafiek (trends in het profiel) ----------
// Haalt de opgeslagen reeks van deze speler op en tekent maximaal twee mini-panelen:
// CA/PA (verborgen als verborgen stats uit staan) en marktwaarde. Aparte panelen omdat
// het twee verschillende schalen zijn (nooit een dubbele y-as). Stippen markeren echte
// meetpunten (delta-opslag); tussenliggende dumps zonder wijziging lopen vlak door.
async function renderDevChart(p) {
  try {
    const r = await fetch(`/api/history/series?uid=${p.id}&manager=${encodeURIComponent(state.meta.manager || 'default')}`);
    if (!r.ok) return;
    const { dates, entries } = await r.json();
    const box = $('dev-box');
    if (!box || state.selected !== p) return;   // gebruiker klikte al door
    // Reeks reconstrueren: vanaf het eerste meetpunt elke datum invullen (carry-forward).
    const pts = [];
    let cur = null;
    for (const d of dates) {
      const e = entries[d];
      if (e) cur = e;
      if (cur) pts.push({ d, ca: cur[0], pa: cur[1], v: cur[2], real: !!e });
    }
    if (pts.length < 2) return;
    const panels = [];
    if (!state.hideCapa) panels.push(devPanel(pts, 'capa'));
    if (pts.some(q => q.v > 0)) panels.push(devPanel(pts, 'value'));
    if (!panels.length) return;
    box.innerHTML = `<div class="attr-col dev-col"><h3>${t('devTitle')}</h3><div class="dev-wrap">${panels.join('')}</div></div>`;
  } catch { /* geen historie beschikbaar */ }
}

function devPanel(pts, kind) {
  // Linkergoot voor de y-labels (geld is breder dan een CA-getal), zodat labels en
  // datapunten elkaar nooit raken; rechts ruimte voor de CA/PA-lijnlabels.
  const W = 200, H = 84, padL = kind === 'capa' ? 26 : 36, padR = kind === 'capa' ? 24 : 8, padT = 11, padB = 14;
  const n = pts.length;
  const x = i => padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1));
  const series = kind === 'capa'
    ? [{ get: q => q.ca, cls: 'dvl-ca', dash: '', label: 'CA' },
       { get: q => q.pa, cls: 'dvl-pa', dash: '4 3', label: 'PA' }]
    : [{ get: q => q.v, cls: 'dvl-v', dash: '', label: '' }];
  const all = pts.flatMap(q => series.map(s => s.get(q))).filter(v => v != null && v > 0);
  // Echte uitersten apart houden: de as krijgt lucht, maar de labels moeten getallen tonen
  // die écht in de reeks voorkomen. Anders staat er "172" boven een speler met PA 168.
  const loReal = Math.min(...all), hiReal = Math.max(...all);
  let lo = loReal, hi = hiReal;
  // Minimale as-spanwijdte: piepkleine verschillen (waarde-geruis van 0,1%, CA +1) mogen
  // niet als steile lijnen ogen doordat de as op min/max krimpt. CA/PA-as minstens 12
  // punten, waarde-as minstens 12% van het midden; echte sprongen vullen het paneel nog.
  const midV = (lo + hi) / 2;
  const minSpan = kind === 'capa' ? 12 : Math.max(1, midV * 0.12);
  if (hi - lo < minSpan) { lo = midV - minSpan / 2; hi = midV + minSpan / 2; }
  const pad = (hi - lo) * 0.08;
  lo -= pad; hi += pad;
  const y = v => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
  const fmtV = v => kind === 'capa' ? Math.round(v) : fmtMoney(v);
  const fmtD = d => `${d.slice(5, 7)}-'${d.slice(2, 4)}`;

  let g = '';
  // basislijn + min/max-labels in de linkergoot (terughoudend, tekst nooit in seriekleur)
  g += `<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" class="dv-axis"/>`;
  // Labels op de hoogte van de échte uiterste waarden, niet op de opgerekte as-randen.
  g += `<text x="${padL - 3}" y="${(y(hiReal) + 3).toFixed(1)}" class="dv-lbl" text-anchor="end">${fmtV(hiReal)}</text>`;
  if (Math.abs(y(loReal) - y(hiReal)) > 10)
    g += `<text x="${padL - 3}" y="${(y(loReal) + 3).toFixed(1)}" class="dv-lbl" text-anchor="end">${fmtV(loReal)}</text>`;
  g += `<text x="${padL}" y="${H - 3}" class="dv-lbl">${fmtD(pts[0].d)}</text>`;
  g += `<text x="${W - padR}" y="${H - 3}" class="dv-lbl" text-anchor="end">${fmtD(pts[n - 1].d)}</text>`;
  const endLbls = [];
  for (const s of series) {
    // null-veilig pad: ontbrekende waardes breken de lijn i.p.v. naar de bodem te duiken
    let path = '', pen = false, lastY = null;
    pts.forEach((q, i) => {
      const v = s.get(q);
      if (v == null || v <= 0) { pen = false; return; }
      path += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true; lastY = y(v);
      if (q.real) g += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2" class="dvd ${s.cls}"/>`;
    });
    g += `<path d="${path}" class="dvl ${s.cls}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
    if (s.label && lastY != null) endLbls.push({ txt: s.label, y: lastY + 3 });
  }
  // Eindlabels (CA/PA) uit elkaar duwen als de lijnen vrijwel samenvallen; identiteit
  // hangt niet alleen aan kleur (PA is ook gestippeld), maar overlappend is onleesbaar.
  if (endLbls.length === 2 && Math.abs(endLbls[0].y - endLbls[1].y) < 11) {
    const mid = (endLbls[0].y + endLbls[1].y) / 2;
    const [a, b] = endLbls[0].y <= endLbls[1].y ? endLbls : [endLbls[1], endLbls[0]];
    a.y = mid - 5.5; b.y = mid + 5.5;
  }
  for (const l of endLbls) g += `<text x="${W - padR + 3}" y="${l.y.toFixed(1)}" class="dv-lbl">${l.txt}</text>`;
  // Hover-banen (volle hoogte, breder dan de stip) met een tooltip in app-stijl per
  // dumpdatum. PA staat er alleen bij als die in deze reeks echt beweegt; bij een vaste PA
  // is het ruis naast het lijnlabel dat het al zegt.
  const paVaries = kind === 'capa' && new Set(pts.map(q => q.pa)).size > 1;
  const seg = (W - padL - padR) / Math.max(1, n - 1);
  pts.forEach((q, i) => {
    const tip = kind === 'capa'
      ? `${fmtDate(q.d)} · CA ${q.ca}${paVaries ? ` · PA ${q.pa}` : ''}`
      : `${fmtDate(q.d)} · ${q.v > 0 ? fmtMoney(q.v) : '–'}`;
    g += `<rect x="${(x(i) - seg / 2).toFixed(1)}" y="0" width="${seg.toFixed(1)}" height="${H}" class="dv-hit" data-tip="${escHtml(tip)}"/>`;
  });
  // Verandering over het getoonde venster, in de kop van het paneel: groen omhoog, rood omlaag.
  const main = series[0];
  const vals = pts.map(main.get).filter(v => v != null && v > 0);
  let delta = '';
  if (vals.length > 1) {
    const dv = vals[vals.length - 1] - vals[0];
    if (dv !== 0) {
      const sign = dv > 0 ? '+' : '−';
      const txt = kind === 'capa' ? sign + Math.abs(Math.round(dv)) : sign + fmtMoney(Math.abs(dv));
      delta = `<span class="dev-delta ${dv > 0 ? 'up' : 'down'}" data-help="devDeltaHint">${txt}</span>`;
    }
  }
  const cap = kind === 'capa' ? 'CA / PA' : t('cmpValue');
  return `<div class="dev-panel"><div class="dev-cap">${cap}${delta}</div><svg viewBox="0 0 ${W} ${H}">${g}</svg></div>`;
}

// ---------- deelbare spelerskaart (PNG) — v3, FM-native ----------
// Ontwerptaal van FM zelf, zodat FM-spelers de kaart in één oogopslag lezen: het volledige
// attributengrid met FM-kleuren (groen = klasse, een muur van groen = viral regen),
// scout-sterren voor huidig en potentieel vermogen, beste rollen en financiën.
// Tier-accent volgt CA; wonderkids (zie isWonderkid) krijgen goud + badge. Labels app-taal.
// Kaartlabels apart van de hoofd-i18n gehouden: veel kaart-only strings, bij elkaar leesbaarder.
const CARDL = {
  nl: { meta: 'META', cur: 'HUIDIG', pot: 'POTENTIEEL', roles: 'BESTE ROLLEN', value: 'WAARDE',
    ask: 'VRAAGPRIJS', wage: 'LOON', contract: 'CONTRACT', rep: 'Reputatie', inj: 'Blessures',
    wk: '★ WONDERKID', repW: 'Wereldwijd', repC: 'Continentaal', repN: 'Nationaal', repL: 'Lokaal',
    injL: 'Laag', injM: 'Gemiddeld', injH: 'Hoog',
    sListed: 'OP TRANSFERLIJST', sLoan: 'TE HUUR', sRel: 'VRIJGEGEVEN', sNfs: 'NIET TE KOOP', sFree: 'CLUBLOOS' },
  en: { meta: 'META', cur: 'CURRENT', pot: 'POTENTIAL', roles: 'TOP ROLES', value: 'VALUE',
    ask: 'ASKING PRICE', wage: 'WAGE', contract: 'CONTRACT', rep: 'Reputation', inj: 'Injury',
    wk: '★ WONDERKID', repW: 'Worldwide', repC: 'Continental', repN: 'National', repL: 'Local',
    injL: 'Low', injM: 'Medium', injH: 'High',
    sListed: 'TRANSFER LISTED', sLoan: 'FOR LOAN', sRel: 'RELEASED', sNfs: 'NOT FOR SALE', sFree: 'FREE AGENT' },
  fr: { meta: 'MÉTA', cur: 'ACTUEL', pot: 'POTENTIEL', roles: 'MEILLEURS RÔLES', value: 'VALEUR',
    ask: 'PRIX DEMANDÉ', wage: 'SALAIRE', contract: 'CONTRAT', rep: 'Réputation', inj: 'Blessures',
    wk: '★ WONDERKID', repW: 'Mondiale', repC: 'Continentale', repN: 'Nationale', repL: 'Locale',
    injL: 'Faible', injM: 'Moyenne', injH: 'Élevée',
    sListed: 'TRANSFÉRABLE', sLoan: 'À PRÊTER', sRel: 'LIBÉRÉ', sNfs: 'PAS À VENDRE', sFree: 'LIBRE' },
  de: { meta: 'META', cur: 'AKTUELL', pot: 'POTENZIAL', roles: 'BESTE ROLLEN', value: 'WERT',
    ask: 'FORDERUNG', wage: 'GEHALT', contract: 'VERTRAG', rep: 'Reputation', inj: 'Verletzungen',
    wk: '★ WONDERKID', repW: 'Weltweit', repC: 'Kontinental', repN: 'National', repL: 'Lokal',
    injL: 'Gering', injM: 'Mittel', injH: 'Hoch',
    sListed: 'AUF TRANSFERLISTE', sLoan: 'ZU VERLEIHEN', sRel: 'FREIGESTELLT', sNfs: 'UNVERKÄUFLICH', sFree: 'VEREINSLOS' },
};
// Kaartkolommen zoals FM ze zelf indeelt: standaardsituaties horen bij Technisch (de app
// splitst ze in het profiel, de kaart voegt ze weer samen → 14 rijen, net als Mentaal).
function cardGroups(p, isGk) {
  const a = p.attrs || {};
  // > 0: FM-attributen lopen 1-20; 0 betekent "niet in de dump" en hoort niet op de kaart.
  const pick = keys => sortByLabel(keys).filter(k => a[k] > 0).map(k => [attrName(k), a[k]]);
  return isGk
    ? [[t('g_goalkeeping'), pick(ATTR_GROUPS_GK[0][1])],
       [t('g_mental'), pick(ATTR_GROUPS_GK[1][1])],
       [t('g_physical'), pick(ATTR_GROUPS_GK[2][1])]]
    : [[t('g_technical'), pick([...ATTR_GROUPS_OUTFIELD[0][1], ...ATTR_GROUPS_OUTFIELD[3][1]])],
       [t('g_mental'), pick(ATTR_GROUPS_OUTFIELD[1][1])],
       [t('g_physical'), pick(ATTR_GROUPS_OUTFIELD[2][1])]];
}

// Bouwt het kaartmodel uit een echte speler (alle afgeleide waardes en labels).
function buildCardModel(p) {
  const L = CARDL[state.lang] || CARDL.en;
  const isGk = (p.posArr || []).includes('GK');
  const meta = metaScore(p);
  const ca = p.ca || 0, pa = p.pa || 0;
  const wk = isWonderkid(p);
  const tier = wk ? 'gold' : ca >= 150 ? 'elite' : ca >= 115 ? 'strong' : 'neutral';

  const st = isFree(p) ? { t: L.sFree, c: '#8294a8' }
    : p.notForSale ? { t: L.sNfs, c: '#8294a8' }
    : p.setForRelease ? { t: L.sRel, c: '#e06060' }
    : p.listed ? { t: L.sListed, c: '#e8a13c' }
    : p.loanListed ? { t: L.sLoan, c: '#4aa3ff' }
    : null;

  const wr = p.worldRep || 0;
  const rep = wr >= 6500 ? L.repW : wr >= 4500 ? L.repC : wr >= 2500 ? L.repN : L.repL;
  const ip = p.attrs ? p.attrs.InjuryProneness : 0;
  const injury = ip > 0 ? (ip >= 14 ? { t: L.injH, c: '#e06060' } : ip >= 8 ? { t: L.injM, c: '#e8a13c' } : { t: L.injL, c: '#46c46e' }) : null;

  const ev = estValue(p);
  const fee = feeEstimate(p);
  // Verborgen stats uit → sterren blijven (scout-sterren zijn in FM gewoon zichtbaar),
  // maar rauwe CA/PA-getallen en de vraagprijs (afgeleid van CA) gaan van de kaart.
  const hideNum = state.hideCapa;
  const ask = !hideNum && fee.v > 0 ? `${fmtMoney(fee.v * 0.85)}–${fmtMoney(fee.v * 1.15)}` : '–';
  const roles = bestRoles(p, 2).map(r => [roleName(r.id), r.score]);
  const snapDate = state.meta.gameDate ? fmtDate(state.meta.gameDate) : '';

  return {
    L, tier, wk, gk: isGk, name: (p.name || '?').toUpperCase(),
    club: p.club || L.sFree, division: p.div || '', nation: natsLabel(p) || '',
    positions: (p.posArr || []).slice(0, 3).join(' · ') || '–',
    age: getAge(p), foot: footLabel(p), height: p.height ? p.height + ' cm' : '–',
    ca, pa, hideNum, hexNum: state.hideMeta ? null : meta != null ? meta.toFixed(1) : '–',
    groups: cardGroups(p, isGk), roles,
    value: ev.v > 0 ? (ev.est ? '~' : '') + fmtMoney(ev.v) : '–',
    ask, wage: p.wage > 0 ? fmtWage(p.wage) + ' ' + wageSuf() : '–', contract: fmtDate(p.expires) || '–',
    status: st, rep, injury, snap: 'FM26' + (snapDate ? ' · ' + snapDate : ''),
  };
}

const CARD_TIER = { elite: '#46c46e', strong: '#4aa3ff', neutral: '#aeb9c6', gold: '#f5c518' };
const cardFmc = v => v >= 16 ? '#46c46e' : v >= 11 ? '#e8a13c' : '#aeb9c6';
function cardAlpha(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

function drawPlayerCard(p) {
  const d = buildCardModel(p);
  const cv = document.createElement('canvas');
  cv.width = 1200; cv.height = 1600;
  const x = cv.getContext('2d');
  const W = 600, H = 800, g = 1;
  const P = { bg2: '#1c242f', bd: '#2a3441', tx: '#dbe4ee', mu: '#8294a8', gr: '#46c46e', am: '#e8a13c', gd: '#f5c518' };
  const T = CARD_TIER[d.tier], wk = d.wk;
  const A = cardAlpha, fmc = cardFmc;
  const F = (w, s) => `${w} ${s}px "Segoe UI", system-ui, sans-serif`;
  const ls = v => { try { x.letterSpacing = v; } catch (e) { } };
  const rr = (a, b, w, h, r) => { x.beginPath(); x.roundRect(a, b, w, h, r); };
  const hexPath = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  const cham = (i, c, col, lw) => { x.beginPath(); x.moveTo(i + c, i); x.lineTo(W - i - c, i); x.lineTo(W - i, i + c); x.lineTo(W - i, H - i - c); x.lineTo(W - i - c, H - i); x.lineTo(i + c, H - i); x.lineTo(i, H - i - c); x.lineTo(i, i + c); x.closePath(); x.strokeStyle = col; x.lineWidth = lw; x.stroke(); };
  const fit = (s, maxW, size, min, w) => { x.font = F(w, size); while (size > min && x.measureText(s).width > maxW) { size -= 1; x.font = F(w, size); } return size; };
  const trunc = (s, maxW) => { if (x.measureText(s).width <= maxW) return s; while (s.length > 2 && x.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; };
  const chipAt = (cx0, y0, text, col) => { x.font = F(800, 10.5); ls('1px'); const w = x.measureText(text).width + 24; rr(cx0, y0, w, 24, 12); x.fillStyle = A(col, .12); x.fill(); x.strokeStyle = A(col, .55); x.lineWidth = 1.25; rr(cx0, y0, w, 24, 12); x.stroke(); x.fillStyle = col; x.textAlign = 'left'; x.fillText(text, cx0 + 12, y0 + 16.5); ls('0px'); return w; };
  // 5-puntster met fractionele vulling (halve sterren, zoals FM-scoutrapporten).
  const starPath = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .47 : r; const px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); };
  const starRow = (x0, cy, r, step, val, fillCol, fillA) => {
    for (let i = 0; i < 5; i++) {
      const cx0 = x0 + i * step;
      const f = Math.max(0, Math.min(1, val - i));
      const frac = f >= .75 ? 1 : f >= .25 ? .5 : 0;
      starPath(cx0, cy, r); x.fillStyle = A('#0b0f14', .5); x.fill();
      x.strokeStyle = A(fillCol, .45); x.lineWidth = 1.25; x.stroke();
      if (frac > 0) {
        x.save(); starPath(cx0, cy, r); x.clip();
        x.fillStyle = A(fillCol, fillA);
        x.fillRect(cx0 - r, cy - r, 2 * r * frac, 2 * r);
        x.restore();
        starPath(cx0, cy, r); x.strokeStyle = A(fillCol, .9); x.stroke();
      }
    }
  };

  x.setTransform(2, 0, 0, 2, 0, 0);
  x.clearRect(0, 0, W, H);
  x.textBaseline = 'alphabetic';
  x.save(); rr(0, 0, W, H, 20); x.clip();
  let bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1c242f'); bg.addColorStop(.45, '#151b24'); bg.addColorStop(1, '#0e1218'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  let rg = x.createRadialGradient(300, 180, 0, 300, 180, 420); rg.addColorStop(0, A(T, d.tier === 'neutral' ? .08 : .13)); rg.addColorStop(1, A(T, 0)); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  if (wk) { x.save(); x.translate(300, 400); x.rotate(-.42); x.fillStyle = A(P.gd, .04); x.fillRect(-150, -620, 110, 1240); x.fillStyle = A(P.gd, .03); x.fillRect(10, -620, 34, 1240); x.restore(); }
  let tb = x.createLinearGradient(0, 0, W, 0); tb.addColorStop(0, A(T, 0)); tb.addColorStop(.12, A(T, .95)); tb.addColorStop(.88, A(T, .95)); tb.addColorStop(1, A(T, 0)); x.shadowColor = A(T, .6 * g); x.shadowBlur = 16 * g; x.fillStyle = tb; x.fillRect(0, 0, W, 5); x.shadowBlur = 0;
  cham(12, 18, A(T, .3), 1.25); if (wk) cham(17, 24, A(P.gd, .15), 1);

  // ----- header: identiteit links, bio rechts -----
  x.textAlign = 'left';
  const ns = fit(d.name, 386, 34, 21, 800); x.font = F(800, ns); x.fillStyle = P.tx; ls('-0.5px'); x.fillText(d.name, 28, 66); ls('0px');
  x.font = F(700, 14); x.fillStyle = A(P.tx, .92); x.fillText(trunc(d.club, 386), 28, 92);
  x.font = F(600, 11); x.fillStyle = P.mu; x.fillText(trunc(d.division, 386), 28, 110);
  x.textAlign = 'right';
  x.font = F(800, 19); x.fillStyle = P.tx; x.fillText(d.positions, 572, 52);
  x.font = F(600, 12); x.fillStyle = P.mu; x.fillText(`${d.age} · ${d.foot} · ${d.height}`, 572, 72);
  x.font = F(600, 11); x.fillStyle = A(P.mu, .85); x.fillText(trunc(d.nation, 190), 572, 90);
  if (wk) { x.font = F(800, 10.5); const ww = x.measureText(d.L.wk).width + 24; chipAt(572 - ww, 100, d.L.wk, P.gd); }

  // ----- sterrenpaneel: scout-sterren (huidig/potentieel) + meta-hexchip -----
  rr(24, 132, 552, 86, 12); x.fillStyle = A(P.bg2, .5); x.fill(); x.strokeStyle = A(P.bd, .7); x.lineWidth = 1; rr(24, 132, 552, 86, 12); x.stroke();
  const srLab = (tt, y) => { x.font = F(700, 9); ls('1.5px'); x.fillStyle = P.mu; x.textAlign = 'left'; x.fillText(tt, 42, y); ls('0px'); };
  srLab(d.L.cur, 164); srLab(d.L.pot, 199);
  starRow(146, 160, 12, 29, d.ca / 40, P.gd, .95);
  starRow(146, 195, 12, 29, d.pa / 40, P.gd, .45);
  if (!d.hideNum) {
    x.textAlign = 'left';
    x.font = F(800, 17); x.fillStyle = T; x.fillText(String(d.ca), 292, 166); let cw = x.measureText(String(d.ca)).width;
    x.font = F(700, 10); x.fillStyle = P.mu; x.fillText('CA', 292 + cw + 5, 166);
    x.font = F(800, 17); x.fillStyle = wk ? P.gd : P.tx; x.fillText(String(d.pa), 292, 201); cw = x.measureText(String(d.pa)).width;
    x.font = F(700, 10); x.fillStyle = P.mu; x.fillText('PA', 292 + cw + 5, 201);
  }
  // meta-hexchip (FMSS-handtekening); vervalt als de meta-toggle uit staat
  if (d.hexNum !== null) {
    hexPath(512, 175, 33); x.fillStyle = P.bg2; x.shadowColor = A(T, .5 * g); x.shadowBlur = 14 * g; x.fill(); x.shadowBlur = 0; x.strokeStyle = A(T, .9); x.lineWidth = 1.5; x.stroke();
    hexPath(512, 175, 27); x.strokeStyle = A(T, .22); x.lineWidth = 1; x.stroke();
    x.textAlign = 'center'; x.fillStyle = T; x.font = F(800, 20); x.fillText(d.hexNum, 512, 181);
    x.font = F(700, 7.5); x.fillStyle = P.mu; ls('1.5px'); x.fillText(d.L.meta, 512, 195); ls('0px');
  }

  // ----- attributengrid: 3 kolommen in FM-kleuren, zebra-rijen, chips voor 16+ -----
  const cols = [24, 216, 408], colW = 168, rowH = 20, rowY0 = 280;
  const gridHead = (tt, x0, y0) => {
    x.font = F(800, 10); ls('1.5px'); x.fillStyle = P.mu; x.textAlign = 'left'; x.fillText(tt.toUpperCase(), x0, y0); ls('0px');
    rr(x0, y0 + 8, colW, 2, 1); x.fillStyle = A(T, .5); x.fill();
  };
  d.groups.forEach((grp, gi) => {
    const x0 = cols[gi];
    gridHead(grp[0], x0, 250);
    grp[1].forEach(([nm, v], idx) => {
      const ry = rowY0 + idx * rowH;
      if (idx % 2 === 0) { rr(x0 - 6, ry - 14, colW + 12, 19, 4); x.fillStyle = A('#0b0f14', .35); x.fill(); }
      // lange NL-labels ("Beheersing strafschopgebied") krimpen eerst, afkappen is laatste redmiddel
      x.textAlign = 'left'; const lsz = fit(nm, colW - 36, 10.5, 8.5, 600); x.font = F(600, lsz); x.fillStyle = A(P.tx, .72); x.fillText(trunc(nm, colW - 36), x0, ry);
      const vx = x0 + colW;
      if (v >= 16) {
        rr(vx - 28, ry - 13.5, 31, 18, 5); x.fillStyle = A(P.gr, v >= 18 ? .3 : .17); x.fill();
        if (v >= 18) { x.strokeStyle = A(P.gr, .5); x.lineWidth = 1; rr(vx - 28, ry - 13.5, 31, 18, 5); x.stroke(); }
        x.textAlign = 'right'; x.font = F(800, 12.5); x.fillStyle = v >= 18 ? '#7ee2a0' : P.gr; x.fillText(String(v), vx - 5, ry);
      } else {
        x.textAlign = 'right'; x.font = F(v >= 11 ? 700 : 600, 12); x.fillStyle = v >= 11 ? P.am : A(P.mu, .95); x.fillText(String(v), vx - 5, ry);
      }
    });
  });

  // ----- beste rollen: onder Fysiek in kolom 3 -----
  const rx = cols[2], physRows = d.groups[2][1].length;
  const rolesY = rowY0 + physRows * rowH + 18;
  gridHead(d.L.roles, rx, rolesY);
  d.roles.forEach((r, i) => { const yy = rolesY + 32 + i * 38;
    x.textAlign = 'left'; const rsz = fit(r[0], colW - 38, 11.5, 9, 700); x.font = F(700, rsz); x.fillStyle = P.tx; x.fillText(trunc(r[0], colW - 38), rx, yy);
    x.textAlign = 'right'; x.font = F(800, 13); x.fillStyle = fmc(r[1]); x.fillText(r[1].toFixed(1), rx + colW, yy);
    rr(rx, yy + 7, colW, 4, 2); x.fillStyle = A(P.bd, .8); x.fill();
    rr(rx, yy + 7, colW * Math.min(20, r[1]) / 20, 4, 2); x.fillStyle = fmc(r[1]); x.fill(); });

  // ----- financiën + status/reputatie/blessures -----
  rr(24, 564, 552, 104, 12); x.fillStyle = A(P.bg2, .35); x.fill(); x.strokeStyle = A(P.bd, .7); x.lineWidth = 1; rr(24, 564, 552, 104, 12); x.stroke();
  const fx = [44, 180, 316, 452], flab = [d.L.value, d.L.ask, d.L.wage, d.L.contract], fval = [d.value, d.ask, d.wage, d.contract];
  x.textAlign = 'left'; flab.forEach((l, i) => { x.font = F(700, 9.5); ls('1.5px'); x.fillStyle = P.mu; x.fillText(l, fx[i], 590); ls('0px');
    const vs = fit(fval[i], 126, i === 0 ? 18 : 15, 11, 800); x.font = F(800, vs); x.fillStyle = i === 0 ? T : P.tx; x.fillText(fval[i], fx[i], 616); });
  x.strokeStyle = A(P.bd, .5); x.beginPath(); x.moveTo(44, 632); x.lineTo(556, 632); x.stroke();
  x.font = F(600, 11.5); x.fillStyle = P.mu; x.textAlign = 'left'; x.fillText(d.L.rep + ' · ' + d.rep, 44, 654);
  if (d.status) { x.font = F(800, 10.5); const sw = x.measureText(d.status.t).width + 24; chipAt(300 - sw / 2, 636, d.status.t, d.status.c); }
  if (d.injury) { x.font = F(700, 11.5); const iw = x.measureText(d.injury.t).width; x.fillStyle = d.injury.c; x.textAlign = 'right'; x.fillText(d.injury.t, 556, 654);
    x.font = F(600, 11.5); x.fillStyle = P.mu; x.fillText(d.L.inj + ' ·', 556 - iw - 6, 654); }

  // ----- footer -----
  x.strokeStyle = A(P.bd, .7); x.beginPath(); x.moveTo(40, 700); x.lineTo(560, 700); x.stroke();
  x.textAlign = 'left'; x.font = F(600, 12); x.fillStyle = P.mu; x.fillText(d.snap, 40, 738);
  x.font = F(800, 19); const w1 = x.measureText('FM').width, w2 = x.measureText('Super').width, w3 = x.measureText('Scout').width;
  let sx = 562 - (w1 + w2 + w3);
  hexPath(sx - 16, 733, 7); x.fillStyle = A(T, .9); x.fill();
  x.fillStyle = P.tx; x.fillText('FM', sx, 739); x.fillStyle = P.gr; x.fillText('Super', sx + w1, 739); x.fillStyle = P.tx; x.fillText('Scout', sx + w1 + w2, 739);
  x.restore();

  // borders
  x.strokeStyle = A(T, .95); x.lineWidth = 2.5; x.shadowColor = A(T, .55 * g); x.shadowBlur = 18 * g; rr(1.5, 1.5, 597, 797, 19); x.stroke(); x.shadowBlur = 0;
  x.strokeStyle = A(P.bd, .9); x.lineWidth = 1; rr(6.5, 6.5, 587, 787, 15); x.stroke();
  return cv;
}

function downloadPlayerCard(p) {
  try {
    drawPlayerCard(p).toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `fmss-${(p.name || 'speler').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
    showToast(t('cardSaved'), 'check');
    bumpStat('fmss_cards');   // teller voor het seizoensrapport
    coffeeGlow();             // net iets opgeleverd: zacht waardemoment
  } catch { showToast('!'); }
}

// ---------- app-stijl helptooltip ----------
// Elk element met data-help="<i18n-key>" krijgt bij hover een tooltip in de app-stijl
// (i.p.v. de kale Windows-title-popup). De tekst wordt op het moment van tonen uit de
// actieve taal gehaald, dus taalwissels werken vanzelf. Met data-tip="<letterlijke tekst>"
// kan hetzelfde voor al samengestelde tekst, zoals de meetpunten in de ontwikkelgrafiek.
function initHelpTip() {
  const tip = document.createElement('div');
  tip.id = 'help-tip'; tip.className = 'hidden';
  document.body.appendChild(tip);
  let cur = null, timer = 0, warmUntil = 0;
  const hide = () => { cur = null; clearTimeout(timer); tip.classList.add('hidden'); };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-help],[data-tip]');
    if (el === cur) return;
    clearTimeout(timer);
    const wasVisible = !tip.classList.contains('hidden');
    if (!el) {
      // Net een tip verlaten: korte "warme" periode waarin de volgende meteen toont,
      // zoals OS-menu's. Daarbuiten geldt de vertraging weer.
      if (wasVisible) warmUntil = Date.now() + 400;
      hide(); return;
    }
    cur = el;
    const show = () => {
      tip.textContent = el.dataset.tip ?? t(el.dataset.help);
      tip.classList.remove('hidden');
      const r = el.getBoundingClientRect();
      tip.style.left = '0px'; tip.style.top = '0px';               // eerst meten op (0,0)
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let xPos = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2));
      let yPos = r.bottom + 8;
      if (yPos + th > window.innerHeight - 8) yPos = r.top - th - 8;
      tip.style.left = xPos + 'px'; tip.style.top = yPos + 'px';
    };
    // Vertraging voorkomt flikkerende tips terwijl je met de muis over de tabel beweegt
    // (elke naamcel heeft er een). Direct doorschuiven van tip naar tip blijft instant.
    if (wasVisible || Date.now() < warmUntil) show();
    else timer = setTimeout(show, 450);
  });
  document.addEventListener('scroll', hide, true);
}
initHelpTip();

// ---------- update-melding ----------
// Checkt hooguit 1x per ~20 uur de laatste GitHub-release (API staat CORS toe) en toont
// een wegklikbaar pilletje in de topbar bij een nieuwere versie. Offline/fout = stil.
// Met force=true (knop in Instellingen): cache en eerdere wegklik negeren, en het
// resultaat teruggeven zodat de knop "up-to-date"/"update gevonden" kan tonen;
// een fout bubbelt dan op naar de knop i.p.v. stil te blijven.
async function checkUpdate(force = false) {
  try {
    let chk = {};
    try { chk = JSON.parse(localStorage.getItem('fmss_updchk') || '{}'); } catch { }
    if (force || !chk.at || Date.now() - chk.at > 20 * 3600e3) {
      // Eerst via de lokale server naar het version.json-asset (download-teller = anonieme
      // maat voor actieve installaties); lukt dat niet, dan de gewone GitHub-API.
      let tag = null;
      try { const r = await fetch('/api/version-check'); if (r.ok) tag = (await r.json()).tag; } catch { }
      if (!tag) {
        const res = await fetch('https://api.github.com/repos/mavarobli/FMSuperScout/releases/latest');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        tag = (await res.json()).tag_name;
      }
      chk = { at: Date.now(), tag };
      localStorage.setItem('fmss_updchk', JSON.stringify(chk));
    }
    if (!chk.tag) return { newer: false, tag: null };
    const norm = v => String(v).replace(/^v/, '').split('.').map(n => parseInt(n) || 0);
    const [l, c] = [norm(chk.tag), norm(APP_VERSION)];
    const newer = l[0] !== c[0] ? l[0] > c[0] : l[1] !== c[1] ? l[1] > c[1] : (l[2] || 0) > (c[2] || 0);
    if (force) localStorage.removeItem('fmss_upd_dismiss');   // handmatige check heropent de melding bewust
    if (!newer || localStorage.getItem('fmss_upd_dismiss') === chk.tag) return { newer, tag: chk.tag };
    const el = $('update-pill');
    el.innerHTML = `<a href="${REPO_URL}/releases/latest" target="_blank" rel="noopener">${tf('updateAvail', { v: chk.tag })}</a>
      <button title="${t('donateLater')}">${icon('x', 10)}</button>`;
    el.classList.remove('hidden');
    // Klik = downloaden + installer starten (server verifieert de SHA-256). Faalt het,
    // dan valt de pill terug op de gewone link naar de releasepagina.
    el.querySelector('a').onclick = e => { e.preventDefault(); startSelfUpdate(el); };
    el.querySelector('button').onclick = () => { localStorage.setItem('fmss_upd_dismiss', chk.tag); el.classList.add('hidden'); };
    return { newer, tag: chk.tag };
  } catch (e) {
    if (force) throw e;   // knop toont de foutmelding; de stille autocheck blijft stil
  }
}

// Zelf-update: server downloadt en verifieert de nieuwe Setup.exe en start hem; wij
// tonen alleen de voortgang in de pill. Als de server stopt ('launching' gezien of
// verbinding weg), is de installer bezig en tonen we de slottekst.
async function startSelfUpdate(el) {
  const setTxt = (txt, cls = '') => { el.innerHTML = `<span class="${cls}">${escHtml(txt)}</span>`; };
  try {
    setTxt(tf('updDl', { pct: 0 }));
    await fetch('/api/update-install', { method: 'POST' });
    for (; ;) {
      await new Promise(r => setTimeout(r, 500));
      let st;
      try { st = await (await fetch('/api/update-status')).json(); }
      catch { break; }   // server al gestopt voor de installer
      if (st.phase === 'downloading') setTxt(tf('updDl', { pct: st.pct || 0 }));
      else if (st.phase === 'verifying') setTxt(t('updVerify'));
      else if (st.phase === 'launching') break;
      else if (st.phase === 'error') {
        el.innerHTML = `<a href="${REPO_URL}/releases/latest" target="_blank" rel="noopener">${escHtml(t('updErr'))}</a>`;
        console.error('update:', st.error);
        return;
      }
    }
    setTxt(t('updLaunch'));
  } catch {
    el.innerHTML = `<a href="${REPO_URL}/releases/latest" target="_blank" rel="noopener">${escHtml(t('updErr'))}</a>`;
  }
}

// ---------- probleem melden ----------
// Opent een voorgevuld GitHub-issue met de omgevingsinfo die we hebben; de gebruiker
// hoeft alleen het verhaal en de diagnostiekbestanden toe te voegen.
async function reportBug() {
  // Kop van diagnostics.txt (t/m de eerste lege regel) automatisch meesturen: leesbron
  // (live/snapshot), geheugenstatus en fase-timing — precies de telemetrie waarmee
  // veldproblemen te herleiden zijn, en het bestand zelf wordt vaak vergeten.
  let diag = [];
  try {
    const r = await fetch('/api/diagnostics');
    if (r.ok) {
      const head = (await r.text()).split(/\r?\n/).slice(0, 12);
      const cut = head.findIndex(l => !l.trim());
      diag = ['', '### Last scan telemetry (auto-filled from diagnostics.txt)', '```',
              ...(cut < 0 ? head : head.slice(0, cut)), '```'];
    }
  } catch { /* geen server of geen diagnostics: sectie gewoon weglaten */ }
  const m = state.meta || {};
  const body = [
    '### What happened?', '', '_Describe the problem here._', '',
    '### Environment (auto-filled)',
    `- FMSuperScout app: v${APP_VERSION}`,
    `- Plugin: ${m.pluginVersion || 'unknown (dump predates v0.1.34 or no dump loaded)'}`,
    `- FM game version: ${m.gameVersion || 'unknown'} (supported: ${m.supportedVersion || '?'}, ok: ${m.versionOk ?? '?'})`,
    `- Players/staff loaded: ${state.players.length} / ${state.staff.length}`,
    ...(lastStatus && lastStatus.dumpSize
      ? [`- Dump on disk: ${(lastStatus.dumpSize / 1048576).toFixed(0)} MB (${lastStatus.dumpFile || 'dump.json'})`] : []),
    ...(loadError ? [`- Load error: ${loadError.msg}`] : []),
    `- Platform: Steam / Epic / Game Pass? _(fill in)_`,
    ...diag,
    '',
    '### Attach these files (important!)',
    'From `%LOCALAPPDATA%\\FMSuperScout\\`: `diagnostics.txt` and `status.json`.',
    'From your FM folder: `BepInEx\\LogOutput.log` (if it exists).',
  ].join('\n');
  window.open(`${REPO_URL}/issues/new?title=${encodeURIComponent('[bug] ')}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
}

// ---------- steun (Ko-fi): één seizoensrapport per voetbalseizoen ----------
// Eén moment, en het juiste: rolt het in-game seizoen over 1 juli heen, dan verschijnt
// één wegklikbaar kaartje met wat de tool dat seizoen voor je deed, en daaronder de
// vraag. Niet vaker, niet minder vaak. "Al gedoneerd?" of "Vraag het niet meer" maakt
// het permanent stil; donateurs krijgen een goudkleurig koffie-icoon als bedankje.
const KOFI = 'https://ko-fi.com/fmsuperscout';
function openKofi() { window.open(KOFI, '_blank', 'noopener'); }
const kofiOff = () => localStorage.getItem('fmss_kofi_off') === '1';
// Gebruikstellers voor het rapport; de baseline wordt bij elk rapport verschoven zodat
// de cijfers per seizoen zijn, niet cumulatief.
function bumpStat(k) { try { localStorage.setItem(k, String((+localStorage.getItem(k) || 0) + 1)); } catch { } }

// Seizoensjaar: 1 juli is de grens, zoals in het echte voetbal. 10-07-2029 → seizoen
// 2029/30 is net begonnen. Zonder exacte datum valt het terug op het afgeleide
// seizoensjaar uit de dump (zelfde grens, want dat ís een seizoensjaar).
function seasonYearOf() {
  const ds = state.meta.gameDate;
  if (ds) { const d = parseGameDate(ds); if (!isNaN(d)) return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1; }
  return state.meta.gameYear || 0;
}
function maybeSeasonReport() {
  if (kofiOff()) return;
  const y = seasonYearOf(); if (!y) return;
  const prev = +localStorage.getItem('fmss_season') || 0;
  if (!prev || y < prev) {   // allereerste dump, of een oudere save geladen: ijken, niet vragen
    localStorage.setItem('fmss_season', String(y));
    return;
  }
  if (y === prev) return;
  localStorage.setItem('fmss_season', String(y));
  // Vangnet voor save-wissels: wie tussen twee careers in verschillende jaren springt,
  // krijgt niet bij elke wissel een rapport. Het seizoensijkpunt schuift wel gewoon mee.
  const lastAt = +localStorage.getItem('fmss_season_at') || 0;
  if (Date.now() - lastAt < 7 * 864e5) return;
  localStorage.setItem('fmss_season_at', String(Date.now()));

  let base; try { base = JSON.parse(localStorage.getItem('fmss_season_base') || '{}'); } catch { base = {}; }
  const cur = { uses: +localStorage.getItem('fmss_uses') || 0, loads: +localStorage.getItem('fmss_loads') || 0, cards: +localStorage.getItem('fmss_cards') || 0 };
  try { localStorage.setItem('fmss_season_base', JSON.stringify(cur)); } catch { }
  const n = k => Math.max(0, cur[k] - (+base[k] || 0));
  const stats = [];
  if (n('uses') > 0) stats.push(tf('seasonStatProfiles', { n: n('uses').toLocaleString(uiLocale()) }));
  if (n('loads') > 0) stats.push(tf('seasonStatLoads', { n: n('loads') }));
  if (n('cards') > 0) stats.push(tf('seasonStatCards', { n: n('cards') }));
  if (state.shortlist.size > 0) stats.push(tf('seasonStatShort', { n: state.shortlist.size }));

  const season = `${y - 1}/${String(y).slice(2)}`;
  // Bewuste asymmetrie: het eerste rapport heeft geen permanente uitknop (wegklikken kan
  // altijd via kruisje of Later); "Vraag het niet meer" verschijnt vanaf het tweede
  // rapport, klein en zonder onderstreping. "Al gedoneerd?" is er wel meteen.
  const shown = +localStorage.getItem('fmss_season_n') || 0;
  localStorage.setItem('fmss_season_n', String(shown + 1));
  const el = $('donate-nudge');
  el.innerHTML = `<button class="dn-x" title="${t('donateLater')}">${icon('x', 12)}</button>
    <div class="dn-title">${icon('ball', 15)} ${escHtml(tf('seasonTitle', { s: season }))}</div>
    ${stats.length ? `<div class="dn-stats">${stats.join(' · ')}</div>` : ''}
    <div class="dn-text">${t('seasonAsk')}</div>
    <div class="dn-actions"><a class="dn-cta" href="${KOFI}" target="_blank" rel="noopener">${t('donateCta')}</a>
      <button class="dn-later">${t('donateLater')}</button></div>
    <div class="dn-links"><button class="dn-donated">${t('alreadyDonated')}</button>${shown >= 1 ? `<button class="dn-never">${t('neverAsk')}</button>` : ''}</div>`;
  el.classList.remove('hidden');
  const close = () => el.classList.add('hidden');
  el.querySelector('.dn-cta').onclick = close;
  el.querySelector('.dn-later').onclick = close;
  el.querySelector('.dn-x').onclick = close;
  el.querySelector('.dn-donated').onclick = () => {
    localStorage.setItem('fmss_kofi_off', '1'); localStorage.setItem('fmss_supporter', '1');
    $('btn-coffee').classList.add('supporter');
    showToast(t('supporterThanks'), 'check'); close();
  };
  const nv = el.querySelector('.dn-never');
  if (nv) nv.onclick = () => { localStorage.setItem('fmss_kofi_off', '1'); close(); };
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
      const bits = [val, p.wage > 0 ? fmtWage(p.wage) + ' ' + wageSuf() : null,
        p.expires ? String(p.expires).slice(0, 4) : null].filter(Boolean).join(' · ');
      return `<div class="cmp-cell"><div class="cmp-name">${escHtml(p.name)}</div>` +
        `<div class="cmp-meta">${getAge(p)} · ${escHtml(p.pos || jobLabel(p))} · ${p.club ? escHtml(p.club) : '–'}` +
        `${bits ? `<br>${bits}` : ''}` +
        `${p.attrs ? `<br><span class="cmp-winsb">${tf('cmpWinsBadge', { n: wins[i] })}</span>` : ''}</div></div>`;
    }).join('') +
    (two ? `<div class="cmp-cell cmp-delta" data-help="cmpDeltaHint">Δ</div>` : '') + '</div>';

  // ----- kerngetallen -----
  let body = '';
  if (!state.hideCapa) {
    body += row('CA', players.map(p => p.ca));
    body += row('PA', players.map(p => p.pa));
  }
  if (!state.hideMeta) body += row(t('c_meta'), players.map(p => metaScore(p)), { fmt: v => v.toFixed(1) });
  if (!state.hideMeta && !state.hideCapa) body += row(t('c_metapa'), players.map(p => metaPaScore(p)), { fmt: v => v.toFixed(1) });
  body += row(t('cmpValue'), players.map(p => estValue(p).v), { fmt: fmtMoney, hi: null });
  if (!state.hideCapa)
    body += row(t('c_fee'), players.map(p => { const f = feeEstimate(p); return f.v > 0 ? f.v : null; }), { fmt: fmtMoney, hi: false });
  body += row(t('wageLabel') + ' ' + wageSuf(), players.map(p => p.wage), { fmt: fmtWage, hi: false });
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
      return '<span class="cbar"><i class="cb-tick"></i></span>';
    const d = a - b;
    const p1beter = (d > 0) === (hi !== false);
    const pct = Math.min(100, Math.round(Math.abs(d) / 8 * 100));   // 8 punten verschil = vol
    const dTxt = d === 0 ? '=' : (d > 0 ? '+' : '−') + (dec ? Math.abs(d).toFixed(dec) : Math.abs(d));
    return `<span class="cbar" data-tip="Δ ${escHtml(dTxt)}"><i class="cb-tick"></i>` +
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

// ================= MODULE MEILLEUR XI, TACTIQUE & MERCATO =================
const XI_FORMATIONS = {
  '4-3-3': [
    {role: 'af', line: 'fw', side: 'C', t: 15, l: 50},
    {role: 'wing', line: 'am', side: 'L', t: 25, l: 15},
    {role: 'wing', line: 'am', side: 'R', t: 25, l: 85},
    {role: 'cm', line: 'cm', side: 'CL', t: 45, l: 30},
    {role: 'cm', line: 'cm', side: 'CR', t: 45, l: 70},
    {role: 'dm', line: 'dm', side: 'C', t: 60, l: 50},
    {role: 'fb', line: 'df', side: 'L', t: 75, l: 15},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 35},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 65},
    {role: 'fb', line: 'df', side: 'R', t: 75, l: 85},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ],
  '4-2-3-1': [
    {role: 'af', line: 'fw', side: 'C', t: 15, l: 50},
    {role: 'wing', line: 'am', side: 'L', t: 30, l: 15},
    {role: 'am', line: 'am', side: 'C', t: 30, l: 50},
    {role: 'wing', line: 'am', side: 'R', t: 30, l: 85},
    {role: 'dm', line: 'dm', side: 'CL', t: 55, l: 35},
    {role: 'dm', line: 'dm', side: 'CR', t: 55, l: 65},
    {role: 'fb', line: 'df', side: 'L', t: 75, l: 15},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 35},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 65},
    {role: 'fb', line: 'df', side: 'R', t: 75, l: 85},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ],
  '4-4-2': [
    {role: 'af', line: 'fw', side: 'CL', t: 15, l: 35},
    {role: 'af', line: 'fw', side: 'CR', t: 15, l: 65},
    {role: 'wing', line: 'cm', side: 'L', t: 45, l: 15},
    {role: 'cm', line: 'cm', side: 'CL', t: 45, l: 35},
    {role: 'cm', line: 'cm', side: 'CR', t: 45, l: 65},
    {role: 'wing', line: 'cm', side: 'R', t: 45, l: 85},
    {role: 'fb', line: 'df', side: 'L', t: 75, l: 15},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 35},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 65},
    {role: 'fb', line: 'df', side: 'R', t: 75, l: 85},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ],
  '5-3-2': [
    {role: 'af', line: 'fw', side: 'CL', t: 15, l: 35},
    {role: 'af', line: 'fw', side: 'CR', t: 15, l: 65},
    {role: 'cm', line: 'cm', side: 'CL', t: 45, l: 30},
    {role: 'cm', line: 'cm', side: 'C', t: 45, l: 50},
    {role: 'cm', line: 'cm', side: 'CR', t: 45, l: 70},
    {role: 'wb', line: 'df', side: 'L', t: 65, l: 15},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 35},
    {role: 'cd', line: 'df', side: 'C', t: 75, l: 50},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 65},
    {role: 'wb', line: 'df', side: 'R', t: 65, l: 85},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ],
  '4-2-4': [
    {role: 'af', line: 'fw', side: 'CL', t: 15, l: 35},
    {role: 'af', line: 'fw', side: 'CR', t: 15, l: 65},
    {role: 'wing', line: 'am', side: 'L', t: 30, l: 15},
    {role: 'wing', line: 'am', side: 'R', t: 30, l: 85},
    {role: 'cm', line: 'cm', side: 'CL', t: 50, l: 35},
    {role: 'cm', line: 'cm', side: 'CR', t: 50, l: 65},
    {role: 'fb', line: 'df', side: 'L', t: 75, l: 15},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 35},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 65},
    {role: 'fb', line: 'df', side: 'R', t: 75, l: 85},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ],
  '5-4-1': [
    {role: 'af', line: 'fw', side: 'C', t: 15, l: 50},
    {role: 'wing', line: 'cm', side: 'L', t: 45, l: 15},
    {role: 'cm', line: 'cm', side: 'CL', t: 45, l: 35},
    {role: 'cm', line: 'cm', side: 'CR', t: 45, l: 65},
    {role: 'wing', line: 'cm', side: 'R', t: 45, l: 85},
    {role: 'wb', line: 'df', side: 'L', t: 65, l: 15},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 35},
    {role: 'cd', line: 'df', side: 'C', t: 75, l: 50},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 65},
    {role: 'wb', line: 'df', side: 'R', t: 65, l: 85},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ],
  '4-1-4-1': [
    {role: 'af', line: 'fw', side: 'C', t: 15, l: 50},
    {role: 'wing', line: 'cm', side: 'L', t: 40, l: 15},
    {role: 'cm', line: 'cm', side: 'CL', t: 40, l: 35},
    {role: 'cm', line: 'cm', side: 'CR', t: 40, l: 65},
    {role: 'wing', line: 'cm', side: 'R', t: 40, l: 85},
    {role: 'dm', line: 'dm', side: 'C', t: 55, l: 50},
    {role: 'fb', line: 'df', side: 'L', t: 75, l: 15},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 35},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 65},
    {role: 'fb', line: 'df', side: 'R', t: 75, l: 85},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ],
  '3-4-3': [
    {role: 'af', line: 'fw', side: 'C', t: 15, l: 50},
    {role: 'wing', line: 'am', side: 'L', t: 25, l: 20},
    {role: 'wing', line: 'am', side: 'R', t: 25, l: 80},
    {role: 'cm', line: 'cm', side: 'CL', t: 45, l: 35},
    {role: 'cm', line: 'cm', side: 'CR', t: 45, l: 65},
    {role: 'wb', line: 'dm', side: 'L', t: 55, l: 15},
    {role: 'wb', line: 'dm', side: 'R', t: 55, l: 85},
    {role: 'cd', line: 'df', side: 'CL', t: 75, l: 30},
    {role: 'cd', line: 'df', side: 'C', t: 75, l: 50},
    {role: 'cd', line: 'df', side: 'CR', t: 75, l: 70},
    {role: 'gk', line: 'gk', side: 'C', t: 90, l: 50}
  ]
};

// Maps a Best XI slot to a meta group name, so we use position-specific weights when scoring.
// wing/if disambiguation: cm-line = wide mid (WM), am-line = attacking wing (AM).
function slotMetaGroup(slot) {
  switch (slot.role) {
    case 'gk':                                        return 'GK';
    case 'cd': case 'bpd':                            return 'DC';
    case 'fb': case 'wb':                             return 'FB';
    case 'dm': case 'dlp': case 'bwm':               return 'DM';
    case 'cm': case 'b2b': case 'ap':                return 'MC';
    case 'wing': case 'if':
      return slot.line === 'cm' ? 'WM' : 'AM';
    case 'am':                                        return 'AM';
    case 'af': case 'poacher': case 'tm': case 'cf': return 'ST';
    default: return null;
  }
}

// Returns the specific FM position codes that a slot requires.
// Only positions consistent with the slot's meta group are included, so proficiency
// lookups are always against the right position (AML ≠ AMC even though both are 'AM' group).
function slotFmPositions(slot) {
  const { role, side, line } = slot;
  switch (role) {
    case 'gk':   return ['GK'];
    case 'cd': case 'bpd':  return ['DC'];
    case 'fb':
      // Full-back role → classic DR/DL positions
      if (side === 'L' || side === 'CL') return ['DL'];
      if (side === 'R' || side === 'CR') return ['DR'];
      return ['DL', 'DR'];
    case 'wb':
      // Wing-back role → WBR/WBL positions; DR=20/WBR=7 at a WBR slot uses WBR proficiency
      if (side === 'L' || side === 'CL') return ['WBL'];
      if (side === 'R' || side === 'CR') return ['WBR'];
      return ['WBL', 'WBR'];
    case 'dm': case 'dlp': case 'bwm': return ['DM'];
    case 'cm': case 'b2b': case 'ap':  return ['MC'];
    case 'wing': case 'if':
      // am-line = AM weight table → AML/AMR; cm-line = WM weight table → ML/MR
      if (line === 'am') {
        if (side === 'L' || side === 'CL') return ['AML'];
        if (side === 'R' || side === 'CR') return ['AMR'];
        return ['AML', 'AMR'];
      } else {
        if (side === 'L' || side === 'CL') return ['ML'];
        if (side === 'R' || side === 'CR') return ['MR'];
        return ['ML', 'MR'];
      }
    case 'am':   return ['AMC'];
    case 'af': case 'poacher': case 'tm': case 'cf': return ['ST'];
    default: return [];
  }
}

function canPlaySlot(p, slot) {
  const pos = p.posArr || [];
  if (!pos.length) return false;
  const role = slot.role;
  const side = slot.side;

  if (role === 'gk') return pos.includes('GK');
  if (role === 'cd' || role === 'bpd') return pos.includes('DC');
  if (role === 'fb' || role === 'wb') {
    if (side === 'L' || side === 'CL') return pos.includes('DL') || pos.includes('WBL');
    if (side === 'R' || side === 'CR') return pos.includes('DR') || pos.includes('WBR');
    return pos.includes('DL') || pos.includes('DR') || pos.includes('WBL') || pos.includes('WBR');
  }
  if (role === 'dm' || role === 'dlp' || role === 'bwm') return pos.includes('DM');
  if (role === 'cm' || role === 'b2b' || role === 'ap') return pos.includes('MC');
  if (role === 'wing' || role === 'if') {
    if (side === 'L' || side === 'CL') return pos.includes('AML') || pos.includes('ML');
    if (side === 'R' || side === 'CR') return pos.includes('AMR') || pos.includes('MR');
    return pos.includes('AML') || pos.includes('AMR') || pos.includes('ML') || pos.includes('MR');
  }
  if (role === 'am') return pos.includes('AMC');
  if (role === 'af' || role === 'poacher' || role === 'tm' || role === 'cf') return pos.includes('ST');
  return false;
}

function findOptimalLineup(squad, formation) {
  // Pre-compute RAW (pre-proficiency) meta score per group per player.
  // Proficiency is applied per-slot below, using slotFmPositions() so that AML and AMC
  // are treated as distinct positions even though both belong to the 'AM' meta group.
  const rawGroupCache = new Map(squad.map(p => [
    p.id,
    p.attrs
      ? Object.fromEntries(
          Object.entries(META_W_BY_GROUP)
            .map(([g, W]) => [g, weightedMetaWithWeights(p, p.attrs, W)])
            .filter(([, s]) => s != null)
        )
      : {},
  ]));

  const candidatesForSlot = formation.map(f => {
    const group = slotMetaGroup(f);
    const fmPositions = slotFmPositions(f); // exact FM positions for this slot
    let list = squad.map(p => {
      if (!p.attrs) return null;
      let score;
      if (group != null) {
        const rawScore = (rawGroupCache.get(p.id) || {})[group];
        if (rawScore == null) return null;
        // Proficiency: best value across the specific FM positions this slot requires.
        // null posProficiency → old dump with no data → no penalty (assume natural).
        // Known zero → never trained there → max penalty (0.40).
        const prof = p.posProficiency != null
          ? Math.max(0, ...fmPositions.map(pos => p.posProficiency[pos] ?? 0))
          : null;
        score = rawScore * proficiencyFactor(prof);
      } else {
        score = metaScore(p);
      }
      return score != null && score > 0 ? { player: p, score } : null;
    }).filter(Boolean);
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, 15);
  });

  let bestSum = -1, bestLineup = null;
  let maxRemaining = new Array(12).fill(0);
  for (let i = 10; i >= 0; i--) {
    maxRemaining[i] = maxRemaining[i + 1] + (candidatesForSlot[i][0] ? candidatesForSlot[i][0].score : 0);
  }

  let assignedIds = new Set(), currentLineup = new Array(11), iterations = 0;

  function dfs(slotIdx, currentSum) {
    if (iterations++ > 300000) return;
    if (currentSum + maxRemaining[slotIdx] <= bestSum) return;
    if (slotIdx === 11) { bestSum = currentSum; bestLineup = [...currentLineup]; return; }

    let found = false;
    for (let cand of candidatesForSlot[slotIdx]) {
      if (!assignedIds.has(cand.player.id)) {
        found = true;
        assignedIds.add(cand.player.id);
        currentLineup[slotIdx] = {
          player: cand.player, score: cand.score, role: formation[slotIdx].role,
          t: formation[slotIdx].t, l: formation[slotIdx].l
        };
        dfs(slotIdx + 1, currentSum + cand.score);
        assignedIds.delete(cand.player.id);
      }
    }
    if (!found) {
      currentLineup[slotIdx] = { player: null, score: 0, role: formation[slotIdx].role, t: formation[slotIdx].t, l: formation[slotIdx].l };
      dfs(slotIdx + 1, currentSum);
    }
  }

  dfs(0, 0);
  return bestLineup ? { lineup: bestLineup, score: bestSum } : null;
}

function autoDetectBestFormation(squad) {
  let bestFormationKey = null, bestResult = null, highestAvgScore = -1;
  const formationKeys = Object.keys(XI_FORMATIONS).filter(k => k !== 'custom' && k !== 'custom_active');

  formationKeys.forEach(fKey => {
    const formation = XI_FORMATIONS[fKey];
    const res = findOptimalLineup(squad, formation);
    if (res && res.score > 0) {
      const avg = res.score / 11;
      if (avg > highestAvgScore) {
        highestAvgScore = avg;
        bestFormationKey = fKey;
        bestResult = res;
      }
    }
  });
  return { key: bestFormationKey, result: bestResult };
}

function triggerBestFormationAuto() {
  const myClub = (state.meta.myClub || '').toLowerCase();
  if (!myClub) { showToast("Aucun club sélectionné", "warning"); return; }
  const squad = state.players.filter(p => (p.club || '').toLowerCase() === myClub);
  const best = autoDetectBestFormation(squad);
  if (best && best.key) {
    state.bestXiFormation = best.key;
    renderBestXI();
    showToast(`Compo optimale : ${best.key} (${(best.result.score / 11).toFixed(1)} moy.)`, "check");
  } else {
    showToast("Impossible de trouver une formation", "warning");
  }
}
window.triggerBestFormationAuto = triggerBestFormationAuto;

function renderBestXI() {
  const box = $('bestxi');
  if (!box) return;

  if (state.bestXiFormation === 'custom') { renderInteractiveMap(); return; }

  const myClub = (state.meta.myClub || '').toLowerCase();
  let html = `<div class="an-head" style="display:flex; justify-content:space-between; align-items:center; padding: 15px 20px; flex-wrap: wrap; gap: 10px;">
    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <h2 style="margin:0;">Meilleur XI & Banc (Doublures)</h2>
        <button onclick="openMercatoModal()" style="padding: 5px 12px; background: #059669; color: #fff; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 12px;">📊 Rapport Mercato</button>
        <button onclick="triggerBestFormationAuto()" style="padding: 5px 12px; background: #d97706; color: #fff; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 12px;">⚡ Trouver la meilleure compo</button>
        <button onclick="state.bestXiFormation = 'custom'; renderBestXI();" style="padding: 5px 12px; background: #7c3aed; color: #fff; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 12px;">✏️ Modifier la tactique</button>
    </div>
    <select id="xi-formation" onchange="handleFormationChange()" style="padding: 5px 10px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 5px; font-weight: bold; cursor: pointer;">
        ${Object.keys(XI_FORMATIONS).filter(f => f !== 'custom_active').map(f => `<option value="${f}" ${state.bestXiFormation === f ? 'selected' : ''}>${f}</option>`).join('')}
        <option value="custom" ${state.bestXiFormation === 'custom' || state.bestXiFormation === 'custom_active' ? 'selected' : ''}>⚙️ Tactique Personnalisée (Interactive)</option>
    </select>
  </div>`;

  if (!myClub) {
    box.innerHTML = html + `<div class="an-empty" style="text-align:center; padding: 20px;">Aucun club détecté. Sélectionnez une équipe via les filtres (Mijn club).</div>`;
    return;
  }

  const squad = state.players.filter(p => (p.club || '').toLowerCase() === myClub);
  const formation = state.bestXiFormation === 'custom_active' ? XI_FORMATIONS['custom_active'] : XI_FORMATIONS[state.bestXiFormation];
  if (!formation) return;

  const result = findOptimalLineup(squad, formation);
  let benchResult = null;
  if (result && result.lineup) {
    const titularIds = new Set(result.lineup.map(slot => slot.player ? slot.player.id : null).filter(Boolean));
    const remainingSquad = squad.filter(p => !titularIds.has(p.id));
    benchResult = findOptimalLineup(remainingSquad, formation);
  }

  let layoutHtml = `<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; align-items: flex-start; padding: 20px;">`;
  let pitchHtml = `<div id="xi-pitch-container" style="position:relative; width:100%; max-width:600px; height:720px; background-color:#12301c; border-radius:12px; border:2px solid #2a3441; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); flex-shrink: 0;">
      <div style="position:absolute; top:50%; left:0; right:0; height:2px; background:#2a4a34;"></div>
      <div style="position:absolute; top:50%; left:50%; width:140px; height:140px; border:2px solid #2a4a34; border-radius:50%; transform:translate(-50%, -50%);"></div>
      <div style="position:absolute; top:0; left:30%; width:40%; height:16%; border:2px solid #2a4a34; border-top:none;"></div>
      <div style="position:absolute; bottom:0; left:30%; width:40%; height:16%; border:2px solid #2a4a34; border-bottom:none;"></div>`;

  if (result && result.lineup) {
    result.lineup.forEach(slot => {
      let score = slot.score > 0 ? slot.score.toFixed(1) : '–';
      let name = slot.player ? slot.player.name : 'Aucun joueur';
      let cls = slot.score > 0 ? roleClass(slot.score) : '';
      pitchHtml += `<div style="position:absolute; top:${slot.t}%; left:${slot.l}%; transform:translate(-50%, -50%); text-align:center; color:white; z-index:10; cursor:pointer;" ${slot.player ? `onclick="showDetail(state.players.find(p=>p.id===${slot.player.id}))"` : ''}>
         <div class="v ${cls}" style="width:38px; height:38px; line-height:38px; border-radius:50%; margin:0 auto; font-weight:bold; background:#1e293b; border:2px solid rgba(255,255,255,0.2); font-size:13px;">${score}</div>
         <div style="font-size:11px; font-weight:bold; background:rgba(15,23,42,0.95); padding:3px 6px; border-radius:4px; margin-top:4px; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${name}</div>
         <div style="font-size:9px; color:#cbd5e1; margin-top:1px; font-weight:bold;">${roleName(slot.role)}</div>
      </div>`;
    });
  }
  pitchHtml += `</div>`;

  let benchHtml = `<div style="width: 100%; max-width: 320px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; display: flex; flex-direction: column; height: 720px; overflow: hidden; flex-shrink: 0;">
    <div style="padding: 12px 15px; background: #0f172a; border-bottom: 1px solid #334155; font-weight: bold; color: #fbbf24; font-size: 13px;">
        <span>🪑 Mon Banc (Doublures)</span>
    </div>
    <div style="padding: 12px; overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column; gap: 8px;">`;

  if (benchResult && benchResult.lineup) {
    let sortedBench = [...benchResult.lineup];
    sortedBench.sort((a, b) => (Math.abs(a.t - b.t) > 3) ? a.t - b.t : a.l - b.l);

    sortedBench.forEach(slot => {
      let rName = roleName(slot.role).toUpperCase();
      let sideText = slot.l < 30 ? ' (Gauche)' : slot.l > 70 ? ' (Droit)' : '';
      let formatRoleLabel = rName + sideText;
      let playerName = slot.player ? slot.player.name : 'Poste vacant';
      let scoreVal = slot.score > 0 ? slot.score.toFixed(1) : '–';
      let cls = slot.score > 0 ? roleClass(slot.score) : '';

      benchHtml += `<div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; ${!slot.player ? 'opacity: 0.5;' : ''}">
          <div>
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">${formatRoleLabel}</div>
              <div style="font-size: 12px; font-weight: bold; color: #fff; margin-top: 1px; cursor: pointer; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" ${slot.player ? `onclick="showDetail(state.players.find(p=>p.id===${slot.player.id}))"` : ''}>${playerName}</div>
          </div>
          <div class="v ${cls}" style="width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; font-weight: bold; font-size: 11px; background: #1e293b; border: 1px solid rgba(255,255,255,0.2);">${scoreVal}</div>
      </div>`;
    });
  }
  benchHtml += `</div></div>`;
  layoutHtml += pitchHtml + benchHtml + `</div>`;

  let scoreFooter = result && result.score ? `<div style="text-align:center; color:#94a3b8; font-size:15px; margin-top:10px; font-weight:bold;">Score moyen Meta du XI : <strong style="color:#34d399; font-size:17px;">${(result.score / 11).toFixed(2)}</strong></div>` : '';
  box.innerHTML = html + layoutHtml + scoreFooter;
}

let customSelectedSlots = [];
const INTERACTIVE_MAP = [
    { id: 'fw_C', role: 'af', line: 'fw', side: 'C', label: 'BT' },
    { id: 'fw_CL', role: 'af', line: 'fw', side: 'CL', label: 'BT (G)' },
    { id: 'fw_CR', role: 'af', line: 'fw', side: 'CR', label: 'BT (D)' },
    { id: 'am_L', role: 'wing', line: 'am', side: 'L', label: 'MO (G)' },
    { id: 'am_CL', role: 'am', line: 'am', side: 'CL', label: 'MO (CG)' },
    { id: 'am_C', role: 'am', line: 'am', side: 'C', label: 'MO (C)' },
    { id: 'am_CR', role: 'am', line: 'am', side: 'CR', label: 'MO (CD)' },
    { id: 'am_R', role: 'wing', line: 'am', side: 'R', label: 'MO (D)' },
    { id: 'cm_L', role: 'wing', line: 'cm', side: 'L', label: 'M (G)' },
    { id: 'cm_CL', role: 'cm', line: 'cm', side: 'CL', label: 'MC (G)' },
    { id: 'cm_C', role: 'cm', line: 'cm', side: 'C', label: 'MC (C)' },
    { id: 'cm_CR', role: 'cm', line: 'cm', side: 'CR', label: 'MC (D)' },
    { id: 'cm_R', role: 'wing', line: 'cm', side: 'R', label: 'M (D)' },
    { id: 'dm_L', role: 'wb', line: 'dm', side: 'L', label: 'WB (G)' },
    { id: 'dm_CL', role: 'dm', line: 'dm', side: 'CL', label: 'MD (G)' },
    { id: 'dm_C', role: 'dm', line: 'dm', side: 'C', label: 'MD' },
    { id: 'dm_CR', role: 'dm', line: 'dm', side: 'CR', label: 'MD (D)' },
    { id: 'dm_R', role: 'wb', line: 'dm', side: 'R', label: 'WB (D)' },
    { id: 'df_L', role: 'fb', line: 'df', side: 'L', label: 'DL' },
    { id: 'df_CL', role: 'cd', line: 'df', side: 'CL', label: 'DC (G)' },
    { id: 'df_C', role: 'cd', line: 'df', side: 'C', label: 'DC (C)' },
    { id: 'df_CR', role: 'cd', line: 'df', side: 'CR', label: 'DC (D)' },
    { id: 'df_R', role: 'fb', line: 'df', side: 'R', label: 'DR' },
    { id: 'gk_C', role: 'gk', line: 'gk', side: 'C', label: 'GB' }
];

function handleFormationChange() {
  const select = document.getElementById('xi-formation');
  if (!select) return;
  if (select.value === 'custom') {
    state.bestXiFormation = 'custom';
    if (customSelectedSlots.length === 0) {
      customSelectedSlots = JSON.parse(JSON.stringify(XI_FORMATIONS['4-3-3']));
    }
    renderInteractiveMap();
  } else {
    state.bestXiFormation = select.value;
    renderBestXI();
  }
}

function renderInteractiveMap() {
  const box = $('bestxi');
  if (!box) return;
  const lineHeights = { 'fw': 12, 'am': 28, 'cm': 44, 'dm': 60, 'df': 76, 'gk': 91 };
  const sideWidths = { 'L': 12, 'CL': 31, 'C': 50, 'CR': 69, 'R': 88 };
  const isReady = customSelectedSlots.length === 11;

  let html = `<div class="an-head" style="display:flex; justify-content:space-between; align-items:center; padding: 15px 20px;">
      <h2>Tactique Personnalisée (${customSelectedSlots.length}/11 postes)</h2>
      <div style="display: flex; gap: 10px;">
          <select id="xi-formation" onchange="handleFormationChange()" style="padding: 5px 10px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 5px; font-weight: bold; cursor: pointer;">
              ${Object.keys(XI_FORMATIONS).map(f => `<option value="${f}">${f}</option>`).join('')}
              <option value="custom" selected>⚙️ Tactique Personnalisée (Interactive)</option>
          </select>
          <button onclick="confirmCustomTactics()" ${!isReady ? 'disabled' : ''} style="padding: 6px 14px; background: ${isReady ? '#8b5cf6' : '#334155'}; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: ${isReady ? 'pointer' : 'not-allowed'}; font-size: 12px;">Confirmer la compo</button>
      </div>
  </div>`;

  let pitchHtml = `<div style="position:relative; width:100%; max-width:700px; height:780px; background-color:#12301c; margin:20px auto; border-radius:12px; border:2px solid #2a3441; overflow:hidden;">`;
  INTERACTIVE_MAP.forEach(slot => {
      const topPct = lineHeights[slot.line];
      const leftPct = sideWidths[slot.side] || 50;
      const isActivated = customSelectedSlots.some(s => s.line === slot.line && s.side === slot.side && s.role === slot.role);
      const btnStyle = isActivated ? "background: #8b5cf6; color: #fff; border: 2px solid #c4b5fd;" : "background: rgba(15,23,42,0.6); color: #94a3b8; border: 2px dashed #475569;";
      pitchHtml += `<button onclick="toggleCustomSlot('${slot.line}', '${slot.side}', '${slot.role}')" style="position:absolute; top:${topPct}%; left:${leftPct}%; transform:translate(-50%, -50%); width:52px; height:42px; border-radius:8px; font-weight:bold; font-size:9px; cursor:pointer; z-index:20; ${btnStyle}">${slot.label}</button>`;
  });
  pitchHtml += `</div>`;
  box.innerHTML = html + pitchHtml;
}

function toggleCustomSlot(line, side, role) {
  const index = customSelectedSlots.findIndex(s => s.line === line && s.side === side);
  if (index !== -1) { customSelectedSlots.splice(index, 1); }
  else {
    if (customSelectedSlots.length >= 11) { alert("Maximum 11 titulaires atteints."); return; }
    customSelectedSlots.push({ role, line, side, t: line === 'fw' ? 15 : line === 'am' ? 30 : line === 'cm' ? 45 : line === 'dm' ? 60 : line === 'df' ? 75 : 90, l: side === 'L' ? 15 : side === 'CL' ? 33 : side === 'C' ? 50 : side === 'CR' ? 67 : 85 });
  }
  renderInteractiveMap();
}

function confirmCustomTactics() {
  if (customSelectedSlots.length !== 11) return;
  XI_FORMATIONS['custom_active'] = customSelectedSlots;
  state.bestXiFormation = 'custom_active';
  renderBestXI();
}

function openMercatoModal() {
  const modal = $('mercatoModal'), content = $('mercatoModalContent');
  if (!modal || !content) return;
  const myClub = (state.meta.myClub || '').toLowerCase();
  if (!myClub || !state.players.length) {
    content.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">Aucun club détecté ou base vide.</div>`;
    modal.classList.remove('hidden'); modal.style.display = 'flex'; return;
  }

  const squad = state.players.filter(p => (p.club || '').toLowerCase() === myClub);
  const formationKey = state.bestXiFormation || '4-3-3';
  const formation = XI_FORMATIONS[formationKey];
  if (!formation) return;

  const optimalLineup = findOptimalLineup(squad, formation);
  if (!optimalLineup || !optimalLineup.lineup) return;

  const minInterest = parseInt(document.getElementById('mercato-filter-interest')?.value) || 0;
  const maxPrice = parseMoney(document.getElementById('mercato-filter-price')?.value);
  const onlyAttainable = document.getElementById('mercato-filter-attainable')?.checked || false;
  const minQp = parseFloat(document.getElementById('mercato-filter-qp')?.value) || 0;

  let suggestions = [];
  formation.forEach((slot, idx) => {
    let currentSlot = optimalLineup.lineup[idx];
    let currentScore = currentSlot && currentSlot.player ? metaScore(currentSlot.player) || 0 : 0;
    let currentName = currentSlot && currentSlot.player ? currentSlot.player.name : "Aucun";
    let targets = [];

    state.players.forEach(dbPlayer => {
      if ((dbPlayer.club || '').toLowerCase() === myClub || mercatoDismissed.has(dbPlayer.id)) return;
      if (!canPlaySlot(dbPlayer, slot)) return;
      let dbScore = metaScore(dbPlayer);
      if (dbScore == null) return;
      let improvement = dbScore - currentScore;
      if (improvement <= 0.2) return;

      const iObj = interestEstimate(dbPlayer);
      if (minInterest > 0 && (iObj ? iObj.score : 0) < minInterest) return;

      const estFee = feeEstimate(dbPlayer).v ?? estValue(dbPlayer).v ?? Infinity;
      if (maxPrice != null && estFee > maxPrice) return;
      if (onlyAttainable && !isAttainable(dbPlayer)) return;

      const feeMillions = estFee === 0 ? 0 : (estFee / 1e6);
      const qpRatio = feeMillions > 0 ? (dbScore / feeMillions) : (feeMillions === 0 ? Infinity : 0);
      if (minQp > 0 && qpRatio < minQp) return;

      targets.push({ player: dbPlayer, dbScore, improvement });
    });

    targets.sort((a, b) => b.improvement - a.improvement);
    if (targets.length > 0) {
      suggestions.push({ role: `${slot.role.toUpperCase()} (${slot.side})`, currentName, currentScore, targets: targets.slice(0, 3) });
    }
  });

  let html = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="color: #fff; margin: 0;">🎯 Rapport Mercato & Cibles Prioritaires</h3>
      ${mercatoDismissed.size > 0 ? `<button onclick="resetMercatoDismissed()" style="background: #334155; color: #cbd5e1; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer;">🔄 Réinitialiser les cibles rejetées (${mercatoDismissed.size})</button>` : ''}
  </div>`;

  if (suggestions.length === 0) {
    html += `<div style="text-align: center; color: #94a3b8; padding: 40px;">Aucune cible ne correspond à vos filtres.</div>`;
  } else {
    html += suggestions.map(group => `
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 14px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 10px;">
          <span style="color: #34d399; font-weight: bold;">Poste : ${group.role}</span>
          <span style="font-size: 12px; color: #94a3b8;">Titulaire : <b style="color: #fff;">${group.currentName}</b> (${group.currentScore.toFixed(1)})</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;">
          ${group.targets.map(t => {
            const p = t.player, iObj = interestEstimate(p), feeObj = feeEstimate(p);
            const feeVal = feeObj.v ?? estValue(p).v ?? 0;
            const qpVal = (feeVal / 1e6) > 0 ? (t.dbScore / (feeVal / 1e6)).toFixed(2) : 'Max';
            return `<div style="position: relative; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px;">
              <button onclick="dismissMercatoTarget(${p.id})" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: #94a3b8; cursor: pointer;">✕</button>
              <div style="font-weight: bold; color: #fff; cursor: pointer;" onclick="showDetail(state.players.find(x=>x.id===${p.id}))">${p.name}</div>
              <div style="font-size: 12px; color: #94a3b8;">${p.club || 'Libre'} • ${getAge(p) || '?'} ans</div>
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">
                <div>Prix : <b style="color: #fff;">${fmtMoney(feeVal)}</b> | Q/P : <b style="color: #34d399;">${qpVal}</b></div>
                <div>Intérêt : <b style="color: #38bdf8;">${iObj ? iObj.score : '?'}/100</b></div>
              </div>
              <div style="margin-top: 10px; display: flex; justify-content: space-between; font-size: 12px;">
                <span>Meta : <b>${t.dbScore.toFixed(1)}</b></span>
                <span style="color: #34d399; font-weight: bold;">+${t.improvement.toFixed(1)} pts</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');
  }
  content.innerHTML = html;
  modal.classList.remove('hidden'); modal.style.display = 'flex';
}

function closeMercatoModal() {
  const modal = $('mercatoModal');
  if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function dismissMercatoTarget(playerId) {
  mercatoDismissed.add(playerId);
  openMercatoModal();
}

function resetMercatoDismissed() {
  mercatoDismissed.clear();
  openMercatoModal();
  showToast("Cibles réinitialisées avec succès", "check");
}

let clubsSearchTerm = '';
function analyzeClubsAndDivisions() {
  const clubMap = new Map(), divMap = new Map();
  state.players.forEach(p => {
    if (p.teamType != null && p.teamType !== 0) return;
    const clubName = p.club || 'Libre / Sans club', divName = p.div || 'Inconnue';
    const meta = metaScore(p) || 0, paMeta = metaPaScore(p) || meta, age = getAge(p) || 0, val = p.value || 0, wage = p.wage || 0;

    if (!clubMap.has(clubName)) clubMap.set(clubName, { name: clubName, div: divName, players: [], totalVal: 0, totalWage: 0 });
    const cData = clubMap.get(clubName);
    cData.players.push({ player: p, meta, paMeta, age, val, wage });
    cData.totalVal += val; cData.totalWage += wage;

    if (!divMap.has(divName)) divMap.set(divName, { name: divName, count: 0, totalMeta: 0, totalPaMeta: 0, totalVal: 0 });
    const dData = divMap.get(divName);
    dData.count++; dData.totalMeta += meta; dData.totalPaMeta += paMeta; dData.totalVal += val;
  });

  const clubs = [...clubMap.values()].filter(c => c.players.length >= 10).map(c => {
    c.players.sort((a, b) => b.meta - a.meta);
    const topPlayers = c.players.slice(0, 20), n = topPlayers.length;
    let totalMeta = 0, totalPaMeta = 0, totalAge = 0;
    topPlayers.forEach(tp => { totalMeta += tp.meta; totalPaMeta += tp.paMeta; totalAge += tp.age; });
    return { name: c.name, div: c.div, count: c.players.length, avgMeta: n ? totalMeta / n : 0, avgPaMeta: n ? totalPaMeta / n : 0, avgAge: n ? totalAge / n : 0, totalVal: c.totalVal, totalWage: c.totalWage, topPlayer: c.players[0] ? c.players[0].player : null };
  }).sort((a, b) => b.avgMeta - a.avgMeta);

  const divisions = [...divMap.values()].filter(d => d.name !== 'Inconnue' && d.count >= 200).map(d => ({
    name: d.name, count: d.count, avgMeta: d.count ? d.totalMeta / d.count : 0, avgPaMeta: d.count ? d.totalPaMeta / d.count : 0, totalVal: d.totalVal
  })).sort((a, b) => b.avgMeta - a.avgMeta);

  return { clubs, divisions };
}

function renderClubsView() {
  const box = $('clubs-view');
  if (!box) return;
  const { clubs, divisions } = analyzeClubsAndDivisions();
  const query = (clubsSearchTerm || '').toLowerCase();
  const filteredClubs = clubs.filter(c => c.name.toLowerCase().includes(query) || c.div.toLowerCase().includes(query));

  const clubsByDiv = new Map();
  filteredClubs.forEach(c => {
    if (!clubsByDiv.has(c.div)) clubsByDiv.set(c.div, []);
    clubsByDiv.get(c.div).push(c);
  });

  let html = `<div style="padding: 20px; max-width: 1400px; margin: 0 auto;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>📊 Analyse globale des Clubs & Divisions</h2>
      <input type="text" id="clubs-search-input" value="${escHtml(clubsSearchTerm)}" placeholder="Rechercher..." oninput="onClubsSearchInput(this)" style="padding: 8px 14px; background: #1e293b; color: #fff; border: 1px solid #334155; border-radius: 6px;">
    </div>`;

  if (clubsByDiv.size === 0) {
    box.innerHTML = html + `<div style="text-align: center; color: #94a3b8; padding: 40px;">Aucun club trouvé.</div></div>`;
    return;
  }

  divisions.forEach(div => {
    const divClubs = clubsByDiv.get(div.name);
    if (!divClubs || divClubs.length === 0) return;
    html += `<div style="margin-bottom: 30px;">
      <div style="background: #0f172a; border: 1px solid #334155; padding: 12px 16px; display: flex; justify-content: space-between;">
        <span style="font-weight: bold; color: #38bdf8;">🏆 ${escHtml(div.name)}</span>
        <div style="display: flex; gap: 20px; font-size: 12px; color: #94a3b8;">
          <span>Clubs : <b style="color:#fff;">${divClubs.length}</b></span>
          <span>Meta Moy : <b style="color: #34d399;">${div.avgMeta.toFixed(1)}</b></span>
          <span>PA Meta Moy : <b style="color: #38bdf8;">${div.avgPaMeta.toFixed(1)}</b></span>
        </div>
      </div>
      <div style="background: #1e293b; border: 1px solid #334155; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
          <thead>
            <tr style="color: #64748b; border-bottom: 1px solid #334155; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 8px 14px;">Club</th>
              <th style="padding: 8px 14px; text-align: center;">Effectif Pro</th>
              <th style="padding: 8px 14px; text-align: center;">Moy. Âge</th>
              <th style="padding: 8px 14px; text-align: center;">Meta Moyen (Top 20)</th>
              <th style="padding: 8px 14px; text-align: center;">PA Meta Moyen</th>
              <th style="padding: 8px 14px;">Top Player</th>
              <th style="padding: 8px 14px; text-align: right;">Valeur Totale</th>
            </tr>
          </thead>
          <tbody>`;
    divClubs.forEach((c, idx) => {
      const topPlayerName = c.topPlayer ? c.topPlayer.name : '–';
      const topPlayerId = c.topPlayer ? c.topPlayer.id : null;

      html += `<tr style="border-bottom: 1px solid rgba(51,65,85,0.4); ${idx % 2 === 0 ? 'background: rgba(30,41,59,0.3);' : ''}">
        <td style="padding: 10px 14px; font-weight: bold; color: #fff;">${escHtml(c.name)}</td>
        <td style="padding: 10px 14px; text-align: center; color: #cbd5e1;">${c.count}</td>
        <td style="padding: 10px 14px; text-align: center; color: #cbd5e1;">${c.avgAge ? c.avgAge.toFixed(1) : '–'}</td>
        <td style="padding: 10px 14px; text-align: center;"><b style="color: #34d399;">${c.avgMeta.toFixed(1)}</b></td>
        <td style="padding: 10px 14px; text-align: center;"><b style="color: #38bdf8;">${c.avgPaMeta.toFixed(1)}</b></td>
        <td style="padding: 10px 14px; color: #cbd5e1; cursor: pointer;" ${topPlayerId ? `onclick="showDetail(state.players.find(x=>x.id===${topPlayerId}))"` : ''}>${escHtml(topPlayerName)}</td>
        <td style="padding: 10px 14px; text-align: right; color: #fbbf24; font-weight: 500;">${fmtMoney(c.totalVal)}</td>
      </tr>`;
    });
    html += `</tbody></table></div></div>`;
  });
  box.innerHTML = html + `</div>`;
}

function onClubsSearchInput(input) {
  clubsSearchTerm = input.value;
  renderClubsView();
  const newInput = $('clubs-search-input');
  if (newInput) { newInput.focus(); newInput.setSelectionRange(newInput.value.length, newInput.value.length); }
}

// ---------- squad-behoefteanalyse ----------
// Positiegroepen met een streefaantal (basis + degelijke cover) en de bijhorende pitch-codes.
const SQUAD_GROUPS = [
  { id: 'gk', label: { nl: 'Keeper', en: 'Goalkeeper', fr: 'Gardien', de: 'Torwart' }, pos: ['GK'], target: 2 },
  { id: 'cb', label: { nl: 'Centrale verdediger', en: 'Central defender', fr: 'Défenseur central', de: 'Innenverteidiger' }, pos: ['DC'], target: 4 },
  { id: 'fb', label: { nl: 'Vleugelverdediger', en: 'Full back', fr: 'Arrière latéral', de: 'Außenverteidiger' }, pos: ['DL', 'DR', 'WBL', 'WBR'], target: 4 },
  { id: 'dm', label: { nl: 'Verdedigende mid', en: 'Defensive mid', fr: 'Milieu défensif', de: 'Defensives MF' }, pos: ['DM'], target: 2 },
  { id: 'cm', label: { nl: 'Centrale middenvelder', en: 'Central midfielder', fr: 'Milieu central', de: 'Zentrales MF' }, pos: ['MC'], target: 3 },
  { id: 'wing', label: { nl: 'Buitenspeler', en: 'Winger', fr: 'Ailier', de: 'Flügelspieler' }, pos: ['ML', 'MR', 'AML', 'AMR'], target: 4 },
  { id: 'am', label: { nl: 'Aanvallende mid', en: 'Attacking mid', fr: 'Milieu offensif', de: 'Offensives MF' }, pos: ['AMC'], target: 2 },
  { id: 'st', label: { nl: 'Spits', en: 'Striker', fr: 'Attaquant', de: 'Stürmer' }, pos: ['ST'], target: 3 },
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
    const youngTalents = members.filter(p => { const a = getAge(p); return a > 0 && a <= 21 && (p.pa || 0) > 0; }).sort((a, b) => (b.pa || 0) - (a.pa || 0));
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
    <div class="an-sum-item need"><span class="an-sum-l">${t('anBiggestNeed')}</span><span class="an-sum-need">${topNeed ? topNeed.g.label[state.lang] || topNeed.g.label.en : '–'}</span></div>
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
      <div class="an-card-top"><span class="an-pos">${x.g.label[state.lang] || x.g.label.en}</span>${badge}</div>
      <div class="an-depth" data-tip="${x.count}/${x.g.target}">${depthDots}</div>
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
$('detail-close').onclick = closeDetail;
$('detail-backdrop').onclick = closeDetail;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

// ---------- UI-bediening ----------
['f-name', 'f-age-min', 'f-age-max', 'f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-meta-min', 'f-meta-max', 'f-metapa-min', 'f-metapa-max', 'f-growth-min', 'f-growth-max', 'f-height-min', 'f-height-max', 'f-price', 'f-fee', 'f-wage', 'f-nat'].forEach(id => {
  let tm; $(id).addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(applyFilters, 150); });
});
['f-eu', 'f-myclub', 'f-tstatus', 'f-contract', 'f-shortlist', 'f-wonderkid', 'f-foot', 'f-new'].forEach(id => $(id).addEventListener('change', applyFilters));
$('f-hist-period').addEventListener('change', async () => {
  await setHistPeriod($('f-hist-period').value);
  renderTable();     // groeikolom leest andere peildata
  applyFilters();
});
$('btn-adv').onclick = advDialog;
$('f-staffrole').addEventListener('change', applyFilters);
$('f-gender').addEventListener('change', applyFilters);
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
  $('f-staffrole').value = ''; $('f-gender').value = ''; $('f-interest').value = '0'; $('f-contract').value = ''; $('f-tstatus').value = '';
  $('f-foot').value = '';
  state.advF = []; state.advStaffF = []; saveAdv();
  activePos.clear();
  document.querySelectorAll('.pos-node').forEach(n => n.classList.remove('on'));
  state.myTeam = 'all'; renderMyTeamChips();   // subteamchip (Eerste/Jeugd) hoort ook bij "wissen"
  state.presetSel = null; renderPresets();   // dropdown-label terug naar de placeholder
  applyFilters();
};
$('btn-sidebar').onclick = () => document.body.classList.toggle('sidebar-collapsed');
$('btn-export').onclick = exportShortlist;
$('btn-coffee').onclick = openKofi;
$('btn-report').onclick = reportBug;
$('es-report').onclick = reportBug;
// Handmatige update-check in Instellingen, naast de stille 20-uurs autocheck.
// Resultaat verschijnt als notitie onder de knop; een gevonden update toont
// bovendien het gewone update-pilletje in de topbar (zelfde vervolgflow).
$('btn-updcheck').onclick = async () => {
  const btn = $('btn-updcheck'), note = $('upd-note');
  btn.disabled = true;
  note.textContent = t('updChecking');
  try {
    const r = await checkUpdate(true);
    note.textContent = r && r.newer ? tf('updFound', { v: r.tag }) : tf('updNone', { v: APP_VERSION });
  } catch (e) {
    console.error('update-check:', e);
    note.textContent = t('updCheckErr');
  }
  btn.disabled = false;
};
checkUpdate();

// Ko-fi-glow: het koffie-icoon pulseert even zacht op het moment dat de tool je net iets
// heeft opgeleverd (spelerskaart opgeslagen, shortlist geexporteerd). Hooguit één keer per
// dag, 12 seconden, daarna vanzelf stil. Klikken op het icoon opent Ko-fi en dooft hem.
//
// De vorige versie hing aan een willekeurige timer 20-90 s na het opstarten en ging uit na
// vier klikken ergens in de app. In een tool waarin je constant sorteert en profielen opent
// haal je die vier binnen enkele seconden, precies in dat tijdvak: de gloed was daardoor in
// de praktijk nooit langer dan een moment zichtbaar (26-07 nagemeten).
function coffeeGlow() {
  if (kofiOff()) return;   // "vraag het niet meer" geldt ook voor de gloed
  const last = +localStorage.getItem('fmss_glow_at') || 0;
  if (Date.now() - last < 24 * 3600e3) return;
  // Nooit twee vragen tegelijk: staat het seizoensrapport open, dan blijft het icoon stil.
  const dn = $('donate-nudge');
  if (dn && !dn.classList.contains('hidden')) return;
  localStorage.setItem('fmss_glow_at', String(Date.now()));
  const btn = $('btn-coffee');
  if (!btn) return;
  btn.classList.add('glow');
  const stop = () => { btn.classList.remove('glow'); btn.removeEventListener('click', stop); };
  btn.addEventListener('click', stop);
  setTimeout(stop, 12e3);
}
// Supporter-staat (goudkleurig icoon) overleeft herstarts.
if (localStorage.getItem('fmss_supporter') === '1') $('btn-coffee').classList.add('supporter');
checkSetupState();

// inklapbare filtersecties (voorkeur onthouden)
// Eerste gebruik (geen opgeslagen stand): secundaire secties dicht zodat de zijbalk op
// één scherm past (progressive disclosure). Eigen klikgedrag wordt daarna onthouden.
const rawSecs = localStorage.getItem('fmss_secs');
const collapsedSecs = new Set(rawSecs ? JSON.parse(rawSecs) : ['presets', 'role', 'development', 'physical', 'financial', 'origin', 'availability']);
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
// Database-keuze (mannen/vrouwen/beide): leeft server-side (scan-config.json) zodat de
// plugin hem bij F9 leest; localStorage zou de game nooit bereiken.
fetch('/api/scan-config').then(r => r.json()).then(c => { $('sel-db').value = c.db || 'men'; }).catch(() => { });
$('sel-db').addEventListener('change', () => {
  fetch('/api/scan-config', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ db: $('sel-db').value }),
  }).then(() => showToast(t('womenNote'), 'check')).catch(() => { });
});
// salarisperiode-dropdown
$('sel-wageper').value = state.wagePer;
$('sel-wageper').addEventListener('change', () => {
  state.wagePer = $('sel-wageper').value;
  localStorage.setItem('fmss_wageper', state.wagePer);
  applyLang();   // kolomkop, filterlabel, profiel en tabel volgen de nieuwe periode
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
  document.body.classList.toggle('hide-meta', state.hideMeta);
  // Verborgen filters leegmaken zodat ze niet stiekem blijven filteren. CA/PA/vraagprijs
  // vallen onder de hidden-stats-toggle; meta onder zijn eigen toggle.
  if (state.hideCapa) ['f-ca-min', 'f-ca-max', 'f-pa-min', 'f-pa-max', 'f-fee', 'f-growth-min', 'f-growth-max', 'f-metapa-min', 'f-metapa-max'].forEach(id => { const e = $(id); if (e) e.value = ''; });
  if (state.hideCapa) { const n = $('f-new'); if (n) n.checked = false; }   // groei-afgeleid
  if (state.hideMeta) ['f-meta-min', 'f-meta-max', 'f-metapa-min', 'f-metapa-max'].forEach(id => { const e = $(id); if (e) e.value = ''; });
  if (hiddenStatCol(state.sortKey)) { state.sortKey = state.mode === 'staff' ? 'wage' : 'value'; state.sortDir = -1; }
  updateAdvBtn();   // regels op verborgen data tellen niet mee zolang de toggle uit staat
  renderDevSection(); renderIntakeBar();
  if (state.mode === 'analysis') renderAnalysis(); else { renderTable(); applyFilters(); }
  if (state.selected) showDetail(state.selected);
}
$('set-profile').value = profMode();
$('set-profile').addEventListener('change', () => {
  localStorage.setItem('fmss_profmode', $('set-profile').value);
  if (state.selected) showDetail(state.selected);   // open profiel meteen omzetten
});
$('set-hidemeta').checked = !state.hideMeta;   // "tonen" = niet verbergen (standaard aan)
$('set-hidemeta').addEventListener('change', () => {
  state.hideMeta = !$('set-hidemeta').checked;
  localStorage.setItem('fmss_hidemeta', state.hideMeta ? '1' : '0');
  applyHideCapa();   // deelt de her-render (kolommen, filters, profiel, analyse)
});
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
let fetchTimeout = null;
// Loopt er een "Nieuwe data"-verzoek? Baseline = dumpTime op het moment van de klik, zodat
// poll() een verse dump ook herkent als er nog nooit een dump was (eerste keer na installatie)
// of als de scan zo snel klaar is dat de 'scanning'-status tussen twee polls valt.
let fetchPending = false, fetchBaseDumpTime = null;
$('btn-fetch').onclick = async () => {
  const b = $('banner');
  try {
    const st = await (await fetch('/api/fmstatus')).json();
    if (!st.running) { b.className = 'scanning error'; b.innerHTML = bannerMsg('warning', t('fmNotRunning')); b.onclick = null; return; }
    await fetch('/api/refresh', { method: 'POST' });
    fetchPending = true; fetchBaseDumpTime = lastDumpTime;
    b.className = 'scanning'; b.innerHTML = bannerMsg('hourglass', t('reqSent')); b.onclick = null;
    // Vangnet: pikt de plugin het verzoek niet op (state wordt nooit 'scanning'), dan
    // een duidelijke hint i.p.v. een eeuwige zandloper. poll() annuleert deze time-out
    // zodra de scan echt start.
    clearTimeout(fetchTimeout);
    fetchTimeout = setTimeout(async () => {
      try {
        const s2 = await (await fetch('/api/status')).json();
        if (s2.plugin && s2.plugin.state === 'scanning') return;   // toch nog gestart
        if (s2.dumpTime && s2.dumpTime !== fetchBaseDumpTime) return;   // dump kwam er wél (snelle scan)
        fetchPending = false;
        b.className = 'scanning error';
        // Structureel niet opgepikt = vrijwel altijd de FM-zelfherstart die de mod-laag
        // eruit gooit (TROUBLESHOOTING.md 4d) → link direct naar de fix.
        b.innerHTML = bannerMsg('warning', t('reqNoPickup')) +
          ` <a href="https://github.com/mavarobli/FMSuperScout/blob/main/TROUBLESHOOTING.md#4d-fm26-is-not-picking-up-the-request-on-every-single-attempt" target="_blank" rel="noopener">${escHtml(t('reqNoPickupMore'))}</a>`;
        b.onclick = () => { b.className = 'hidden'; };
      } catch { }
    }, 15000);
  } catch (e) {
    // Meestal: de lokale server is weg (achtergrondvenster → server afgesloten). Toon dat
    // duidelijk i.p.v. een raadselachtig "!"; herstart via het venster opnieuw openen.
    console.error('Nieuwe data:', e);
    b.className = 'scanning error';
    b.innerHTML = bannerMsg('warning', t('serverGone'));
    b.onclick = () => { b.className = 'hidden'; };
  }
};

function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('[data-i18n-html]').forEach(el => el.innerHTML = t(el.dataset.i18nHtml));
  // ?-helpteksten tonen via de eigen app-tooltip (zie initHelpTip), niet meer via title.
  $('f-name').placeholder = t('searchph');
  $('btn-coffee').title = t('donateBtn');
  // Max. loon-label draagt de gekozen salarisperiode (de generieke data-i18n-pass hierboven
  // zette alleen de kale tekst).
  const mw = document.querySelector('[data-i18n="maxwage"]');
  if (mw) mw.textContent = t('maxwage') + ' ' + wageSuf();
  $('set-version').textContent = 'FMSuperScout v' + APP_VERSION;
  $('upd-note').textContent = '';   // checkresultaat is een momentopname in de oude taal
  updateAdvBtn();
  renderDumpInfo();
  renderClubBadge();
  renderVerWarn();
  buildStaffRoles();
  buildGenderFilter();
  buildFootOptions();
  buildRoleSelect();
  buildDivisions();
  renderDevSection();
  renderIntakeBar();
  renderPresets();
  renderTable();   // kolomkoppen zijn vertaald → header opnieuw opbouwen
  applyFilters();
  if (state.selected) showDetail(state.selected);
}

function setMode(mode) {
  state.mode = mode;
  const isAn = mode === 'analysis';
  const isXi = mode === 'bestxi';
  const isClubs = mode === 'clubs';
  const isCustomView = isAn || isXi || isClubs;

  $('tab-players').classList.toggle('active', mode === 'players');
  $('tab-staff').classList.toggle('active', mode === 'staff');
  $('tab-shortlist').classList.toggle('active', mode === 'shortlist');
  $('tab-analysis').classList.toggle('active', isAn);
  if ($('tab-bestxi')) $('tab-bestxi').classList.toggle('active', isXi);
  if ($('tab-clubs')) $('tab-clubs').classList.toggle('active', isClubs);

  $('fg-pitch').style.display = mode === 'staff' || isCustomView ? 'none' : '';
  $('fg-staffrole').style.display = mode === 'staff' ? '' : 'none';
  buildGenderFilter();
  $('fg-role').style.display = mode === 'staff' || isCustomView ? 'none' : '';
  $('f-meta-row').style.display = mode === 'staff' ? 'none' : '';
  $('f-metapa-row').style.display = mode === 'staff' ? 'none' : '';
  $('fg-physical').style.display = mode === 'staff' ? 'none' : '';
  $('f-wonderkid-row').style.display = mode === 'staff' ? 'none' : '';
  renderDevSection();
  const isStaff = mode === 'staff';
  $('fg-pitch').style.display = isStaff || isAn ? 'none' : '';
  $('fg-staffrole').style.display = isStaff ? '' : 'none';
  buildGenderFilter();   // spelers- en staflijst kunnen apart gemengd zijn
  $('fg-role').style.display = isStaff || isAn ? 'none' : '';
  $('f-meta-row').style.display = isStaff ? 'none' : '';   // meta-score bestaat niet voor staf
  $('f-metapa-row').style.display = isStaff ? 'none' : '';
  // Staf heeft geen lengte, voet, PA-groei of speler-transferopties; die filters horen daar niet.
  $('fg-physical').style.display = isStaff ? 'none' : '';
  $('f-wonderkid-row').style.display = isStaff ? 'none' : '';
  $('f-price-row').style.display = isStaff ? 'none' : '';
  $('f-fee-row').style.display = isStaff ? 'none' : '';
  $('f-interest-row').style.display = isStaff ? 'none' : '';
  $('f-tstatus-row').style.display = isStaff ? 'none' : '';
  renderDevSection();   // historie wordt alleen voor spelers bijgehouden
  renderIntakeBar();

  if (hiddenStatCol(state.sortKey)) { state.sortKey = mode === 'staff' ? 'wage' : 'ca'; state.sortDir = -1; }
  $('sl-bar').classList.toggle('hidden', mode !== 'shortlist');
  renderMyTeamChips();
  document.body.classList.toggle('mode-analysis', isCustomView);
  state.selected = null;
  $('detail').classList.add('hidden');

  const toggleView = (id, show) => {
    const el = $(id);
    if (el) { el.style.display = show ? 'block' : 'none'; el.classList.toggle('hidden', !show); }
  };

  toggleView('table-wrap', !isCustomView);
  toggleView('analysis', isAn);
  toggleView('bestxi', isXi);
  toggleView('clubs-view', isClubs);

  if (isClubs) { $('chipbar').innerHTML = ''; renderClubsView(); return; }
  if (isAn) { $('chipbar').innerHTML = ''; renderAnalysis(); return; }
  if (isXi) { $('chipbar').innerHTML = ''; renderBestXI(); return; }

  $('table-wrap').style.display = '';
  $('analysis').classList.add('hidden');
  if (!activeCols().find(c => c.key === state.sortKey)) { state.sortKey = 'ca'; state.sortDir = -1; }
  renderTable();
  applyFilters();
}

// BINDINGS DES NOUVEAUX ONGLETS
if ($('tab-bestxi')) $('tab-bestxi').onclick = () => setMode('bestxi');
if ($('tab-clubs')) $('tab-clubs').onclick = () => setMode('clubs');
$('tab-players').onclick = () => setMode('players');
$('tab-staff').onclick = () => setMode('staff');
$('tab-shortlist').onclick = () => setMode('shortlist');
$('tab-analysis').onclick = () => setMode('analysis');
// Niet direct koppelen: dan wordt het MouseEvent als force=true doorgegeven en
// omzeilt elke klik de OOM-crashdetectie die loadDump(true) juist als bewuste
// escape-hatch heeft.
$('btn-reload').onclick = () => loadDump();

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
      clearTimeout(fetchTimeout);   // plugin heeft het verzoek opgepikt
      // De plugin ververst status.json tijdens een scan minstens elke ~2s. Staat er
      // "scanning" maar is het bestand 15s+ oud, dan is FM26 mid-scan gestopt/gecrasht:
      // zonder deze check bleef de voortgangsbalk eeuwig staan.
      if (typeof pl.mtime === 'number' && Date.now() - pl.mtime > 15000) {
        b.className = 'scanning error';
        b.innerHTML = bannerMsg('warning', t('scanStalled'));
        b.onclick = () => { b.className = 'hidden'; };
      } else {
        b.className = 'scanning';
        // Plugin v0.1.2+ schrijft echte scanvoortgang (0..1) in status.json; oudere
        // plugins niet — dan de oude tekstbanner zonder balk.
        b.innerHTML = typeof pl.progress === 'number'
          ? bannerProgress('hourglass', t('dumping'), pl.progress)
          : bannerMsg('hourglass', t('dumping'));
      }
    }
    else if (pl && pl.state === 'error') {
      clearTimeout(fetchTimeout); fetchPending = false;   // plugin hééft gereageerd; geen "pikt het niet op" eroverheen
      b.className = 'scanning error';
      b.innerHTML = bannerMsg('warning', t('dumpError') + (pl.error ? ': ' + pl.error : ''));
      b.onclick = null;
    }
    else if (pl && pl.state === 'done') {
      // Nieuwe dump herkennen langs drie routes: (1) dumpTime veranderd t.o.v. een eerder
      // bekende dump, (2) we zagen de scan lopen, (3) een klik op "Nieuwe data" en er ligt
      // een andere dump dan bij die klik — dekt snelle scans die tussen twee polls vallen
      // én de allereerste dump op een verse installatie (lastDumpTime was toen nog null).
      const fresh = (st.dumpTime && st.dumpTime !== lastDumpTime && lastDumpTime !== null)
        || lastPluginState === 'scanning'
        || (fetchPending && st.dumpTime && st.dumpTime !== fetchBaseDumpTime);
      if (fresh) {
        clearTimeout(fetchTimeout); fetchPending = false;
        // Nieuwe dump klaar → automatisch laden; de groene balk is alleen nog een
        // korte bevestiging (verdwijnt vanzelf), geen klik meer nodig.
        loadDump().then(ok => {
          if (!ok) return;   // laadfout: loadDump toont zelf het foutscherm en de foutbanner
          b.className = 'done';
          b.innerHTML = bannerMsg('check', `${t('dumpLoaded')} (${(pl.players ?? 0).toLocaleString()} · ${(pl.staff ?? 0).toLocaleString()})`);
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
    // Achtergrondvensters knijpen timers af, dus klop ook meteen zodra het venster weer
    // zichtbaar of gefocust wordt — dan is de server gegarandeerd vers bij de eerste klik.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
    window.addEventListener('focus', beat);
    window.addEventListener('pagehide', () => { try { navigator.sendBeacon('/api/bye'); } catch {} });
  } catch { /* server weg */ }
}
initHeartbeat();

buildPitch();
applyLang();
document.body.classList.toggle('hide-capa', state.hideCapa);
document.body.classList.toggle('hide-meta', state.hideMeta);
$('sl-count').textContent = state.shortlist.size;
loadDump().then(() => poll());
