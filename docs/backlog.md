# Backlog & openstaande punten

Status-overzicht van wat af is, wat open staat, en ideeën. Nog niet gebouwd waar "backlog" staat.

## 1. Volledige standalone installer (.exe) - GEBOUWD (15-07); door mavarobli te testen

**Inno Setup 6-installer** (`installer/FMSuperScout.iss`, bouwen met `installer/build-exe.ps1`
→ `dist/FMSuperScout-Setup.exe`, ~48 MB). Eén .exe die alles installeert:

- **Viewer** (app + gebundelde node.exe + launcher-vbs) → `Program Files\FMSuperScout`,
  Start-menu + optioneel bureaublad-snelkoppeling, nette uninstaller in "Apps en onderdelen".
- **FM26-map automatisch gedetecteerd**, met handmatige mapkiezer (validatie op `fm.exe`) als
  vangnet: **Steam** (register `HKLM32\SOFTWARE\Valve\Steam` → álle libraries via
  `steamapps/libraryfolders.vdf` parsen → library met `appmanifest_3551340.acf`, ook
  `installdir` gelezen), **Epic** (launcher-manifests `ProgramData\Epic\...\Manifests\*.item`,
  JSON `InstallLocation`), **Xbox/Game Pass PC** (`<schijf>:\XboxGames\Football Manager 26\
  Content`, C t/m L).
- **BepInEx-payload gebundeld** (de bewezen set uit Marks installatie = Thunderstore-pack
  BepInEx 6 BE 6.0.738 IL2CPP x64 incl. gepatchte Il2CppInterop): rootloader (winhttp.dll,
  doorstop), core, config, unity-libs én de dotnet-runtime (~79 MB). `interop/` en `cache/`
  bewust niet — die genereert BepInEx bij de eerste start lokaal (patch-bestendig). Staat er
  al een BepInEx in de gamemap, dan wordt die **niet** overschreven (Check gecachet — anders
  zou de check halverwege de kopie omslaan). LGPL-notice (`LICENSE-BepInEx.txt`) mee.
- **Plugin-DLL** → `BepInEx\plugins`. Draaiende `fm.exe` wordt gedetecteerd (WMI) met een
  "sluit de game"-retry-dialoog. Gamemap wordt in `HKLM\Software\FMSuperScout` onthouden;
  de uninstaller haalt alléén onze DLL weg (BepInEx blijft staan voor andere mods).
- Tweetalig (NL/EN), afsluitpagina waarschuwt voor de trage eerste start (interop-generatie,
  1-3 min zwart consolevenster) en mogelijke antivirus-melding op BepInEx.

**Nog te doen vóór release:**
- **mavarobli test de .exe end-to-end** op de eigen machine (wizard, detectie, snelkoppeling, F9).
- Epic/Xbox-detectie is **onbeproefd** (hier alleen Steam) → in de release als bèta markeren.
- **Signing-beslissing (15-07, mavarobli akkoord): eerste release ongesigneerd**, met SHA-256-
  checksum (bouwt `build-exe.ps1` nu automatisch als `.sha256` naast de exe) en een
  VirusTotal-scanlink in de release notes — zoals gebruikelijk in de modding-scene. De
  SmartScreen-melding ("Meer info → Toch uitvoeren") staat uitgelegd in de release notes
  (`docs/release-notes-v1.0.0.md`, concept klaar). Slaat de tool aan, dan alsnog signen:
  **Certum Open Source** (~€60-90/jr) of **SignPath.io** (gratis voor OSS) zijn de
  kandidaten; exe-metadata (uitgever/omschrijving/versie) zit er al in.

## 2. In-app data ophalen met FM-detectie - GEDAAN

Server-endpoint `/api/fmstatus` checkt via `tasklist` of `fm.exe` draait. Knop "Nieuwe data"
checkt dit eerst: draait FM niet → rode banner "Start Football Manager 26 eerst" i.p.v. eindeloos
wachten; draait FM wél → `request.flag` schrijven zodat de plugin de dump start. Getest tegen de
echte draaiende game (correcte detectie).

## 3. Data-nauwkeurigheid (plugin) - deels gedaan

- **Persoonlijkheid uitlezen: GEDAAN** - de plugin vult nu Ambitie/Loyaliteit/Professionaliteit
  e.a. (100% in de huidige dump). Meegenomen in het interesse-model (punt 4).
