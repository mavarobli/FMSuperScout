# tools/: kalibratie- en analysescripts

Losse Node-scripts (zero-dep) die de laatst geladen dump uit
`%LOCALAPPDATA%\FMSuperScout\dump.json` inlezen en analyseren. Puur voor onderhoud/herijking;
niet nodig om de app te draaien.

```bash
node tools/<script>.js
```

- **ca-analysis.js**: CA → attribuuttotaal per bucket + regressie. Basis voor de
  `CA_TOTAL_*`-curves in het potentiemodel. Draai opnieuw na een grote FM-patch of nieuwe DB.
- **pos-curve.js**: gemeten attribuutprofiel per positiegroep op CA-ankers (80/110/140/170).
  Genereert de `POS_ATTR_PROFILE`-tabel in `app/app.js` (potentie-projectie).
- **value-calib.js**: vergelijkt de uitgelezen marktwaarde (×1,16 £→€) met in-game
  transferwaarde-bandbreedtes; handmatig een ijkset invullen. Om de waardeschatting te
  controleren.
