# FMSuperScout op macOS: haalbaarheid (november 2026)

Onderzoek naar hoe Mac-gebruikers FMSuperScout met FM27 kunnen gebruiken. **[V]** = geverifieerd
in een bron of de code, **[M]** = gemeten op een echte Mac met FM27, **[A]** = afleiding.

## Gemeten op een Mac (2 november 2026, `tools/mac-diagnose.sh`)

MacBook Pro M1 Pro (16 GB), macOS 27.0, SIP aan, geen Rosetta. FM27 27.0.0.2486716 via Steam.

- **Route A (in-process) kan zonder SIP-aanpassing** [M]. FM27 is door SEGA gesigneerd
  (Developer ID, genotariseerd, hardened runtime) en heeft precies de twee entitlements die
  dat toestaan: `com.apple.security.cs.allow-dyld-environment-variables` en
  `com.apple.security.cs.disable-library-validation`. Een eigen, ad-hoc gesigneerde
  bibliotheek mag dus via `DYLD_INSERT_LIBRARIES` (Steam-startoptie) meeladen.
- **Route B (externe scanner) valt af** [M]: geen `get-task-allow`, dus task_for_pid van
  buitenaf vereist SIP-aanpassing.
- **Opbouw** [M]: bundle-id `com.SportsInteractive.FootballManager27`, programma
  `fm.app/Contents/MacOS/Football Manager 27`, universeel (x86_64 + arm64).
  `Contents/Frameworks/GameAssembly.dylib` (212 MB) en `UnityPlayer.dylib`; de database zit in
  **`Contents/PlugIns/game_plugin.bundle`** (de tegenhanger van `game_plugin.dll`).
- Xcode-command-line-tools zijn aanwezig: de meetmodule kan op de Mac zelf gebouwd worden.

### Meetmodule in FM27 (2 november 2026, `tools/mac-probe/`)

- **Meeladen werkt met SIP aan** [M]: FM gestart vanuit Terminal met `SteamAppId=4530370
  SteamGameId=4530370 DYLD_INSERT_LIBRARIES=… "…/fm.app/Contents/MacOS/Football Manager 27"`
  (Steam open). De Steam-startoptie zelf werkt níet op de Mac (OS error 260/0): Steam start
  de app daar niet via de opdrachtregel. Voor gebruikers wordt dit dus een eigen starter.
- **Lezen binnen het proces is snel en veilig** [M]: 2,9 GB heap in 1,3 s via
  `mach_vm_read_overwrite`, 0 MB onleesbaar.
- **De Mac-build heeft RTTI** [M]: 77 van de top-80 klassen met leesbare naam. Klassen zijn
  dus op naam te herkennen in plaats van op magische offsets — robuuster dan op Windows.
  - `db::ACTUAL_PLAYER` 39.452 objecten, sub-objecten op offset 0, 632 (0x278, met de
    persoonsnamen: indirect +16 volledige naam, genest +32 voornaam, +40 achternaam) en 904.
  - `db::ACTUAL_NON_PLAYER` 24.058 (offsets 0, 248, 520); `db::NON_PLAYING_DATA` 24.196.
  - Verder o.a. `db::CLUB`, `db::TEAM`, `db::COMP`, `db::FULL_CONTRACT`, `db::CITY`,
    `db::STADIUM`, `db::NATIONAL_TEAM`, `db::LOAN_CONTRACT`, `MANAGER_DETAILS`.
- Aantallen komen overeen met Windows op dezelfde save (24.058 vs. 24.057 staf).

### Veldkaart Mac ↔ Windows (gemeten, 2 november 2026)

Objectdumps van Givairo Read, Luciano Valente (spelers), Oscar Moens en Zeb Jacobs (staf) op
dezelfde save als Windows, naast de Windows-waarden gelegd. Alles hieronder klopt byte-exact
(waarde £65.812.584, CA/PA, posities, attributen, persoonlijkheid, geboortedatum, UID,
salaris, contracteinde, clubreputatie) [M].

Het verschil zit alléén in hoe de persoonsobjecten zijn opgebouwd (MSVC vs. Itanium plaatst
de basisklassen anders). De velden zelf liggen in vaste blokken die één-op-één verschuiven:

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

**Ongewijzigd t.o.v. Windows** [M]: `db::FULL_CONTRACT` (team +0x10, salaris +0x20, functie
+0x26, einddatum +0x48), `db::TEAM` (teamtype +0x28, club +0x30, spelerslijst +0x38/+0x40,
competitie +0x50/+0x60, manager +0x80, schema +0xA0, reputatie +0xA8), `db::CLUB` (teams
+0x18/+0x20, naam +0xC0/+0xC8), `db::COMP` (naam +0x40/+0x48), `db::NATION` (UID +0x0C,
naam +0x20). Datums gebruiken dezelfde codering (jaar << 16 | dag-van-jaar).

