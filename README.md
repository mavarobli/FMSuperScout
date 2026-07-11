# FMSuperScout

Snelle, accurate scout-tool voor **Football Manager 26** (Windows/Steam). Leest de volledige database van je openstaande save — spelers én staf — inclusief verborgen waarden zoals **CA/PA (huidige en potentiële punten)**, transferinteresse, vraagprijs en salariseis.

## Hoe het werkt

1. **In de game (eenmalig per sessie):** een kleine BepInEx-plugin draait mee in FM26. Druk op **F9** om de complete database naar een JSON-bestand te dumpen (`%LOCALAPPDATA%\FMSuperScout\`).
2. **De scout-app:** dubbelklik `Start FMSuperScout.cmd` → opent in je browser op `http://localhost:8765`. Klik **⟳ Verversen** om de nieuwste dump te laden.

## Features

- Zoeken op naam of club; filteren op leeftijd, CA, PA, waarde, salaris, nationaliteit
- **Posities kies je op een klikbaar voetbalveld** (zoals in de game)
- Filters: *EU/EEA-speler*, *bij mijn club*, *op transferlijst*, *contract < 6 mnd*, *contract < 1 jaar*, *clubloos*, *alleen shortlist*
- **Shortlist** met één klik (★), met eigen tabblad — bewaard in je browser
- **Valutawissel £ ↔ €** (FM bewaart bedragen intern in Britse ponden)
- Sorteerbare kolommen, vloeiend met 50.000+ spelers (gevirtualiseerde tabel)
- **Dichtklapbare filterbalk** (☰)
- Detailpaneel met alle attributen **in exact dezelfde volgorde als in-game** — keepers tonen keeper-attributen
- Clubloze spelers als `–` (vallen sneller op)
- Kop toont je **manager + club** zodat je ziet dat de juiste (draaiende) save is ingelezen
- **Interesse-inschatting** (Groot/Redelijk/Klein/Nee): heuristiek op basis van clubreputatie (jouw club vs hun club), beschikbaarheid, contractduur en leeftijd — geen exacte FM-waarde, maar reputatie is FM's dominante factor dus redelijk indicatief
- Apart tabblad voor stafleden met staf-attributen en rollenfilter

## Structuur

| Map | Inhoud |
|---|---|
| `plugin/` | C#-bron van de BepInEx-plugin (dumpt de database op F9) |
| `app/` | Lokale web-app (Node, geen dependencies) |
| `refs/` | Gekloonde open-source referentieprojecten (niet nodig voor gebruik) |

## Installatie-status

- BepInEx 6 (be.738, FM26-communitybuild) is geïnstalleerd in de FM26-map — volledig omkeerbaar, er zijn alleen bestanden *toegevoegd*.
- De plugin wordt gebouwd naar `BepInEx/plugins/FMSuperScout.dll` in de gamemap.
- **Eerste keer:** start FM26 opnieuw op. De eerste start met BepInEx duurt langer (eenmalige generatie van interop-bestanden) en er verschijnt een console-venster. Daarna: save laden → F9 → klaar.

## Verwijderen

Verwijder uit de FM26-map: `BepInEx/`, `dotnet/`, `winhttp.dll`, `doorstop_config.ini`, `.doorstop_version`, `changelog.txt`. De game is dan weer 100% origineel (Steam → verify files kan ook).

## Status & nauwkeurigheid (v0.1)

Rock-solid uit het geheugen (geverifieerde offsets, FM 26.3.x):
- Naam, nationaliteit, leeftijd/geboortejaar, lengte, voorkeursvoet
- **CA (huidige punten) en PA (potentiële punten)** — de échte waarden, niet de scout-schatting
- Alle 47 zichtbare + 5 verborgen attributen, posities en geschiktheid
- Transferwaarde, weeksalaris, contracteinddatum, transferlijst-status
- Staf: CA/PA, staf-attributen, geschatte rol

Valuta: FM bewaart waardes/salarissen intern in **Britse ponden (£)**. De app toont £ standaard, met een knop om naar € om te rekenen.

Nog te finetunen (elke ronde met `diagnostics.txt`):
- **Clubnaam**: club-object heeft een indirecte naamstring; de persoon→club-offset wordt via de "CLUB-OFFSET DISCOVERY"-sectie in `diagnostics.txt` exact vastgepind.
- **"Wil naar mijn club" (transferinteresse)**: dit vereist de interesse-clublijst per speler (welke clubs een speler wil). Die offset moet ik nog vinden — komt in een volgende ronde. *"Bij mijn club"* (spelers die nú bij jou spelen) werkt wél.
- **Echte marktwaarde/vraagprijs**: FM slaat vaak `–` op en berekent de waarde live; ik zoek uit waar de berekende waarde staat.
- **Leeftijd** gebruikt de systeemdatum als in-game datum (klopt voor jouw save ~juli 2026); exacte in-game datum lees ik later in.

De plugin schrijft naast `dump.json` ook `diagnostics.txt` (aantallen, offset-histogram, club-discovery) — stuur die na je F9 en ik pin de resterende velden exact.

## Disclaimer

Alleen voor eigen singleplayer-gebruik. De plugin leest alleen data (schrijft niets in de game) en werkt volledig offline.
