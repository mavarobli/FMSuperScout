# Backlog & openstaande punten

Status-overzicht van wat af is, wat open staat, en ideeën. Nog niet gebouwd waar "backlog" staat.

## 1. Volledige standalone installer (.exe) - UITGESTELD tot na goed doortesten

Doel: één `.exe` die je op Reddit deelt; gebruiker dubbelklikt, alles wordt geïnstalleerd
(viewer + plugin + BepInEx), en het draait als een echt Windows-programma. Nu is het een zip
met alleen de viewer; de plugin en BepInEx ontbreken, dus een downloader ziet een lege tool.

**Opties (onderzocht):**
- **Electron + electron-builder → NSIS .exe** (aanbevolen voor snelste "echt programma"-gevoel).
  Levert een echte installer met Start-menu-item, uninstaller en een eigen venster (Chromium
  ingebakken, dus geen afhankelijkheid van Edge). Nadeel: ~90 MB (vergelijkbaar met onze huidige
  zip die node.exe al bundelt). Code blijft JS; onze `app/` gaat vrijwel ongewijzigd mee.
- **Tauri + Node-sidecar → NSIS/MSI**. Veel kleiner (~5-10 MB + gecompileerde node-sidecar),
  gebruikt de systeem-WebView2 (aanwezig op Win11). Nadeel: Rust-toolchain nodig, meer setup.
- **Node SEA + NSIS/Inno**. Compileer `server.js` tot één .exe (Node 24 SEA) en verpak met een
  NSIS/Inno-installer. Houdt de huidige "Edge --app"-aanpak. Vereist makensis/Inno (nu niet
  geïnstalleerd).

**Onderdeel van deze installer:**
- Bij installatie **FM26-map detecteren** (Steam-pad via register: `HKCU/HKLM ... Steam App 2252570`
  of de standaard Steam-library) en **BepInEx + `FMSuperScout.dll`** erin kopiëren (game dicht).
  BepInEx is LGPL, herdistribueerbaar. Risico: pad-/versiedetectie moet op echte machines getest.
- Uninstaller die de viewer verwijdert en de plugin-DLL optioneel uit de FM-map haalt.

**Belangrijk:** de plugin-installatie kan hier niet end-to-end getest worden (geen draaiende FM);
mavarobli moet de eindstroom op zijn eigen game natrekken vóór brede verspreiding.

## 2. In-app data ophalen met FM-detectie - GEDAAN

Server-endpoint `/api/fmstatus` checkt via `tasklist` of `fm.exe` draait. Knop "Nieuwe data"
checkt dit eerst: draait FM niet → rode banner "Start Football Manager 26 eerst" i.p.v. eindeloos
wachten; draait FM wél → `request.flag` schrijven zodat de plugin de dump start. Getest tegen de
echte draaiende game (correcte detectie).

## 3. Data-nauwkeurigheid (plugin) - deels gedaan

- **Persoonlijkheid uitlezen: GEDAAN** - de plugin vult nu Ambitie/Loyaliteit/Professionaliteit
  e.a. (100% in de huidige dump). Meegenomen in het interesse-model (punt 4).
- **Clubnaam-offset - OPEN**: sommige clubs geven wel clubreputatie maar geen naam
  ("onbekende club", bv. Filip Wisłocki / Lech). Indirecte-string-offset nog niet gepind.
  Vereist Marks F9-testloop met `diagnostics.txt`.
- **Divisie/competitie-offset - OPEN**: `div` is overal leeg → echte divisiefilter kan pas als dit
  is uitgelezen. Filter staat klaar en verschijnt automatisch zodra data aanwezig is.

## 4. Interesse-model - GEDAAN (persoonlijkheid meegenomen)

Herbouwd met de nu-beschikbare persoonlijkheid: ambitie stuwt naar een stap omhoog en remt
zijwaarts/omlaag, loyaliteit remt, jonge spelers verhuizen minder makkelijk (leeftijdsdemping),
en voor jonge spelers weegt de clubkloof zwaarder dan de statuskloof. Art.19 (non-EU <18) blijft.
Getest tegen echte data (wie wil wel/niet naar Feyenoord): van "iedereen wil komen" naar
**~13-15/17 goed**; de bekende valse positieven zijn weg. Restfouten zijn grensgevallen (48-49,
label "Redelijk") die op de data niet te onderscheiden zijn van de echte gevallen - niet verder
overfitten. Verdere winst zou een FM-"interesse"-veld vergen als dat ergens is uit te lezen.

## Robuustheid & tests - GEDAAN (juli)

- **Foutstatus i.p.v. eeuwig "scanning"**: de plugin schrijft nu `state:"error"` (met reden) naar
  `status.json` als de scan faalt (geen GameAssembly, of een exception); de web-app toont dan een
  rode banner i.p.v. eindeloos "⏳ FM haalt de database op…". Plugin moet herbouwd + herinstalleerd
  (game dicht) om dit actief te krijgen.
- **XSS-hardening**: speler-/clubnamen uit het geheugen gaan nu overal via `escHtml` de DOM in
  (detail, tabel, vergelijking, analyse) - een corrupte string met `<` breekt de opmaak niet meer.
- **Onbekende leeftijd ≠ minderjarige**: `interestEstimate` behandelt leeftijd 0/onbekend niet
  langer als <15 (geen valse "te jong"-afwijzing).
- **parseMoney**: "mld" (miljard) werkte niet (regex matchte al op de M) - opgelost.
- **Modeltests** (`npm test`, zero-dep `node:test`): de echte reken-functies uit `app.js` worden via
  een testharnas in Node geladen en getoetst op invarianten (waarde/vraagprijs/interesse/potentie/rol).
  Vangt regressies bij het bijstellen van de modellen. Zie `test/README.md`.

## 5. Marktwaarde - OPGELOST (echte waarde uit geheugen)

**Ijkset groeit nu automatisch**: de server bewaart bij elke geladen dump de spelers met een echte
in-game waarde in `%LOCALAPPDATA%\FMSuperScout\value-history.json` (dedup op id, laatste wint),
op te vragen via `GET /api/value-history?full=1`. Zo groeit de kalibratieset gratis over
seizoenen/competities heen voor een latere herijking. Zie `docs/value-model.md`.


De plugin leest FM's echte transferwaarde nu uit `pl+0x234` (geverifieerd via offset-discovery
tegen in-game bedragen). ~74% van de spelers krijgt de exacte FM-waarde; de rest (sentinel
0xFFFFFFFF/300000000) valt terug op het reputatie-schatmodel hieronder. Bidstrup: €62M-gok →
echte €15.8M. Dit maakt de aparte schatting grotendeels overbodig, maar die blijft als fallback.

### Historie: reputatie-schatmodel (fallback)

Geijkt op 43 echte waarden (~24% in-sample; ~44% out-of-sample op een later seizoen). Herijken op
alleen de ~30 punten van één dump geeft instabiele/foutgetekende coëfficiënten (overfitting), dus
het robuuste model blijft staan. Echte verbetering vereist **meer ijkpunten uit verschillende
competities/seizoenen** (mavarobli kan die uit FM aanleveren). Tienerwaarde blijft intrinsiek grillig.

## 6. UX-ideeën (nice-to-have)
- Filteren op losse attributen / attribuut-drempels (bv. "Pace ≥ 15").
- Opgeslagen filter-presets ("mijn wonderkid-zoekopdracht").
- Snelknoppen: wonderkids, aflopende contracten, vrije spelers.
- Rol-vergelijking tussen shortlist-spelers; export van de vergelijking.