Klassen worden op de Mac herkend aan hun RTTI-naam in plaats van aan de MSVC-offset-truc.
Nog niet gemeten: de klasse voor spelers die ook staf zijn (Windows 0x380), het menselijke
manager-object (`db::HUMAN_NON_PLAYER` staat in TEAM+0x80) en de in-game datum (TEAM+0xA0 →
+0x94, vrijwel zeker gelijk).

### Stand van de Mac-versie (branch `mac-support`, zie `mac/README.md`)

Gebouwd, nog niet op de Mac getest:
1. **Mac-backend in `core/`**: `MemScan.Mac.cs` naast `MemScan.Win.cs`, met een gedeelde
   `MemScan.cs` en dezelfde `Dumper`. Lezen via `mach_vm_read_overwrite` binnen het proces,
   modulekaart via dyld, klassen op RTTI-naam. De gemeten layouts hierboven staan als vaste
   waarden in de code; de module meet ze bij elke scan ook zelf na (diagnostics: "= gemeten ✓").
   Niet-gemeten klassen (speler-staf, `db::HUMAN_NON_PLAYER`) meet de module zelf op: het
   persoonsfacet is het deelobject waarvan de contractpointer naar een `db::FULL_CONTRACT`
   wijst, de DB-basis het laatste deelobject. Gebouwd met .NET NativeAOT als dylib.
   Op Windows is de uitkomst na de ombouw identiek (zelfde save direct na elkaar gescand:
   40.143 spelers, 24.058 staf, 0 verschillen).
2. **Starter**: `mac/FMSuperScout.command` start de app en FM met de lader
   (`mac/loader/fmss_loader.c`), die de module op een eigen thread start. Geen F9 op de Mac
   (sneltoetsen uitlezen vraagt een macOS-toestemming voor FM); "Nieuwe data" in de app werkt
   via request.flag. De module meldt zich elke 5 s (`mac-agent.json`), zodat de app ziet of FM
   mét of zonder module draait.
3. **Web-app**: datamap, procesdetectie (`pgrep`), venster (Chrome/Edge/Brave als app-venster,
   anders de standaardbrowser), zelf-update alleen op Windows.
4. **Bouwen**: `mac/build.sh` op de Mac zelf, of de workflow `mac.yml` (universeel artifact).

Nog te doen: testen op de MacBook met dezelfde save als Windows (de uitkomst moet gelijk
zijn), de in-game datum controleren, en daarna een downloadbare Mac-uitgave.

## Kort

- De **web-app** is grotendeels platformneutraal; een handvol Windows-afhankelijkheden is in
  2-4 dagen te vervangen (zie "Web-app").
- Het **uitlezen** is het probleem. Een externe scanner zoals op Windows vraagt op de Mac dat
  de gebruiker SIP gedeeltelijk uitzet (Recovery, `csrutil enable --without debug`, op Apple
  Silicon ook "Reduced Security") [V]. Dat is precies waar MacAssistant RT en FMRTE ≤26 op
  vastliepen [V]. Root helpt niet tegen hardened runtime [V].
- **FMRTE 27 werkt op de Mac zónder SIP-aanpassing**: een kleine plugin die het spel zelf bij
  het starten laadt (Steam-startopties, startscript voor Epic, snelkoppeling-app) [V]. Dat is
  het haalbare model voor ons: de scan draait ín het FM-proces, net als de oude BepInEx-plugin
  op Windows.
- De classificatietruc van de scanner (`[vtable-8]` → MSVC-RTTI → offset op +4) bestaat op de
  Mac niet; Itanium heeft offset-to-top op `vtable-16` [V]. De veld-offsets moeten voor de Mac
  opnieuw gepind worden; Intel- en ARM-Mac delen vrijwel zeker één layout [A].

## FM27 op de Mac

- FM27: pc en Mac, via Steam en Epic (Xbox PC-app alleen Windows) [V]. macOS 13-26, Apple M1
  of Intel [V].
- FM26-Mac is Unity IL2CPP: `fm.app/Contents/MacOS/Football Manager 26`, `GameAssembly.dylib`,
  bundle-id `com.SportsInteractive.FootballManager26` [V]. Procesnaam is dus niet `fm` [V];
  voor FM27 verwacht "Football Manager 27" [A]. Hoe de native database (`game_plugin.dll`) op
  de Mac heet, is nergens openbaar gevonden.
- De binary is door SEGA gesigneerd zonder JIT-entitlement; vrijwel zeker hardened runtime [A].

## Opties