- **Clubnaam - GEDAAN (14-07, end-to-end geverifieerd)**: oorzaak was `PlausibleClub` die
  niet-westerse Latijnse letters afkeurde (Pools ł/ń/ś, Turks ğ/ş/ı), waardoor bv. "Lech Poznań"
  wegviel terwijl de clubreputatie wél gelezen werd. Accepteert nu het hele Latijnse Unicode-blok
  (t/m Latin Extended). Geverifieerd tegen de echte F9-dump én in de app: Filip Wisłocki toont
  "Lech Poznań"; ook Beşiktaş A.Ş., Śląsk Wrocław en Górnik Zabrze bestaan nu.
- **Competitie-UI (15-07)**: clubniveau-filter (reputatiedrempels) verwijderd — de echte
  divisie maakt het overbodig. Divisiefilter is nu een **slimme zoekbalk met eigen dropdown**
  (app-stijl, verving de native datalist die als lichte "wolk" uit de donkere UI viel):
  suggesties gerangschikt op competitiesterkte (proxy = mediane clubreputatie van de spelers
  erin, want competitiereputatie dumpen we nog niet), met typo-tolerantie (Levenshtein per
  woord) en substring/subsequence-matching. "premeir" → Premier League bovenaan. Eigen
  competitie(s) van je club krijgen voorrang (typ "eredivisie" → jouw VriendenLoterij
  Eredivisie bovenaan, niet de buitenlandse naamgenoten), maar positie weegt zwaar zodat een
  prefix-match als "Premier League" nooit verliest van je eigen reserve-"Premier Divisie".
  Sterkte-proxy = 80e-percentiel clubreputatie (top-clubs bepalen aanzien). Peiljaar-
  veld weg; in-game datum staat in de header naast het spelersaantal met een SVG-kalender
  (app-stijl), tilde + tooltip bij afgeleid, exact bij "memory".
- **In-game datum — bug in v0.1.11 gevonden (15-07, gefixt in v0.1.12)**: de "schone"
  stemfilter `& 0xFE00` gooide álle team-stemmen weg (het `+0x94`-veld draagt vlagbits in
  9-15). Fix: stemmen normaliseren op de gedecodeerde datum, én de datum rechtstreeks lezen
  van het schema-object van MÍJN team (`[myTeam+0xA0]+0x94`, met +0x18 als fallback) — dat
  gaf in elke meting exact "vandaag" (19-09 geverifieerd). Teamstemmen nog als kruischeck.
- **Divisie/competitie - GEPIND + landprefix-fix (15-07, v0.1.10)**: `[team+0x50/0x60]` →
  competitie-object; eerste F9 (v0.1.7) gaf 94,9% dekking en per club consistente divisies
  (jeugd kreeg zelfs correct de U19-competitie), maar de kórte naam (`comp+0x48`) mist bij
  niet-gelicentieerde competities het land — heel Spanje werd "Eerste Divisie", Oostenrijk
  "Eredivisie". De comp-namenkaart (v0.1.8-watchlist) toonde dat de vólledige naam op
  `comp+0x40` het land wél draagt ("Oostenrijkse Eredivisie"), dus v0.1.10 gebruikt die
  eerst (NL wordt dan "VriendenLoterij Eredivisie" — sponsornamen, net als FM zelf toont).
  Check na F9: Vallecano-spelers op "Spaanse Eerste Divisie" (of LALIGA-naam)?

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
  rode banner i.p.v. eindeloos "⏳ FM haalt de database op…". Zit in de geïnstalleerde plugin
  (12-07-build en nieuwer; hash gamemap = repo-dist geverifieerd 14-07).
- **XSS-hardening**: speler-/clubnamen uit het geheugen gaan nu overal via `escHtml` de DOM in
  (detail, tabel, vergelijking, analyse) - een corrupte string met `<` breekt de opmaak niet meer.
- **Onbekende leeftijd ≠ minderjarige**: `interestEstimate` behandelt leeftijd 0/onbekend niet
  langer als <15 (geen valse "te jong"-afwijzing).
- **parseMoney**: "mld" (miljard) werkte niet (regex matchte al op de M) - opgelost.
- **Verspringende kolommen bij sorteren (14-07) - opgelost**: de tabel gebruikte automatische
  kolombreedtes, dus de inhoud van de ~45 zichtbare (gevirtualiseerde) rijen bepaalde de
  breedte en bij elke sortering verschoof alles. Nu `table-layout: fixed` met een
  standaardbreedte per kolom (`w` in de kolomdefinities); zelf gesleepte breedtes gaan vóór
  en de tabelbreedte beweegt mee met de versmalgreep. Geverifieerd: posities byte-identiek
  over meerdere sorteringen; resize-greep werkt nog.
