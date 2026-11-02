# FMSuperScout op macOS: hoe het werkt en wat er gemeten is

Technische achtergrond bij de Mac-versie (voor gebruikers: README, sectie *Mac*). **[V]** =
geverifieerd in een bron of de code, **[M]** = gemeten op een echte Mac met FM27, **[A]** = afleiding.

## Hoe het werkt

Op de Mac mag een los programma een draaiende game niet uitlezen zonder dat de gebruiker de
beveiliging verlaagt (SIP). Daarom draait de scan op de Mac ín Football Manager, net als de oude
BepInEx-plugin op Windows deed:

1. **FMSuperScout.app** (`mac/app/main.swift`) is een eigen venster om de web-app heen, met de
   meegeleverde Node-server. Bij het openen zet de app de module en de lader klaar in
   `~/Library/Application Support/FMSuperScout/mac`, zonder de quarantainemarkering van de
   download.
2. **Start Football Manager** in de app (`/api/start-fm` in `app/server.js`) start FM27 met
   `DYLD_INSERT_LIBRARIES` naar de lader, `SteamAppId` gezet en Steam open en ingelogd. FM27
   staat dat toe (zie hieronder). Vanuit Steam zelf kan het niet: Steam geeft zo'n instelling
   op de Mac niet door.
3. De **lader** (`mac/loader/fmss_loader.c`) doet alleen iets in FM zelf, start één thread en
   laadt daarin de **module** `fmss_core.dylib` (.NET NativeAOT, `mac/MacHost.cs`; geen JIT, dus
   geen extra entitlement nodig).
4. De module wacht op "Nieuwe data" (request.flag) en scant met dezelfde kern als Windows
   (`core/Dumper.cs`). Lezen gaat via `mach_vm_read_overwrite` (crasht niet op een ongeldig
   adres), regio's via `mach_vm_region`, de modulekaart via dyld (`core/MemScan.Mac.cs`). Elke
   5 s meldt de module zich (`mac-agent.json`), zodat de app ziet of FM mét of zonder module draait.

Klassen worden op de Mac herkend aan hun **RTTI-naam** (Itanium-ABI: offset-to-top op
`[vtable-16]`, type_info op `[vtable-8]`), niet aan de MSVC-offset-truc van Windows. De gemeten
layouts staan als vaste waarden in de code; de module meet ze bij elke scan ook zelf na
(`diagnostics.txt`: "= gemeten ✓"). Klassen zonder vaste waarden meet hij zelf op: het
persoonsfacet is het deelobject waarvan de contractpointer naar een `db::FULL_CONTRACT` wijst, de
DB-basis is het laatste deelobject.

Geen F9 op de Mac: sneltoetsen buiten het eigen venster uitlezen vraagt een macOS-toestemming
(Invoermonitoring) die op naam van FM zou komen te staan.

## Gemeten op een Mac (2 november 2026)

MacBook Pro M1 Pro (16 GB), macOS 27.0, SIP aan, geen Rosetta. FM27 27.0.0.2486716 via Steam.
Gereedschap: `tools/mac-diagnose.sh` en de meetmodule `tools/mac-probe/`.

- **Meeladen kan zonder SIP-aanpassing** [M]. FM27 is door SEGA gesigneerd (Developer ID,
  genotariseerd, hardened runtime) met precies de twee entitlements die dat toestaan:
  `com.apple.security.cs.allow-dyld-environment-variables` en
  `com.apple.security.cs.disable-library-validation`.
- **Een externe scanner valt af** [M]: geen `get-task-allow`, dus task_for_pid van buitenaf
  vereist SIP-aanpassing.
- **Opbouw** [M]: bundle-id `com.SportsInteractive.FootballManager27`, programma
  `fm.app/Contents/MacOS/Football Manager 27`, universeel (x86_64 + arm64).
  `Contents/Frameworks/GameAssembly.dylib` en `UnityPlayer.dylib`; de database zit in
  **`Contents/PlugIns/game_plugin.bundle`** (de tegenhanger van `game_plugin.dll`).