| Optie | Werkt? | Gebruiker moet | Ontwikkelwerk | Risico's |
|---|---|---|---|---|
| **A. In-process plugin (FMRTE 27-model)** | Waarschijnlijk; FMRTE bewijst dat injectie met SIP aan kan [V], onze aanpak is ongetest | Eenmalig: installer zet startoptie/script; Gatekeeper "Open Anyway" | 20-35 dagen | Entitlements van FM27 onbekend; game-updates draaien setup terug; per patch twee layouts bijhouden |
| **B. Externe scanner (task_for_pid)** | Ja, mits SIP-debug uit [V] | Recovery + `csrutil`, Reduced Security | 15-25 dagen | Veiligheid, support, toekomst van gedeeltelijke SIP onzeker [V] |
| **C. Parallels + Windows 11 ARM** | Waarschijnlijk; DX11.1 ondersteund [V], geen FM-meldingen gevonden | Betaalde Parallels + Windows, veel RAM | 1-3 dagen (testen, docs) | Prestaties onder x64-emulatie |
| **D. CrossOver (Wine)** | Onzeker: FM26 "Limited Functionality" [V]; ReadProcessMemory in dezelfde bottle werkt volgens de Wine-bron [V] | Betaalde CrossOver, Windows-Steam in een bottle | 2-4 dagen | Speelbaarheid FM27; Rosetta wordt na macOS 27 afgebouwd [V] |
| **E. Alleen viewer op de Mac** | Ja | Een Windows-pc met dezelfde save | 2-4 dagen (= fase 1) | Beperkte waarde |

## Aanbevolen volgorde

1. **Fase 0 (1-2 dagen, met een Mac-tester):** de open vragen hieronder beantwoorden, plus een
   hello-world-dylib via Steam-startopties met SIP aan. Dit beslist of optie A kan.
   Vragen 1-3 beantwoordt `tools/mac-diagnose.sh` (alleen lezen, geen sudo, persoonlijke
   paden worden weggepoetst): FM27 starten met een save, dan `bash mac-diagnose.sh`; de
   uitkomst staat als `fmss-mac-diagnose.txt` op het bureaublad.
2. **Fase 1 (2-4 dagen):** web-app cross-platform. Maakt E mogelijk en C/D documenteerbaar als
   "experimenteel, door de community getest".
3. **Fase 2 (5-8 dagen):** Mac-backend in `core/` achter een abstractie (geheugenbron +
   modulekaart), classificatie via `-[vtable-16]` en waar mogelijk de RTTI-typenaam; eerst
   alleen het class-offset-histogram om de Mac-tegenhangers van 0x288/0x100 te vinden.
   NativeAOT voor osx-arm64 en osx-x64 (geen JIT nodig) [V], samengevoegd tot één dylib.
4. **Fase 3 (8-15 dagen):** Mac-repin (`Fields.FM27Mac`) volgens `docs/repin-guide.md`.
5. **Fase 4 (3-5 dagen):** `.app`-launcher, installer die de startoptie/het script zet (met
   backup, zoals FMRTE), quarantaine verwijderen; notarisatie optioneel (betaald
   Apple Developer-lidmaatschap).

Optie B alleen als terugval als A niet kan.

## Web-app: wat Windows-specifiek is (`app/server.js`)

- Datamap via `LOCALAPPDATA` → op de Mac `~/Library/Application Support/FMSuperScout`
  (dat geeft .NET 8 daar ook voor `LocalApplicationData`) [V].
- Scanner-exe, `windowsHide`, zelf-update via `FMSuperScout-Setup.exe` → op de Mac anders of uit.
- `reg query` voor het spelpad → overslaan (geen BepInEx).
- `tasklist` → `pgrep -x "Football Manager 27"`.
- Venster via `msedge.exe --app` → `open -na "Google Chrome" --args --app=…`, anders `open URL`.
- `installer/FMSuperScout.vbs` → `.command`-script of kleine `.app` met node voor darwin.

## Open vragen (alleen op een echte Mac met FM27 te beantwoorden)

1. `codesign -dv --verbose=4` en `codesign -d --entitlements -` op `fm.app`: hardened runtime,
   `allow-dyld-environment-variables`, `disable-library-validation`, `allow-jit`, `get-task-allow`?
2. `lipo -info` en de inhoud van `Contents/Frameworks` en `Contents/PlugIns`: hoe heet de
   database-module en hoe groot is hij?
3. Exacte procesnaam en bundle-id van FM27.
4. Laadt een ad-hoc gesigneerde dylib via `DYLD_INSERT_LIBRARIES` met SIP aan, native arm64 én
   onder Rosetta?
5. Is de Mac-build met RTTI gecompileerd (leesbare typenaam via `[vtable-8]`)? Welke
   offset-to-top-waarden horen bij speler, staf en manager?
6. Geeft `mach_vm_read_overwrite` op een ongeldig adres netjes een fout, zonder crash?
7. Hoeveel offsets uit `core/Fields.cs` kloppen ongewijzigd?
8. Scansnelheid en geheugengebruik in het proces op een M1 met 8 GB.
9. Parallels: start FM27 onder Windows 11 ARM, en ziet de scanner de modules?
10. CrossOver: speelbaarheid FM27; werken `VirtualQueryEx` en `Process.Modules` in een bottle?

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