- **Modeltests** (`npm test`, zero-dep `node:test`): de echte reken-functies uit `app.js` worden via
  een testharnas in Node geladen en getoetst op invarianten (waarde/vraagprijs/interesse/potentie/rol).
  Vangt regressies bij het bijstellen van de modellen. Zie `test/README.md`.

## 5. Marktwaarde - OPGELOST (echte waarde uit geheugen)

**Kalibratieset verwijderd (15-07)**: er liep een automatische ijkset (`value-history.json` +
`/api/value-history`). Nu de echte waarde uit het geheugen komt en het schatmodel on point is,
was dat overbodig — verwijderd (archivering, endpoint, bestand). Tijdelijk weer aan te zetten
als het schatmodel ooit herijkt moet worden. Zie `docs/value-model.md`.


De plugin leest FM's echte transferwaarde nu uit `pl+0x234` (geverifieerd via offset-discovery
tegen in-game bedragen). ~74% van de spelers krijgt de exacte FM-waarde; de rest (sentinel
0xFFFFFFFF/300000000) valt terug op het reputatie-schatmodel hieronder. Bidstrup: €62M-gok →
echte €15.8M. Dit maakt de aparte schatting grotendeels overbodig, maar die blijft als fallback.

**Grote ijking 14-07** (`tools/value-calib.js`, 55 spelers van Telstar-€28K tot Mbappé-€300M,
in-game bandbreedtes door mavarobli aangeleverd): **54/55 kloppen** — onze waarde (×1,16 £→€) valt
binnen FM's getoonde transferwaarde-bandbreedte, op afrondingsranden na. Bonus-ontdekking:
bij `listed`-spelers met een door de club gezette vaste vraagprijs is het waardeveld daar
**exact** aan gelijk (4/4, ±1%) → de app toont die nu zonder "~" en zonder afronding, en
`feeMultiplier` doet er geen op-/afslag meer op. Vraagprijsmodel v2: premies gematigd
(contract-opslag cap 1,35; wonderkid ≤ ×1,2; totaal cap 1,7 / 2,2 bij niet-te-koop; v1 ging
tot ×2,4 — niet gesteund door de ijking). Verdere aanscherping vergt échte "betaald vs.
waarde"-datapoints. **Open uitschieters: Nobel Mendy en Jozhua Vertrouwd** (veld €39,1M vs
in-game €17,5-21M resp. €13,5M vs €0,95-8,4M) — beide 21-jarigen bij Rayo; de 28+'ers van
dezelfde club kloppen wél (De Frutos binnen band, Singh exact = clausule €25M). Mendy is
niet gelijst, speelt alles, is tevreden, clausule €55M (verklaart de lage prijs dus niet).
**OPGELOST (14-07, watchlist-gelddump)**: geen uitleesfout — FM's opgeslagen waarde is
dynamisch en kan dagen achterlopen op de weergave. Bij de herhaalmeting stond Mendy's veld
op £15,77M (€18,3M, midden in de in-game 17,5-21M) en Vertrouwd op £4,9M (€5,7M, binnen
0,95-8,4M); FM had ze tussen de dumps geherberekend. Conclusie: waarde-uitlezing volledig
gevalideerd; een dump is een momentopname, vaker F9'en houdt waardes vers.
Bijvangst uit de gelddump: `pl+0x244` lijkt de laatste transfersom (Haaland £51M),
`pl+0x248` = weekloon; een afkoopclausule-veld (Mendy €55M) is in het speler-/contract-
venster níét gevonden — clausules leven vermoedelijk in een aparte lijst (nice-to-have).
Praktische les: bestanden die van buitenaf in de datamap worden gezet zijn voor fm.exe
onzichtbaar (virtualisatie); de plugin maakt/vult `watchlist.txt` daarom zelf (v0.1.5+).

### Historie: reputatie-schatmodel (fallback)

Geijkt op 43 echte waarden (~24% in-sample; ~44% out-of-sample op een later seizoen). Herijken op
alleen de ~30 punten van één dump geeft instabiele/foutgetekende coëfficiënten (overfitting), dus
het robuuste model blijft staan. Echte verbetering vereist **meer ijkpunten uit verschillende
competities/seizoenen** (mavarobli kan die uit FM aanleveren). Tienerwaarde blijft intrinsiek grillig.

## 6. Opgeslagen filterpresets - GEDAAN

Sidebar-sectie "Opgeslagen filters": sla de complete filterstand op onder een naam (tekstvelden,
vinkjes, selects, veldposities én de gekozen tactische rol), klik om toe te passen, ✕ om te
verwijderen, zelfde naam = overschrijven. Bewaard in localStorage (`fmss_presets`). Getest
end-to-end tegen de echte dump (opslaan → wissen → toepassen → herladen → verwijderen).

