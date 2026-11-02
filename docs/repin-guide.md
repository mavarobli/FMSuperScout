# Repin-gids: offsets herstellen na een FM-patch

De scanner leest FM's geheugen op vaste plekken (offsets, zie `core/Fields.cs`: één
layout per FM-versie). Een grote FM-patch (27.0 → 27.1) of een nieuwe editie (FM28) kan
die plekken verschuiven. Symptomen: de app toont de
amberkleurige versiewaarschuwing, en de dump bevat rommel of (bijna) niets. Dit is het
stappenplan om de pinnen te herstellen; met de hints in diagnostics.txt is het meestal
een kwestie van uren, geen dagen.

## Stap 1: dump + diagnostics op de nieuwe versie

Start FM op de nieuwe patch, laad een save, en draai `scanner/dist/FMSuperScout.Scanner.exe scan`
(of druk F9 met de app open). Geen game-herstart of mod-laag nodig. Open
`%LOCALAPPDATA%\FMSuperScout\diagnostics.txt`. Omdat de versie afwijkt staat daar nu
een sectie **REPIN-HINTS** met de oude pinnen en de vuistregels, gevolgd door het
class-offset-histogram.

## Stap 2: class-offsets pinnen (core/Fields.cs)

Een nieuwe editie krijgt een eigen layout met alleen de afwijkende velden, plus een regel in
`Fields.ForVersion`. Zo ging FM27 (alleen de manager-offset week af):

```csharp
public static readonly Fields FM27 = FM26.With(f =>
{
    f.Game = "FM27"; f.SupportedMajor = 27; f.SupportedMinor = 0;
    f.HUMAN_MANAGER_OFFSET = 0x440;
});
```

Een patch binnen dezelfde editie: pas de waarden van die layout aan.

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

Pas de vier offsets aan, `dotnet build scanner -c Release`, scan opnieuw. Check in diagnostics: "Matches per
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

1. `SupportedMajor`/`SupportedMinor` van de layout in core/Fields.cs bijwerken.
2. Volledige scan + steekproef in de app (bekende spelers, clubs, waardes, huurspelers).
   Leg een selectiescherm uit FM naast de app: leeftijd, contract, nationaliteit en salaris
   (FM toont euro's; de dump is GBP, factor ≈1,16) moeten exact kloppen. Vergelijk ook de
   veldstatistieken met een vorige editie: attribuutprofielen per positie (GK/ST/DC) horen
   hetzelfde patroon te hebben.
3. `npm test` (modeltests) en de app-walkthrough.
4. Nieuwe release bouwen; de update-pill brengt gebruikers vanzelf naar de fix.

## Referentie: wat pint waar

| Constante | Betekenis | Verschuift |
|---|---|---|
| `PLAYER_OFFSET` e.a. (meta+4) | class-herkenning in de scan | vaak (FM27: alleen manager) |
| `PLAO_*` | spelerblok (CA/PA/attrs/posities/waarde) | soms |
| `PERO_*` | persoonsblok (naam/geboortedatum/contract-ptr) | zelden |
| `CON_*` | contractblok (loon/einddatum/statusflags) | zelden |
| `TEAM_*`/`COMP_*`/`CLUB_*` | team-, club- en competitieketen | zelden |

Onthoud: de diagnostics zijn je vriend. Elke F9 op een kapotte versie is gratis
meetdata, en de scan zelf (vtable-detectie) is patch-bestendig ontworpen.
