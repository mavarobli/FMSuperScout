# .fmf shortlist-formaat: onderzoeksbevindingen

Doel: FMSuperScout-shortlists exporteren als `.fmf` die FM26 rechtstreeks kan inladen
(in plaats van CSV). Status: **nog niet haalbaar** met de huidige info. Hieronder wat we weten.

## Containerstructuur (ontcijferd)

Voorbeeldbestand `TEST.fmf` (521 bytes, 1 speler) is een SI-resource-archief:

```
offset 0 : 02 01                     versie/vlaggen ("97% van .fmf begint met 02 01")
offset 2 : "afe."                    dataregio-tag (archive front end)
...      : per-bestand payloads       (image.img, TEST.slf, _data/details.aom)
offset389: "fmf."                    index-tag
offset396: 28 b5 2f fd ...           zstd-frame = de index (decomprimeert schoon)
```

De **index** decomprimeert probleemloos met standaard zstd en bevat:
- root "TEST", 2 children
- `image.img`, `TEST.slf` (de eigenlijke shortlist), `_data/details.aom`
- per bestand: naam, extensie, offset/grootte-velden en een timestamp-achtige trailer.

## Waarom export (nog) niet lukt

De **payloads** in de `afe.`-regio zijn NIET met standaard codecs te lezen:
- Brute-force over inflate/inflateRaw/gunzip/brotli/zstd op elk startpunt: geen enkele
  echte match (alleen één 11-byte false-positive).
- Entropie ~7.1 bits/byte: SI-eigen codec of versleuteling.

Dit klopt met wat de community meldt: `.fmf` is een gesloten SI-formaat dat je alleen met
de meegeleverde **Football Manager Resource Archiver** (Steam-tool) kunt openen/maken.
Zonder die codec + het interne `.slf`-schema kunnen we geen bestand maken dat FM accepteert,
en we kunnen het resultaat hier ook niet in de game verifiëren.

## Wat dit zou deblokkeren

1. **Meerdere sample-shortlists** uit FM (bv. 1, 3 en 10 spelers, en dezelfde 3 spelers in
   twee volgordes). Door de payloads te diffen is het `.slf`-schema (waarschijnlijk een lijst
   van unieke speler-ID's) en de codec te reverse-engineeren. Onze dump bevat de echte
   FM-unieke ID's (`player.id`), dus als het schema bekend is, kunnen we ID's schrijven.
2. Of: de payload-codec identificeren via de Resource Archiver / GameAssembly-symbolen.

Tot die tijd blijft CSV-export beschikbaar. Zie [[dump-fields]] en het projectgeheugen.