## 7. Meta-score kolom (FM-Arena) - GEDAAN

Sorteerbare kolom "Meta" (na PA) + regel in het profiel: gewogen attribuutscore op de
1-20-schaal met als gewichten de gemeten punten-impact uit FM-Arena's attribute testing
(Pace 20.5, Acceleration 20.4, JumpingReach 11.6, Dribbling 9.8, …; bron:
fm-arena.com/table/26-player-attributes-testing). Zegt "hoe meta is deze speler" los van CA/rol —
Adama Traoré (CA 135) scoort er hoger dan menig CA-160-speler, precies de bedoeling. Keepers
vallen buiten de test → geen score. Nieuwe kolommen worden nu op hun standaardplek in een
bestaande kolomconfiguratie ingevoegd (niet meer achteraan).

## 8. Versie-waarschuwing bij FM-patch - GEDAAN (plugin herbouwen)

De plugin leest de bestandsversie van `game_plugin.dll` en zet `gameVersion` /
`supportedVersion` / `versionOk` in de dump-meta (gepind op major.minor 26.3 in `Fields.cs`).
Wijkt de versie af, dan toont de app een ambergele balk "data mogelijk onbetrouwbaar". Bij een
nieuwe FM-patch: offsets verifiëren en `SUPPORTED_*` in `Fields.cs` ophogen.

## 9. In-game datum - GEPIND via team-schema; BEKENDE BEPERKING tijdens speelpauzes (15-07)

**Beperking ontdekt 15-07 (v0.1.30→0.1.33)**: mavarobli zag de app 22 dec tonen terwijl de game
op 1-3 jan stond. Oorzaak: `[team+0xA0]+0x94` is de **eerstvolgende wedstrijddatum**, geen
wereldklok. Op wedstrijddagen (waarop we in september pinden) valt dat samen met "vandaag";
tijdens de winter-/zomerstop blijft het op de laatste/eerstvolgende wedstrijd staan en loopt
het tot ~2 weken achter. Een discovery-scan (tijdelijk in v0.1.31/0.1.32) over **9.791 teams**
op alle datumvelden van team-, schema-, competitie- én club-objecten vond **nergens** een
gedeelde "vandaag"-datum: geen enkele offset had hoge overeenstemming op de echte datum (de
comp-velden dragen seizoens-/aanmaakdatums uit 2026, de sched-velden zijn per team verschillende
wedstrijddata). Conclusie: de kalenderklok wordt niet als leesbaar FM-datum-u32 op deze native
DB-objecten opgeslagen; hij leeft vermoedelijk als C#-`DateTime` (ticks) in GameAssembly of op
een globaal wereld-object. **Beslissing mavarobli: zo laten** — de exacte jacht (meerdere FM-dicht/
F9-rondes, onzekere uitkomst) is de moeite niet waard, want de impact is cosmetisch: leeftijd
verandert alleen op een verjaardag, dus ~2 weken speling verandert vrijwel nooit een leeftijd.
De discovery-scaffolding is weer opgeruimd (v0.1.33). Wie het later toch exact wil: begin bij
een .NET-`DateTime`-ticks-scan in GameAssembly of een pointer-pad vanaf de human-manager naar
het wereld-object.

### Historie: pin via team-stemmen (15-07, plugin v0.1.10)

**Doorbraak 15-07**: de fixture-jacht toonde dat `[team+0xA0]+0x94` exact de huidige
in-game datum draagt (2027-09-05 op meerdere onafhankelijke teams, bevestigd door mavarobli).
v0.1.10 laat álle teams uit de squad-walk stemmen; bij ≥10 stemmen en ≥60% eensgezindheid
wordt de datum gezet (`gameDateSource:"memory"`, leeftijden herberekend), anders eerlijk
terug naar "derived". De app verbergt het peiljaar-veld zodra de bron "memory" is (Marks
wens). Historie van de zoektocht hieronder.

### Historie: vals-positief + discovery-rondes (14-07)

**Les uit de F9-loop (12-07 vs 14-07)**: de game_plugin-image-scan vond bij twee dumps met
verschillende in-game datums exact dezelfde kandidatenlijst (zelfde waardes én offsets) — dat
zijn dus constantes in de binary, geen live datum. De "gekozen" 2027-09-13 was fout; echt was
15-08-2027 (0x07EB00E3), en die waarde stond niet eens in de lijst → de echte datum leeft op
de heap of in GameAssembly-statics.

