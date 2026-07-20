# Repin-gids: offsets herstellen na een FM-patch

De plugin leest FM's geheugen op vaste plekken (offsets, zie `plugin/Fields.cs`). Een
grote FM-patch (26.3 → 26.4) kan die plekken verschuiven. Symptomen: de app toont de
amberkleurige versiewaarschuwing, en de dump bevat rommel of (bijna) niets. Dit is het
stappenplan om de pinnen te herstellen; met de hints in diagnostics.txt is het meestal
een kwestie van uren, geen dagen.

## Stap 1: dump + diagnostics op de nieuwe versie

Start FM op de nieuwe patch, laad een save, druk F9. Open
`%LOCALAPPDATA%\FMSuperScout\diagnostics.txt`. Omdat de versie afwijkt staat daar nu
een sectie **REPIN-HINTS** met de oude pinnen en de vuistregels, gevolgd door het
class-offset-histogram.

## Stap 2: class-offsets pinnen (Fields.cs bovenaan)

Lees het histogram "Class-offsets (meta+4) met plausibele UID". De patronen die op
26.3 golden en vrijwel zeker terugkomen:

- **Elke class toont als twee pieken exact 0x28 uit elkaar** (bv. 0x288/0x2B0). Neem
  de laagste van het paar.
- **Staf-facet** (`STAFF_OFFSET`, was 0x100): de grootste piek van allemaal, ~aantal
  personen in de database.
- **Pure speler** (`PLAYER_OFFSET`, was 0x288): de tweede grote piek, iets kleiner dan
  de staf-piek.
- **Speler die ook staf is** (`PLAYER_STAFF_OFFSET`, was 0x380): middelgrote piek,
  ~5-10% van de spelerpiek.
- **Human manager** (`HUMAN_MANAGER_OFFSET`, was 0x450): mini-piek, telt je eigen
  managers (meestal 1-2).

Pas de vier constanten aan, bouw, installeer, F9. Check in diagnostics: "Matches per
offset" moet nu weer grote aantallen tonen bij de nieuwe pinnen.

## Stap 3: veld-offsets controleren (CA/PA eerst)

Class-offsets verschuiven vaker dan veld-offsets; vaak ben je nu al klaar. Check de
sample-spelers in diagnostics: kloppen namen, leeftijden, CA/PA, clubs?

- **Rommel-CA/PA** (alles 1 of enorm): `PLAO_CA`/`PLAO_PA` verschoven. Zoek ze terug
  via een bekende speler: CA/PA zijn twee u16's direct naast elkaar; scan het
  spelersblok van een ster (CA hoog, PA hoger) op plausibele paren. De CE-tabellen van
  tdg6661 (bron van de originele pinnen) zijn na een patch meestal snel bijgewerkt;
  overnemen is sneller dan zelf zoeken.
- **Namen kapot**: `PERO_FIRST_NAME`/`PERO_SECOND_NAME` (nested strings) verschoven.
- **Contract/loon kapot**: `PERO_FULL_CONTRACT` of de `CON_*`-offsets.
- **Attributen raar**: `PLAO_ATTRS`-basis verschoven; de waarden staan ×5 opgeslagen,
  dus een bekende Pace 18 zoek je als byte 90.

## Stap 4: sluitstuk

1. `SUPPORTED_MAJOR`/`SUPPORTED_MINOR`/`SUPPORTED_VERSION` in Fields.cs bijwerken.
2. Volledige F9 + steekproef in de app (bekende spelers, clubs, waardes, huurspelers).
3. `npm test` (modeltests) en de app-walkthrough.
4. Nieuwe release bouwen; de update-pill brengt gebruikers vanzelf naar de fix.

## Referentie: wat pint waar

| Constante | Betekenis | Verschuift |
|---|---|---|
| `PLAYER_OFFSET` e.a. (meta+4) | class-herkenning in de scan | vaak |
| `PLAO_*` | spelerblok (CA/PA/attrs/posities/waarde) | soms |
| `PERO_*` | persoonsblok (naam/geboortedatum/contract-ptr) | zelden |
| `CON_*` | contractblok (loon/einddatum/statusflags) | zelden |
| `TEAM_*`/`COMP_*` | team- en competitieketen | zelden |

Onthoud: de diagnostics zijn je vriend. Elke F9 op een kapotte versie is gratis
meetdata, en de scan zelf (vtable-detectie) is patch-bestendig ontworpen.