- **Niet via `nohup` of `env` starten** [M]: dat zijn door SIP beschermde systeemprogramma's, en
  macOS wist alle `DYLD_`-variabelen bij alles wat zo'n programma start.
- **Steam moet open en ingelogd zijn** [M], anders sluit FM zichzelf direct weer af.
- **Lezen binnen het proces is snel** [M]: 2,9 GB heap in 1,3 s; een volledige scan (39.587
  spelers, 24.058 staf) in 5,3 s.
- **De Mac-build heeft RTTI** [M]: 77 van de top-80 klassen met leesbare naam, o.a.
  `db::ACTUAL_PLAYER` (39.452), `db::ACTUAL_NON_PLAYER` (24.058), `db::CLUB`, `db::TEAM`,
  `db::COMP`, `db::FULL_CONTRACT`.

## Veldkaart Mac ↔ Windows

Objectdumps van twee spelers en twee stafleden op dezelfde save als Windows, naast de
Windows-waarden gelegd. Alles hieronder klopt byte-exact (waarde, CA/PA, posities, attributen,
persoonlijkheid, geboortedatum, UID, salaris, contracteinde, clubreputatie) [M].

Het verschil zit alléén in hoe de persoonsobjecten zijn opgebouwd (MSVC en Itanium plaatsen de
basisklassen anders). De velden zelf liggen in vaste blokken die één-op-één verschuiven:

| Blok | Windows | Mac (`db::ACTUAL_PLAYER`, 0x3A8 groot, begin S) |
|---|---|---|
| Speler (`PLAO_*`: posities, attributen, CA/PA, reputatie, lengte, waarde) | t.o.v. speler = persoon − 0x288 | **S + (Windows-offset − 8)**: posities S+0x148, CA S+0x25C, PA S+0x25E, waarde S+0x22C |
| Persoon (`PERO_*`: namen, land, persoonlijkheid, geboortedatum, contract) | persoon + offset | **S + 0x278 + (offset − 0x30)**: voornaam S+0x298, contract S+0x2F0 |
| DB-basis (UID, geslachtsbyte) | persoon + 0x0C / + 0x19 | **S + 0x388** + 0x0C / + 0x19 |

| Blok | Windows | Mac (`db::ACTUAL_NON_PLAYER`, 0x228 groot, begin M) |
|---|---|---|
| Staf (`NPLO_*`: CA/PA, stafattributen) | t.o.v. staf = persoon − 0x100 | **M + zelfde offset** (CA M+0xDA, attributen M+0x10…) |
| Persoon (`PERO_*`) | persoon + offset | **M + 0xF8 + (offset − 0x30)** |
| DB-basis (UID, geslacht) | persoon + 0x0C / + 0x19 | **M + 0x208** + 0x0C / + 0x19 |

Door de module zelf opgemeten en bevestigd [M]:

| Klasse | Persoonsfacet | DB-basis | Blok |
|---|---|---|---|
| `db::ACTUAL_PLAYER_AND_NON_PLAYER` (speler-coach, 135) | 0x370 | 0x480 | speler, S − 8 |
| `db::HUMAN_NON_PLAYER` (menselijke manager) | 0x438 | 0x548 | staf, H + 0 |

**Ongewijzigd t.o.v. Windows** [M]: `db::FULL_CONTRACT` (team +0x10, salaris +0x20, functie
+0x26, einddatum +0x48), `db::TEAM` (teamtype +0x28, club +0x30, spelerslijst +0x38/+0x40,
competitie +0x50/+0x60, manager +0x80, schema +0xA0 → in-game datum +0x94, reputatie +0xA8),
`db::CLUB` (teams +0x18/+0x20, naam +0xC0/+0xC8), `db::COMP` (naam +0x40/+0x48), `db::NATION`
(UID +0x0C, naam +0x20). Datums gebruiken dezelfde codering (jaar << 16 | dag-van-jaar).