**v2 (plugin v0.1.2)**: kiest níéts meer automatisch (`gameDateSource` blijft `"derived"`) en
verzamelt drie sporen in `diagnostics.txt`: (1) gp-image (referentie/constantes), (2)
GameAssembly-image-statics (een `ga+offset` zou stabiel zijn binnen een versie), (3) een
heap-histogram van alle FM-datum-gecodeerde u32's uit de hoofdscan. Werkwijze: mavarobli meldt bij
elke F9 de in-game datum; de kandidaat met die waarde over twee dumps (met verschillende
datums!) is de bron om te pinnen.

**Ronde 14-07 (echt: 26-08-2027)**: de datum stond in géén van de drie u32-sporen — wel
stopt het heap-histogram van drukbezette datums exact vlak vóór "vandaag" (22/8), dus de
data is vers maar "vandaag" leeft niet als losse u32-glob. **v0.1.4** scant daarom ook op
.NET DateTime-ticks (u64, middernacht, jaarvenster) in GameAssembly — de C#-laag bewaart
de datum mogelijk als System.DateTime-static. Marks wens zodra dit betrouwbaar is: het
peiljaar-veld in de zijbalk automatisch verbergen.

## 10. Voortgangsbalk bij nieuwe data - GEDAAN (14-07)

Echte voortgang, geen nep-animatie, op twee plekken in de banner:
- **Plugin-scan**: de plugin schrijft tijdens de scan elke ~0,5 s `progress` (0..1) naar
  `status.json` — gescande bytes/totaal voor 0-85%, koppelfase 87-90%, JSON-schrijven 90-100%
  (verhouding ≈ echte doorlooptijd). De app pollt sneller (750 ms) tijdens een scan en toont
  balk + percentage. Oudere plugins zonder `progress` krijgen de oude tekstbanner.
- **Dump laden in de app**: streamende fetch met `Content-Length` → "Data laden… X / Y MB"
  met balk, daarna "Data verwerken…" tijdens de JSON-parse.
Zit in plugin v0.1.2 (geïnstalleerd 14-07) + app. App-kant end-to-end getest (48.869 spelers
geladen via het nieuwe streamingpad; balkrendering geverifieerd; modeltests groen). De
plugin-kant meeloopt bij Marks volgende F9.

**Auto-laden (14-07)**: zodra de plugin klaar is, laadt de app de nieuwe dump automatisch —
de groene balk is nu een korte bevestiging ("Nieuwe data geladen") die na 6 s vanzelf
verdwijnt, geen klik meer nodig. End-to-end getest met een gesimuleerde scanning→done-
overgang in `status.json`. Instructiestap 3 in de lege-staat is meegewijzigd.

## 11. Vergelijkscherm v2 - GEDAAN (14-07)

Op Marks verzoek volledig uitgewerkt: attributen in FM-kleuren (winnaar krijgt een
accent-onderstreping i.p.v. kleur-override), meta-score, vraagprijs, lengte, contract en
voet erbij, groepsgemiddelden (Technisch/Mentaal/Fysiek/Standaard, 1 decimaal, met
kleur), een winsttelling ("Beste op … attributen"), en verborgen kenmerken +
persoonlijkheid als eigen groepen (zelfde zichtbaarheidsregel als het detailpaneel;
blessuregevoeligheid/vals spel/controverse tellen omgekeerd). Bij precies 2 spelers is er
een Δ-kolom (speler 1 − speler 2; groen = speler 1 beter af, ook bij "lager is beter"
zoals vraagprijs); bij 3 spelers vervalt de Δ-kolom en markeren de rijen de winnaar. Max
blijft 3 spelers. End-to-end geverifieerd (Mbappé/Haaland/Wirtz); tests groen.

**v2.1 (14-07, opgeruimd na Marks feedback)**: de eerste versie was één lijst van 66 rijen
(2.195px, 2,7 schermen scrollen). Nu: groepsgemiddelden weg, winsttelling als badge in de
kop ("11× beste attribuut"), en de attributen in twee kolommen met panelen — bij 2 spelers
in FM-stijl (waarde | naam | waarde | Δ), bij 3 spelers naam | w1 w2 w3. Kerngetallen
blijven bovenin als grid met sticky kop. Scrolllengte ~-40%; panelen stapelen automatisch
op smalle vensters (minmax 300px).

