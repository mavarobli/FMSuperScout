# Marktwaarde- en interesse-inschatting

## Marktwaarde (estValue in app/app.js)

FM berekent transferwaarde intern (niet gedocumenteerd) en slaat voor de meeste spelers
`0xFFFFFFFF`/geen waarde op; slechts een handvol spelers heeft een concrete waarde in het
geheugen. Die concrete waarden gebruiken we als ijkpunten.

**Methode:** log-lineaire regressie op de 28 spelers in de dump met een échte FM-waarde.
Voorspellers: verzadigde CA, leeftijd, clubreputatie en ln(resterende contractmaanden).
(PA-koppenruimte en wereldreputatie bleken statistische ruis: sterk gecorreleerd met CA/leeftijd,
coëfficiënt ~0, dus weggelaten.)

**Resultaat (mediane fout ~29%, 82% binnen 50%):**

| Factor | Effect |
|---|---|
| CA | waarde ×1.108 per punt → **verdubbelt elke ~7 CA** |
| Leeftijd | ×0.975 per jaar (plus extra daling boven 31, buiten de ijkrange) |
| Clubreputatie | ×1.075 per 1000 rep (grotere club → hogere waarde) |
| Contractduur | waarde ∝ √maanden; (bijna) transfervrij: extra ×0.7 |

Boven CA 150 loopt de CA-exponent op 20% van de mid-range-helling (verzadiging), anders zou
een CA 196-speler naar miljarden exploderen. Sanity-check top: Mbappé ~£130M, Bellingham ~£124M,
Haaland ~£234M — FM-plausibel. Spelers met een échte opgeslagen waarde tonen die direct
(geen schatting, geen `~`).

Coëfficiënten staan in `VAL_B` in app.js. Meer ijkpunten (spelers met echte waarde uit
andere saves/competities) zouden vooral de extrapolatie naar de top en naar lagere competities
scherper maken.

## Interesse (interestEstimate in app/app.js)

Geen ground-truth in de dump (FM legt geen "interesse"-getal vast), dus dit blijft een
heuristiek. Onderzoek (SI-forum, community) bevestigt de gebruikte factoren als de juiste:
clubreputatie/status, speeltijd-perspectief, loon en persoonlijke ambitie. Van die factoren
zijn in de dump beschikbaar: reputatiekloof (mijn club vs. huidige club én de persoonlijke
status/worldRep van de speler), loon-haalbaarheid (plafond uit de eigen selectie),
beschikbaarheid (listed/te koop/aflopend contract) en leeftijd. Ambitie/loyaliteit/speeltijd
zitten niet in de dump (zie [[dump-fields]]), dus die kunnen we niet meewegen.

Zie ook `docs/fmf-format.md` en het projectgeheugen.
