# Backlog & openstaande punten

Status-overzicht van wat af is, wat open staat, en ideeën. Nog niet gebouwd waar "backlog" staat.

## 1. Volledige standalone installer (.exe) — BACKLOG, onderzocht

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

## 2. In-app data ophalen met FM-detectie — BACKLOG

- Server-endpoint `/api/fmstatus` dat via `tasklist` checkt of `fm.exe` draait.
- Knop "Nieuwe data": eerst `fmstatus` checken. Draait FM niet → nette foutmelding
  ("Start Football Manager 26 eerst") i.p.v. eindeloos wachten. Draait FM wél → `request.flag`
  schrijven (bestaat al) zodat de plugin de dump start; poll tot de nieuwe dump binnen is.
- Klein en zonder plugin-wijziging te bouwen.

## 3. Data-nauwkeurigheid (vereist plugin-uitbreiding) — BACKLOG

Deze drie zitten in de plugin (geheugen-offsets), niet in de web-app, en vereisen Marks
F9-testloop met `diagnostics.txt`:
- **Persoonlijkheid uitlezen** (Ambitie, Professionaliteit, Loyaliteit): staan nu op 0 in de dump.
  Dit zijn FM's **dominante interesse-factoren**; zonder deze blijft interesse voor (jonge) spelers
  ruw. Grootste hefboom voor betere interesse. Zie analyse hieronder.
- **Clubnaam-offset**: sommige clubs geven wel een clubreputatie maar geen naam ("onbekende club",
  bv. Filip Wisłocki / Lech). Indirecte-string-offset nog niet gepind.
- **Divisie/competitie-offset**: `div` is overal leeg → echte competitie-/divisiefilter kan pas
  als dit is uitgelezen. Filter staat klaar en verschijnt automatisch zodra data aanwezig is.

## 4. Interesse-model — verbeterpunt

Getest tegen echte data (18 tieners, 3 wilden naar Feyenoord): **13/17 goed**. De 4 missers zijn
allemaal **gehypte EU-tieners bij sterke clubs** (Flippot/Rennes, Zanardo/Bologna, Joksić/Partizan,
Lindqvist/Kopenhagen): reputatie zegt "ja", maar in werkelijkheid willen ze een goede club niet uit.
De Art.19-regel (non-EU <18) klopte 100%.
- **Snelle heuristiek** (zonder plugin): demp interesse voor jonge spelers bij clubs met hoge
  reputatie (een 16-jarige bij een top-club vertrekt zelden voor een laterale stap).
- **Echte fix**: persoonlijkheid uit de plugin (punt 3).

## 5. Marktwaarde — grotendeels af, klein verbeterpunt

Geijkt op 43 echte waarden (~24% mediaan op volwassenen). Tienerwaarde blijft grillig. Meer
ijkpunten uit **andere competities** en **echte tienerwaarden** zouden de randen aanscherpen.

## 6. `.fmf`-shortlistexport — GEBLOKKEERD

Payloads versleuteld met per-bestand nonce; niet reproduceerbaar. Zie `docs/fmf-format.md`.

## 7. UX-ideeën (nice-to-have)
- Filteren op losse attributen / attribuut-drempels (bv. "Pace ≥ 15").
- Opgeslagen filter-presets ("mijn wonderkid-zoekopdracht").
- Snelknoppen: wonderkids, aflopende contracten, vrije spelers.
- Rol-vergelijking tussen shortlist-spelers; export van de vergelijking.