**v2.2 (14-07, naar FM's eigen vergelijkscherm gemodelleerd)**: vergelijkbalkjes in het
midden van elke attribuutrij i.p.v. de Δ-tekstkolom (groen naar links = speler 1 beter,
blauw naar rechts = speler 2; lengte ∝ verschil, 8 punten = vol; Δ als tooltip; werkt ook
omgekeerd bij "laag is beter"). Kop is nu een eigen sticky grid boven de héle scroll met
naam, leeftijd·positie·club, waarde·salaris·contractjaar en het winst-badge. Per paneel
een "Gemiddeld"-voetregel met eigen balkje (zoals FM onderaan doet). Geverifieerd: sticky
blijft staan bij scrollen, balkrichting/-lengte klopt, 3-spelermodus zonder balkjes intact.

## 12. Man/vrouw-filter - GEDAAN (15-07, v0.1.19)

Geslacht-byte na 3 foute pins definitief: **`person+0x19` bit `0x10`** = vrouw. Eerdere
kandidaten 0x0A en 0x18 bit 0x08 waren jeugd/teamtype-vlaggen (bij álle jeugd gezet →
mannelijke wonderkids werden als vrouw geflagd). Doorslaggevend: jeugd-man vs jeugd-vrouw
diffen (leeftijd-confound weg) + validatie tegen mannen-JÉÚGD-competities. Eindvalidatie
v0.1.19: Premier League/Eredivisie/Deense-Duitse-Franse U19 = **0 vrouwen**, vrouwencompetities
100%, alle 228 gevonden vrouwen zitten in echte vrouwencompetities (WSL, Frauen-Bundesliga,
Eerste Divisie Vrouwen…). Segment-toggle Mannen/Vrouwen/Beide (default Mannen) live; app-
vangnet: filter no-op als de dump geen geslacht-data heeft (voorkwam 0-resultaten).

**Beslissing 15-07 (mavarobli): vrouwen helemaal niet inladen.** De toggle is verwijderd; de plugin
slaat vrouwen (person+0x19 bit 0x10) al bij de scan over → scheelt tijd/ruimte, en de
regen-vrouwen die "lekten" zijn weg. Geen `gender`-veld meer in de dump, geen filter/UI meer
in de app. Onderzoek naar de ontbrekende vrouwen (het CA/PA-filter was NIET de oorzaak — 0
afgewezen spelers; wél een aparte class-offset ~0x219 met ~39k objecten, vermoedelijk de
vrouwen-class) is stopgezet: niet nodig nu we vrouwen bewust weglaten. Kan later weer opgepakt
worden als volledige vrouwen-scan ooit gewenst is.

### Historie: eerdere foute pins (0x0A, 0x18)

mavarobli wil man/vrouw kunnen filteren; default mannen. **Geslacht-byte (2 rondes)**: eerste pin
`person+0x0A` was FOUT — bleek een jeugd/niveau-vlag (Simon Banza, man/Ligue 1, kreeg ook 1;
"vrouwen" waren vooral mannelijke jeugd/lagere-divisiespelers). Oorzaak: discovery-set te
eenzijdig (elite mannen vs jonge vrouwen → leeftijd/niveau confound). Discovery v2 met diverse
set (Banza 31j, Mparaganda 19j, Haaland, Mbappé als mannen; vrouwen 16-18j) + vólledige
byte-kaart wees **`person+0x18` bit `0x08`** aan: alle 4 mannen 0x00, alle 5 vrouwen 0x08.
v0.1.16 leest dat, dumpt `gender` (0/1) per speler/staf, en logt een validatie (vrouwen per
mannen-/vrouwencompetitie). **App-kant**: segment-toggle in Instellingen "Mannen/Vrouwen/
Beide" (default Mannen), app-stijl; rij verschijnt alleen bij geslacht-data. Getest met
gesimuleerde data (3 standen filteren correct). Na Marks F9 met v0.1.16: validatieregels
checken (Premier League ~0 vrouwen), dan is de toggle definitief live.

## 13. Huur-/verhuurspelers onder "Mijn club" - GEDAAN (15-07, v0.1.24)

mavarobli wil bij zijn eigen club ook gehuurde/verhuurde spelers zien, in FM's kleuren (rood =
verhuurd, blauw = gehuurd). Sleutel: **moederclub = volledige-contract-keten**
(`person+0xA8→team(+0x10)→club(+0x30)`), terwijl de squad-walk de huidige/huurclub geeft.
Discovery bevestigde dit met Marks verhuurde Feyenoorders (Amaury Zimmermann → SK Beveren,
contract → Feyenoord). Plugin dumpt nu `ownerClub` wanneer die afwijkt van `club`. App: onder
het "Mijn club"-filter worden spelers met moederclub==mijn club óók getoond; naam gekleurd
rood (verhuurd aan X) / blauw (gehuurd van X) met tooltip. Alleen onder Mijn club (Marks
keuze). Getest met gesimuleerde huurdata (rood/blauw + tooltip correct); tests groen.
Kanttekening: pakt de gevallen waar de squad-walk de huurclub correct oplevert; verhuurde
spelers die de squad-walk (nog) aan Feyenoord toekent, tonen als gewone spelers — te
verfijnen als mavarobli ziet dat er iemand mist.

