# FMSuperScout

Snelle, accurate scout-tool voor **Football Manager 26** (Windows/Steam). Leest de volledige database van je openstaande save — spelers én staf — inclusief verborgen waarden zoals **CA/PA (huidige en potentiële punten)** en de verborgen persoonlijkheidsattributen.

Twee onderdelen: een kleine **BepInEx-plugin** die in de game meedraait en de database naar JSON dumpt, en een **lokale web-app** waarin je zoekt, filtert en spelers vergelijkt.

## Hoe het werkt

1. **In de game:** de plugin draait mee in FM26. Je haalt data op via de knop **⬇ Nieuwe data** in de web-app, of met **F9** in de game.
2. **De web-app:** dubbelklik `Start FMSuperScout.cmd` → opent op `http://localhost:8765`. Bovenin verschijnt een banner zodra de dump klaar is → klik om te laden (of gebruik **⟳**).

Data staat in `%LOCALAPPDATA%\FMSuperScout\` (`dump*.json` + `diagnostics.txt`).

## Features

**Zoeken & filteren**
- Zoeken op naam of club; filteren op leeftijd, CA, PA, waarde, salaris, nationaliteit
- Posities kiezen op een **klikbaar voetbalveld**
- Filters: EU/EEA · haalbaar · op transferlijst · contract < 6 mnd / < 1 jaar · clubloos · mijn club · interesse ≥ · alleen shortlist
- Sorteerbare, **aanpasbare kolommen**: rechtsklik om te tonen/verbergen, slepen om te herordenen (bewaard per modus)
- Vloeiend met 50.000+ spelers (gevirtualiseerde tabel), dichtklapbare filterbalk

**Spelerprofiel**
- Attributen **exact als in FM** (groepen Technisch/Standaardsituaties/Mentaal/Fysiek/Keepen, keeper-aware), plus **Persoonlijkheid** (verborgen attributen)
- Switch **geschatte potentie** (attributen geprojecteerd op PA)
- Geschatte **marktwaarde als bandbreedte** (reputatie-model)
- **Interesse-inschatting** (zie nauwkeurigheid hieronder)
- Klik op een naam → **gekopieerd** naar klembord voor het FM-zoekscherm

**Shortlist & overig**
- **Shortlist** met één klik (★), eigen tabblad, **CSV-export**
- **Taal NL/EN** en **valuta £/€** in het ⚙ instellingen-menu
- Kop toont je manager + club (klikbaar → filter op eigen club)
- Apart **Staf**-tabblad met staf-attributen, rollenfilter en echte functie

## Structuur

| Map | Inhoud |
|---|---|
| `plugin/` | C#-bron van de BepInEx-plugin + meegeleverde build in `plugin/dist/` |
| `app/` | Lokale web-app (Node, geen dependencies): `server.js`, `index.html`, `app.js`, `style.css` |
| `Start FMSuperScout.cmd` | Start de web-app |
| `Installeer plugin.cmd` | Kopieert `plugin/dist/FMSuperScout.dll` naar de FM26-map (sluit eerst de game) |

> `refs/` (gekloonde referentieprojecten voor het reverse-engineeren) staat in `.gitignore` en is niet nodig voor gebruik — mag je verwijderen.

## Installatie

- **BepInEx 6** (be.738, FM26-communitybuild) is geïnstalleerd in de FM26-map — volledig omkeerbaar, er zijn alleen bestanden *toegevoegd*.
- De plugin staat in `BepInEx/plugins/FMSuperScout.dll`.
- **Plugin bijwerken:** sluit FM26 → dubbelklik `Installeer plugin.cmd` → start FM26.
- De console-popup is uitgezet; logging staat in `BepInEx/LogOutput.log`.

## Verwijderen

Verwijder uit de FM26-map: `BepInEx/`, `dotnet/`, `winhttp.dll`, `doorstop_config.ini`, `.doorstop_version`, `changelog.txt`. De game is dan weer 100% origineel (of: Steam → verify files).

## Nauwkeurigheid

**Rechtstreeks & betrouwbaar uit het geheugen** (geverifieerde offsets, FM 26.3.x):
naam, nationaliteit, geboortejaar, lengte, voorkeursvoet · **CA en PA** (de échte waarden, niet de scout-schatting) · alle zichtbare + verborgen attributen, posities · **persoonlijkheid** (Ambitie, Loyaliteit, Professionaliteit, Druk, Temperament, Sportiviteit, Aanpassing, Controverse) · weeksalaris, contracteinddatum, transferstatus · **huidige club** (via de selectie waarin de speler staat) · club- en spelerreputatie · staf-CA/PA, staf-attributen en echte functie.

**Leeftijd** wordt automatisch berekend: het seizoensjaar wordt afgeleid uit de data (grootste jongste jeugd-cohort + 16). Klopt het net niet, pas dan het **Peiljaar** links aan.

**Schattingen (duidelijk als zodanig gelabeld):**
- **Marktwaarde** — FM slaat de waarde meestal niet op maar berekent 'm live; de app schat op basis van reputatie × CA × leeftijd × contract en toont een bandbreedte.
- **Interesse-inschatting** — heuristiek op basis van clubreputatie (jouw club vs hun club), ambitie/loyaliteit, beschikbaarheid, contract en leeftijd. Geen exacte FM-waarde; reputatie en persoonlijkheid zijn wél FM's dominante factoren, dus indicatief voor je shortlist.

`diagnostics.txt` bevat aantallen, het offset-histogram en per-topspeler club-checks — handig om de afgeleide waarden tegen je echte save te ijken.

## Disclaimer

Alleen voor eigen singleplayer-gebruik. De plugin **leest alleen** (schrijft niets in de game) en werkt volledig offline.
