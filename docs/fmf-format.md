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

## Definitieve conclusie (na 3 extra samples: test1=1 speler, test2=2, test3=3)

Met samples van oplopende grootte is het formaat nu vér genoeg ontleed om een harde
conclusie te trekken:

- **`.slf` = kop + 4 bytes per speler.** De index-groottes groeien exact +4 bytes per
  extra speler (uncompressed 84→88→92, compressed 31→35→39 voor 1→2→3 spelers). Dat is
  één `uint32` speler-ID per shortlist-item. Het schema is dus opgelost.
- **De index is publieke zstd** (98% identiek tussen bestanden), daarom leest die wél.
- **De payloads zijn versleuteld met een per-bestand willekeurige nonce.** Bewijs: alle drie
  de shortlists bevatten dezelfde standaard-afbeelding (`image.img`), maar die bytes zijn in
  elk bestand totaal verschillend; slechts 15% van de dataregio komt overeen en dat is enkel
  de framing/lengte-kop. Identieke input → verschillende output = versleuteling, geen compressie.

**Gevolg: een geldige `.fmf` schrijven is niet haalbaar.** Meer samples helpen niet meer —
de sleutel zit in `GameAssembly.dll` en is niet uit ciphertext af te leiden. De enige echte
route zou zijn: de encryptie-routine + sleutel uit de game-binary halen (grote, aparte RE-klus,
niet te verifiëren zonder de game), of SI's eigen Resource Archiver aanroepen.

Praktisch alternatief om spelers te delen: de leesbare export (naam/club/positie) waarmee je
ze via FM-zoeken weer toevoegt. Zie [[dump-fields]] en het projectgeheugen.