## 14. Scan-overhead opgeruimd - GEDAAN (15-07, v0.1.25)

mavarobli merkte dat het laden trager voelde. Oorzaak: de datum-zoektocht had een zware diagnose
achtergelaten — voor élk 8-byte-woord in de héle heap werd gecheckt of het een FM-datum of
.NET-tick codeerde (miljoenen extra bewerkingen + twee groeiende histogrammen per scan). Nu de
datum via het team-schema gepind is, is dat overbodig. Verwijderd: `CountHeapDate` (2×/woord),
de heap-tick-check (1×/woord), `HeapDateHist`/`HeapTickHist`, de image-datumscans
(`ScanGpDates`/`ScanGaDates`/`ScanGaTicks`/`ScanImageDates`) en het `heap-dates.txt`-bestand
plus alle bijbehorende diagnostieksecties. `FindGameDate` leest nu alleen nog rechtstreeks het
team-schema (+ teamstemmen als kruischeck). App-kant is sowieso lichter geworden: vrouwen
worden niet meer ingeladen en het gender-veld is weg → kleinere dump, snellere parse. Scan
en laadtijd weer terug op het oude niveau.

## 15. Diagnostics/discovery-scaffolding opgeruimd - GEDAAN (15-07, v0.1.26)

Grote opschoning nu alle offsets gepind zijn. Uit de plugin verwijderd: CLUB-OFFSET-,
DIVISIE-OFFSET- (incl. `DivDiscover`/`WriteDivCand`/`ObjNameMap`/`DivNameOffs`), SQUAD-LIJST-,
fixture-jacht-, WAARDE-OFFSET- en WATCHLIST-discovery (incl. `WriteWatchlist`/`NormName`/
`MoneyLike`), plus `ClubNameAt`/`ChainClubName`/`FmDateDebug`/`ResolveClubName` en de
diagnose-verzamelingen `DiagPersons`/`DiagClubs`/`DiagTeams`/`ProbeHist`/`DiagMyClubObj`.
Die probeerden elke F9 honderden objecten × offsets in het geheugen — puur ontwikkel-
scaffolding voor problemen die nu opgelost zijn. `WriteDiag` is nu een strakke health-check
(class-offset-top-15, matches, mijn club, datum-bron, 12 sample-spelers, huur-overzicht) die
niets extra's probeert. `diagnostics.txt` is een fractie van de grootte; scan/diag weer snel.
Health-check blijft: als een FM-patch de offsets verschuift, zie je dat aan de class-pieken.

## 16. UX-ideeën (nice-to-have)

- **Eigen-team-schakelaar — GEBOUWD (15-07, verifiëren met F9)**: de v0.1.9-discovery
  vond de teamstructuur (Feyenoord: tt=0 eerste elftal/Eredivisie, tt=3 reserves, tt=11
  O18), maar de lijst-entries bleken geen person-pointers (naamresolutie gaf rommel).
  Oplossing in v0.1.10: **squad-walk v2** — clubs uit de bewezen contract-keten, en per
  lijst-entry proben (direct + [entry+0x00..0x80]) tegen de bekende person-adressen; het
  winnende offset komt in de diagnose ("entry→person-offsets"). Levert per speler
  `teamType` (0=1e, ~3=reserves, ≥10=jeugd) én de team-divisie (jeugd → jeugdcompetitie).
  App-kant af: chips "Alles · 1e elftal · 2e elftal · Jeugd" verschijnen onder het
  "Mijn club"-vinkje zodra teamType-data aanwezig is (oude dumps → onzichtbaar). Getest
  met gesimuleerde data (24/19/18 splitst correct). Check na F9 met v0.1.10: kloppen de
  aantallen per team en het offsets-histogram in diagnostics?
- Filteren op losse attributen / attribuut-drempels (bv. "Pace ≥ 15").
- Snelknoppen: wonderkids, aflopende contracten, vrije spelers.
- Rol-vergelijking tussen shortlist-spelers; export van de vergelijking.

## 17. Potentie-projectie herijkt op de eigen database - GEDAAN (14-07)

Marks observatie: wonderkids (bv. Sinky Petersen, CA 102 / PA 180) kregen bijna alles op 20.
Oorzaak: de projectie schaalde elk attribuut met ×PA/CA, maar FM's CA-schaal heeft een grote
basis. Grootschalige meting over de echte dump (`tools/ca-analysis.js`, 43.905 veldspelers +
4.964 keepers):
- attribuuttotaal ≈ 148 + **2,1 × CA** (r = 0,91; keepers 169 + 2,2 × CA) — het oude model
  deelde daardoor tot ~75% te veel groeipunten uit;