Uitkomst op dezelfde save als Windows: staf, speler-coaches, club, clubreputatie en datum
identiek [M].

## Na een FM-patch

1. Scan en kijk in `diagnostics.txt` onder "Mac: persoonsklassen": staat er bij
   `db::ACTUAL_PLAYER` en `db::ACTUAL_NON_PLAYER` nog "= gemeten ✓"? Dan klopt de opbouw nog.
2. Zo niet: de meting ernaast geeft de nieuwe facet- en DB-offsets; pas de tabel `Measured` in
   `core/MemScan.Mac.cs` aan.
3. Verschuiven velden binnen de blokken, dan geldt dat op Windows ook: zie `docs/repin-guide.md`.
   Met `tools/mac-probe/` zijn objecten van met naam genoemde personen te dumpen.

## Vooronderzoek (vóór de bouw)

Onderzochte routes, met de keuze voor A:

- **A. In de game laden** (zoals FMRTE 27 op de Mac doet [V]): werkt met SIP aan, want FM27 heeft
  de entitlements daarvoor [M]. Gekozen.
- **B. Externe scanner** (task_for_pid): vereist dat de gebruiker SIP gedeeltelijk uitzet via
  Recovery [V]; daar liepen MacAssistant RT en FMRTE ≤26 op vast [V]. Afgevallen.
- **C. Parallels / D. CrossOver**: Windows-versie onder emulatie. Betaald, zwaar, en voor FM27
  ongetest [V]. Niet nodig gebleken.
- **E. Alleen de viewer op de Mac**: werkt, maar vraagt een Windows-pc met dezelfde save.

Ondertekening: de app is ad-hoc ondertekend, zonder naam. Ondertekenen met een persoonlijk Apple
Developer-account zou de volledige naam van de ontwikkelaar in elke download zetten; daarom niet.
Gevolg: gebruikers kiezen bij de eerste start eenmalig "Open toch" in Systeeminstellingen.

## Bronnen

- FM27-platforms: https://realsport101.com/article/football-manager-27-platforms-where-can-you-play-fm27 ·
  https://www.fanatical.com/en/game/football-manager-27 · https://www.fdaytalk.com/fm-27-system-requirements/
- FM26-Mac-build (crashlog, SIP-advies): https://sortitoutsi.net/content/77878/bepinex-6-be-unity-il2cpp-macos-intel-apple-silicon ·
  https://github.com/DadMych/fm26-player-export-macos
- FMRTE op de Mac: https://www.fmrte.com/ · https://docs.fmrte.com/getting-started/load-game/mac/ ·
  https://docs.fmrte.com/help/troubleshooting/ · https://www.fmrte.com/blogs/entry/3-macos-unable-to-open-process/
- MacAssistant RT / FM Live Editor: https://www.fmscout.com/q-20746-MacAssistant-RT-IMPORTANT-INFORMATION.html ·
  https://www.fmscout.com/q-34584-FM-Live-editor-Mac-version.html?p=310361
- macOS-beveiliging: https://developer.apple.com/forums/thread/701647 · https://github.com/rezdm/pex/issues/97 ·
  https://eclecticlight.co/2024/08/21/controlling-system-integrity-protection-using-csrutil-a-reference/ ·
  Apple-entitlements `com.apple.security.cs.debugger`, `allow-dyld-environment-variables`, `allow-jit`
- ABI: https://itanium-cxx-abi.github.io/cxx-abi/abi.html · http://www.openrce.org/articles/full_view/23 ·
  https://developer.apple.com/documentation/xcode/writing-arm64-code-for-apple-platforms
- Wine/CrossOver/Parallels: https://raw.githubusercontent.com/wine-mirror/wine/master/server/mach.c ·
  https://www.codeweavers.com/compatibility/crossover/football-manager-26 · https://kb.parallels.com/129497
- .NET: https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/ ·
  https://learn.microsoft.com/en-us/dotnet/core/compatibility/core-libraries/8.0/getfolderpath-unix
