# FMSuperScout voor de Mac

Voor gebruikers: download `FMSuperScout-Mac.dmg` (zie de README in de hoofdmap, sectie *Mac*).
Hoe het werkt en wat er gemeten is: [docs/macos.md](../docs/macos.md).

## Onderdelen

| Bestand | Wat |
|---|---|
| `app/main.swift`, `app/Info.plist` | FMSuperScout.app: eigen venster en icoon om de web-app heen, start de meegeleverde Node-server. |
| `MacHost.cs`, `FMSuperScout.Mac.csproj` | De module in FM (.NET NativeAOT): wacht op "Nieuwe data" en scant met dezelfde kern als Windows (`core/`). |
| `../core/MemScan.Mac.cs` | Geheugen lezen (mach), modulekaart (dyld), klassen herkennen op RTTI-naam. |
| `loader/fmss_loader.c` | De lader die met FM meelaadt en de module start (alleen in FM zelf). |
| `FMSuperScout.command`, `build.sh` | Testopstelling vanuit de broncode, zonder .dmg. |

FM starten met de module gebeurt in `app/server.js` (`/api/start-fm`) of, in de testopstelling,
in `FMSuperScout.command`.

## Bouwen

Alleen op macOS (NativeAOT en Swift kennen geen cross-build vanaf Windows).

- **Downloadpakket**: de workflow `.github/workflows/mac.yml` bouwt bij elke wijziging aan `core/`,
  `mac/` of `app/` een universele `FMSuperScout-Mac.dmg` (Apple Silicon + Intel) als artifact
  `FMSuperScout-mac`, met de officiële Node-build (SHA-256 gecontroleerd), ad-hoc ondertekend.
- **Testopstelling op een Mac**: vereist de Xcode-command-line-tools (`xcode-select --install`)
  en Node.js; de .NET 8 SDK zet `build.sh` zo nodig zelf in `~/.dotnet`.

```bash
git clone -b main https://github.com/mavarobli/FMSuperScout.git ~/FMSuperScout-src
```

```bash
bash ~/FMSuperScout-src/mac/build.sh
```

Open Steam, sluit Football Manager en start:

```bash
"$HOME/Library/Application Support/FMSuperScout/mac/FMSuperScout.command"
```

Logboek: `~/Library/Application Support/FMSuperScout/mac.log` (module) en `server.log` (app);
de scanuitkomst staat in `diagnostics.txt`, met per klasse wat de module heeft opgemeten.
