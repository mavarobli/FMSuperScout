# Marktwaarde- en interesse-inschatting

## Groeiende ijkset (automatisch)

De server bewaart bij elke geladen dump de spelers met een échte in-game waarde in
`%LOCALAPPDATA%\FMSuperScout\value-history.json` (dedup op speler-id, laatste waarneming wint,
mét speeldatum). Zo groeit de kalibratieset vanzelf over saves/seizoenen/competities heen, zonder
handwerk. Uitlezen kan via `GET /api/value-history?full=1`. Dit is de bron om het reputatie-
schatmodel later te herijken (en om exacte fixtures voor de tests te maken - zie `test/README.md`).

## Update: reputatie-gedreven model

Na meer echte bedragen (o.a. mid-range spelers zoals Bidstrup €17M, Beukema €14M) bleek het
CA-gedreven model de mid-range fors te overschatten (Bidstrup kwam op €62M). Analyse van de data:
**FM-waarde volgt vooral de wereldreputatie (faam), niet CA** - twee spelers met dezelfde reputatie
zijn ~even veel waard. CA en reputatie zijn zo sterk gecorreleerd dat CA meenemen de regressie
onstabiel maakt (coëfficiënten klappen tussen fits van CA-zwaar naar reputatie-zwaar). Daarom nu:
**reputatie (met verzadiging boven ~7500) + leeftijd + contractduur + lichte jeugdcorrectie, zonder CA.**
Resultaat: mid-range klopt (Bidstrup £17M, Beukema £14M), top getemperd (Haaland ~£280M vs €274M).
Beperking: sterke speler met lage faam wordt eerder onderschat. De écht accurate route is de waarde
uit het geheugen lezen (GenieScout doet dat via een memory-agent) - zie `backlog.md`.

## Marktwaarde (estValue in app/app.js) - historisch (CA-gedreven, vervangen)

FM berekent transferwaarde intern (niet gedocumenteerd) en slaat voor de meeste spelers
`0xFFFFFFFF`/geen waarde op; slechts een handvol spelers heeft een concrete waarde in het
geheugen. Die concrete waarden gebruiken we als ijkpunten.

**Methode:** log-lineaire regressie op **43 volwassen spelers** met een échte FM-waarde: de
dump-opgeslagen waarden (mid-range) plus bekende sterren waarvan de waarde uit in-game
screenshots is afgelezen (top-range, €→£ via 1,16). Zo dekt de ijking het hele bereik.
Voorspellers: **verzadigde CA + wereldreputatie (faam) + clubreputatie + ln(contractmaanden)**.

Belangrijk inzicht uit de screenshots: aan de top **verzadigt** de waarde sterk. Tussen CA 165
en 196 beweegt de waarde nauwelijks (£160-240M), want daar telt reputatie/faam, niet CA. Een
pure CA-exponentiaal explodeerde daardoor (CA 196 → miljarden); vandaar de verzadigingsknik en
`worldRep` als aparte term.

**Resultaat (volwassen spelers: mediane fout ~24%, 86% binnen 50%):**

| Factor | Effect |
|---|---|
| CA | ×1.11 per punt tot 150; daarboven nog maar 15% van die helling (verzadiging) |
| Wereldreputatie | ×1.09 per 1000 (scheidt "beroemde CA170" van "obscure CA170") |
| Clubreputatie | ×1.14 per 1000 |
| Contractduur | waarde ∝ √maanden; (bijna) transfervrij: extra ×0.7 |
| Leeftijd | >29 aflopende korting; ≤23 krijgt deel van de PA-koppenruimte als extra "ability" |

Sanity-check top (gekalibreerd): Haaland ~£350M, Mbappé ~£228M, Pedri ~£212M, orde van grootte
klopt (echte waarden £236M/£185M/£187M). Spelers met een échte opgeslagen waarde tonen die direct.

**Tieners zijn een uitzondering.** Hun waarde hangt in FM af van potentie én hype/reputatie die we
niet betrouwbaar kunnen uitlezen: twee 16-jarigen met identieke CA/PA kunnen £1M vs £40M waard zijn.
De schatting voor ≤20-jarigen is daarom grof en krijgt een bredere bandbreedte (±55%).

Coëfficiënten staan in `VAL_B` in app.js. Nog meer ijkpunten (vooral echte tienerwaarden en
lagere competities) zouden de randen verder aanscherpen.

## Vraagprijs / transfersom (feeMultiplier in app/app.js)

Schat wat **jouw club** waarschijnlijk betaalt (waarde × opslag). Kernprincipes:

- **Verkoopbereidheid domineert, stapelt niet.** Een gelist(t)e speler gaat rond of onder de
  waarde weg (×0.35-1.0, korter contract → lager), óók met een lang contract; de contractpremie
  vervalt dan. Vrijgegeven (set for release) ≈ weggeefprijs (×0.2). Eerder werd ×0.85 bovenop
  de contractpremie gezet, waardoor gelist(t)e spelers alsnog ~1.6× de waarde "kostten".
- **Contractpremie vlakker** (max ×1.9 i.p.v. ×2.2) - de schatting was structureel te hoog.
- **Koper-afhankelijk ("big club tax").** Verkopers vragen meer aan een grotere club en nemen
  genoegen met minder van een kleinere: factor ×0.85-1.35 op basis van het reputatieverschil
  tussen mijn club (`meta.myClubRep`) en de verkopende club. De vraagprijs verschilt dus per
  save/club waarmee je speelt.
- **Squad-status-proxy via loonrang.** Exacte squad-status zit niet in de dump, maar de
  loonrang binnen de verkopende club wel af te leiden: top-2-verdiener ≈ sterspeler (×1.2),
  onderste 40% ≈ randspeler (×0.9). Alleen bij clubs met ≥8 spelers met bekend loon.
- **Niet te koop** blijft fors duurder (×1.7, plafond ×3.5); leeftijd/wonderkind-correcties
  ongewijzigd.

IJkpunt: Cho Wi-Je (waarde £1M, betaald £1.8M) komt met een gemiddeld contract en een grotere
kopende club op ~×1.6-1.9 uit. Niet te vangen blijft: concurrerende biedingen, budgetten en
onderhandelingsdynamiek - het blijft een indicatie, het profiel toont daarom een bandbreedte.

## Interesse (interestEstimate in app/app.js)

Geen ground-truth in de dump (FM legt geen "interesse"-getal vast), dus dit blijft een
heuristiek. Onderzoek (SI-forum, community) bevestigt de gebruikte factoren als de juiste:
clubreputatie/status, speeltijd-perspectief, loon en persoonlijke ambitie. Van die factoren
zijn in de dump beschikbaar: reputatiekloof (mijn club vs. huidige club én de persoonlijke
status/worldRep van de speler), loon-haalbaarheid (plafond uit de eigen selectie),
beschikbaarheid (listed/te koop/aflopend contract) en leeftijd. Ambitie/loyaliteit/speeltijd
zitten niet in de dump (zie [[dump-fields]]), dus die kunnen we niet meewegen.

Zie ook `docs/fmf-format.md` en het projectgeheugen.