- zelfs CA-170+-spelers hebben gemiddeld maar **0,23 attributen op 20** en ~3,5 ≥ 18
  (top-5-gemiddelde 17,6);
- leeftijdseffect binnen een CA-band is klein (±3%), positie-spreiding sd ≈ 18-27 punten.

**v2 (budget-model)**: groeibudget = T(PA) − T(CA) uit gemeten bucketgemiddelden, verdeeld met
type-weging + demping richting de cap. Beter, maar mavarobli zag terecht dat wonderkids nog te
complete allrounders werden (een back met Voorzetten 16 én Mandekking 17 én Koppen 19).

**v3 (positieprofiel-model, 14-07, actueel)**: tweede meting (`tools/pos-curve.js`) — wélke
attributen meegroeien met CA verschilt sterk per positie. Per positiegroep (GK/DC/FB/DM/MC/
W/AMC/ST + ALL-fallback) is het gemiddelde profiel gemeten op CA-ankers 80/110/140/170
(validatie: anker-170 wijkt max ~1 punt af van echte CA-165+-profielen). Projectie = eigen
waarde + (positienorm(PA) − positienorm(CA)), gemiddeld over de posities van de speler;
fysieke groei extra gedempt voor 24+. Persoonlijke sterktes/zwaktes blijven behouden, de
positie-vorm klopt: Sinky Petersen (DR, CA 102/PA 180) gaat van ~alles-20 (v1) naar gem 13,9
met Afwerken 9 en alleen zijn bestaande uitschieters op 20. Tabel in app.js gegenereerd met
`node tools/pos-curve.js` — bij een nieuwe database/patch opnieuw draaien en vervangen.

## 19. Scan geparallelliseerd - GEDAAN (15-07, v0.1.30)

Na de opschoning (14/15) bleef de hoofdscan met ~17s de flessenhals; die is
volledig het doorlopen van de heap (95% van de F9-tijd). De geheugenregio's zijn
onafhankelijk, dus ze worden nu round-robin over **N workers (cores−1)** verdeeld —
elke worker leest in een eigen buffer en verzamelt in eigen collecties, die na
`Task.WaitAll` lock-vrij worden samengevoegd. Resultaat op Marks 16-core machine
(15 workers): **hoofdscan 17.134 → 8.438 ms**, totale F9 **18,1s → 9,8s** (~halvering).
Geen lineaire schaling met cores omdat de scan geheugenbandbreedte-gebonden is
(het hele heap wordt via ReadProcessMemory gekopieerd) — ~2× is het realistische
plafond. Data-integriteit ongewijzigd geverifieerd (48,9k spelers, 32,5k staf,
huur/club-koppeling consistent). Implementatienoot: `Task.Run` i.p.v.
`Parallel.ForEach`, omdat een Il2Cpp-referentie een uitgeklede `NullableAttribute`
bevat waardoor de compiler struikelt over Parallels geannoteerde delegate; een
parameterloze Task-lambda omzeilt dat. De "Fasen"-regel in `diagnostics.txt` blijft
als goedkope, permanente perf-diagnostiek staan.

## 18. Verspreiding / launch - OPEN (13-07-2026)

Marktonderzoek gedaan: zie de vergelijkingstabel in de README (Genie Scout 26 / FMST 26 / FMRTE 26
zijn de directe concurrenten; FMST 26 lanceerde zelf pas juli 2026 met vrijwel dezelfde belofte).
Nog te doen vóór brede verspreiding:

- **Screenshot/GIF voor de README** - de app zelf werkt prima (getest tegen de echte dump, 48k+
  spelers), maar een geautomatiseerde browserscreenshot van de lokale server hing telkens vast
  (waarschijnlijk door de snelle status-poll-loop, niet door de app). mavarobli neemt zelf een korte
  schermopname van de workflow (F9 → filteren → vergelijken) - levert sowieso een sterker beeld op
  dan een statische lijst.
- **Eerste GitHub Release** - `dist/FMSuperScout-Setup.zip` staat lokaal klaar maar is nooit
  geüpload; zonder Release heeft geen enkele forumpost iets om naar te linken. `gh` CLI ontbreekt
  nog op deze pc.
- Forumpost-concepten (fmscout.com FM26-tools, r/footballmanagergames, FM-Arena) staan klaar in
  [`docs/marketing-drafts.md`](marketing-drafts.md). Alleen plaatsen na expliciet akkoord per post.
