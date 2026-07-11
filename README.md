# FMSuperScout

Snelle, accurate scout-tool voor **Football Manager 26** (Windows/Steam). Leest de volledige database van je openstaande save — spelers én staf — inclusief verborgen waarden zoals **CA/PA (huidige en potentiële punten)**, transferinteresse, vraagprijs en salariseis.

## Hoe het werkt

1. **In de game (eenmalig per sessie):** een kleine BepInEx-plugin draait mee in FM26. Druk op **F9** om de complete database naar een JSON-bestand te dumpen (`%LOCALAPPDATA%\FMSuperScout\`).
2. **De scout-app:** dubbelklik `Start FMSuperScout.cmd` → opent in je browser op `http://localhost:8765`. Klik **⟳ Verversen** om de nieuwste dump te laden.

## Features

- Zoeken op naam, filteren op positie, leeftijd, CA, PA, vraagprijs, salariseis, nationaliteit, club/competitie
- Filters: *wil naar mijn club*, *op transferlijst*, *te huur*, *aflopend contract*, *transfervrij*
- Sorteerbare kolommen, vloeiend met 50.000+ spelers (gevirtualiseerde tabel)
- Detailpaneel met alle attributen (kleurgecodeerd), contract- en transferinfo
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

Nog te finetunen in v0.2 (na de eerste echte dump, met `diagnostics.txt`):
- **Clubnaam** is nu best-effort (meerdere offset-kandidaten met naam-validatie). Als een club leeg/fout is, pin ik het exacte offset uit de diagnostics.
- **"Wil naar mijn club"** en **exacte vraagprijs/salariseis** vereisen de manager-context; die haal ik in v0.2 uit dezelfde dump. Nu toont de kolom transferlijst-status; `askingPrice` = transferwaarde als benadering.
- **Leeftijd** gebruikt nu de echte systeemdatum als in-game datum (klopt voor jouw save ~juli 2026); exacte in-game datum lees ik in v0.2 in.

De plugin schrijft naast `dump.json` ook `diagnostics.txt` (aantallen, offset-histogram, voorbeeldspelers) — stuur die na je eerste F9 en ik pin de laatste velden exact.

## Disclaimer

Alleen voor eigen singleplayer-gebruik. De plugin leest alleen data (schrijft niets in de game) en werkt volledig offline.
