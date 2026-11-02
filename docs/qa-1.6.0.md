# QA 1.6.0: code review en UAT (2 november 2026)

Getest tegen FM 27.0 (Steam, Windows 11) met een Feyenoord-save: ~40.000 spelers en 24.000 staf.
FM26 zelf was niet meer geïnstalleerd; FM26-compatibiliteit is getest met een bestaande FM26-dump
(plugin 0.1.46).

## Verificatie van de data

- **Spelers**: de volledige eerste selectie van Feyenoord (25 spelers) naast FM's eigen
  selectiescherm gelegd. Leeftijd, contract, nationaliteit en salaris kloppen exact. De waarde
  valt binnen FM's scoutingbandbreedte (GBP→EUR ≈ 1,16).
- **Posities**: ruwe positiewaarden vergeleken met FM's positiekolom. Bijvoorbeeld Read:
  DR 20, WBR 18, DL 17, MR 16 is in FM "V (RL), VV/M (R)".
- **Staf**: alle 19 attributen van Oscar Moens (keeperstrainer) en Zeb Jacobs (hoofd
  jeugdopleiding) vergeleken met FM27's niveaus (Ongeschikt … Elite). Daarnaast de
  gemiddelden per functie over 24.000 stafleden: elk vakspecifiek attribuut is het hoogst bij
  zijn eigen functie.
- **Functies**: de codes 58, 60 en 62 vastgesteld via het attribuutprofiel en het aantal per
  club. 62 is daarna in FM bevestigd: Kevin Balvers (PSV), hoofd performance-analyse.
- **Statistiek**: de verdeling van elk veld in FM27 vergeleken met een FM26-dump. Het
  attribuutprofiel per positie (GK/ST/DC) volgt hetzelfde patroon.

## Code review (onafhankelijke review, 16 punten)

| # | Ernst | Bevinding | Status |
|---|---|---|---|
| 1 | Hoog | Oude FM26-plugin (1.5.0) en de nieuwe wachter scanden bij F9 tegelijk | Opgelost: de wachter wijkt als de plugin in fm.exe geladen is |
| 2 | Hoog | App heropend terwijl de wachter van een vorige sessie nog liep: na het sluiten van FM geen wachter meer | Opgelost: de wachter neemt de nieuwe sessie over (`watch.adopt`); "Nieuwe data" herstart de wachter |
| 3 | Middel | `install.ps1` liep vast op een vergrendelde scanner | Opgelost: stopt eerst wachter en server |
| 4 | Middel | Manager wisselen hield het loonplafond van de vorige club vast | Opgelost |
| 5 | Middel | Een hangende scan blokkeerde de wachter; een mislukte start liet hem stoppen | Opgelost: time-out 5 min, try/catch |
| 6 | Middel | Presets: spelers- en stafregels overschreven elkaar | Opgelost: regels per soort |
| 7 | Laag/middel | Oude dumps tonen een kapotte "Werken met jonge spelers" | Opgelost: bij oude dumps verborgen |
| 8 | Laag | Functiecodes mogelijk per game verschillend | Onderzocht: FM26 gebruikt dezelfde codes; de oude pins 36/42 kwamen nooit voor. Commentaar rechtgezet |
| 9 | Laag | Plugin viel bij onbekende versie terug op de FM27-layout | Opgelost: plugin valt terug op FM26 |
| 10 | Laag | Periode-select altijd groen gemarkeerd | Opgelost |
| 11 | Laag | Plugin-versie niet opgehoogd; i18n-title op de kiezer | Versie 0.2.0; title wordt gezet door de render |
| 12 | Middel (vermoed) | `PssFreeSnapshot` kreeg het fm.exe-handle in plaats van het eigen proces | Opgelost (Microsoft-documentatie bevestigt) |
| 13 | Laag | Scanner vroeg standaard kloonrechten | Opgelost: standaard alleen lezen; kloonrechten alleen bij de snapshot-herkansing |
| 14 | Laag/middel | Netwerk-save: de gekozen manager kon per dump verschillen | Opgelost: deterministisch; na een keuze wordt de historie direct bijgewerkt |
| 15 | Laag | request.flag-race met de oude plugin | Vervalt door punt 1 |
| 16 | Laag | Mutex van een elevated proces niet te openen | Opgelost: afgevangen |

Zonder bevinding gecontroleerd:
- XSS: alle nieuwe weergavepaden escapen FM-data.
- i18n: alle nieuwe sleutels in vier talen, met een test.
- Server: geen nieuwe endpoints; de Host/Origin-beveiliging is ongewijzigd.
- Mutex en thread-safety van de kern.
- Process- en handle-levensduur.
- Oude dumps.
- Wisselen van modus.

## UAT

**Scanner en wachter**

| ID | Scenario | Resultaat |
|---|---|---|
| S1 | Scan met draaiende FM27 | OK, 5,2-6,6 s |
| S2 | Twee scans tegelijk | OK, tweede weigert (exit 3) |
| S3 | Wachter na sluiten app | OK, blijft actief zolang FM draait |
| S4 | Tweede wachter | OK, stopt direct |
| S5 | Verlopen verzoek | Gevonden: bleef 10 s liggen. Opgelost |
| S6/S8 | Onleesbaar / geldig verzoek | OK |
| S7 | Onbekend argument | OK, exit 64 |
| S9 | Geheugen wachter | OK, ~11 MB privé |
| S10 | Dumpvaliditeit | OK, 0 dubbele ID's, CA ≤ PA |
| S12 | Overname nieuwe app-sessie | OK (na fix #2) |
| S11 | FM als administrator | Code-pad gebouwd, niet live te testen |

**Geïnstalleerde layout** (`dist/stage`, gebundelde node.exe)

| ID | Scenario | Resultaat |
|---|---|---|
| I1-I4 | Scanner gevonden, wachter gestart, "Nieuwe data" scant, FM-status | OK |
| I5 | Cross-origin POST | OK, 403 |
| I6 | Wachter overleeft sluiten app | OK |

**App**

| ID | Scenario | Resultaat |
|---|---|---|
| A1-A4 | Laden, snelfilters, sorteren op alle kolommen, zoeken | OK |
| A5 | Vier talen, speler- en stafprofiel, geen zichtbare sleutels | OK |
| A6 | Verborgen stats uit | OK |
| A8-A11 | Vergelijken, shortlist, spelerskaart (veld + keeper), selectieanalyse | OK |
| A12 | Attribuutfilter spelers en staf | OK |
| A13 | Ingeklapte rail | OK |
| A14 | Valuta | OK |
| A15 | Positiefilter inclusief bedreven | OK |
| A16 | Filtersnelheid | 10 ms op 40k spelers |
| A17 | Toegankelijke namen | OK |
| A18 | Toetsenbordbediening sectiekoppen en clubknop | Gevonden. Opgelost |
| A19 | Managerkiezer (gesimuleerd) | OK |
| A20 | 1024 px breed | Gevonden: topbalk brak. Opgelost |
| A21 | Oude FM26-dump | OK |
| A22 | Console | Geen fouten |

## Niet getest (beperkingen van deze testomgeving)

- FM26 live (niet geïnstalleerd).
- FM als administrator.
- Een echte netwerk-save met twee menselijke managers.
- Epic en Xbox Game Pass.
- De Inno-installer daadwerkelijk installeren (zou de bestaande 1.5.0-installatie overschrijven).
- F9 echt in FM indrukken.
