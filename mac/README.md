# FMSuperScout voor de Mac (in ontwikkeling)

Op de Mac mag een los programma Football Manager niet uitlezen zonder dat je de beveiliging
(SIP) aanpast. Daarom draait FMSuperScout daar ín Football Manager: een kleine module die
meelaadt als je FM via `FMSuperScout.command` start. Hij leest alleen; FM, Steam en je saves
blijven ongewijzigd. Achtergrond en metingen: [docs/macos.md](../docs/macos.md).

## Onderdelen

| Bestand | Wat |
|---|---|
| `MacHost.cs` | De module: wacht op "Nieuwe data" uit de app en scant met dezelfde kern als Windows (`core/`). |
| `../core/MemScan.Mac.cs` | Geheugen lezen (mach), modulekaart (dyld), klassen herkennen op RTTI-naam. |
| `loader/fmss_loader.c` | De lader die meelaadt in FM en de module start (alleen in FM zelf). |
| `FMSuperScout.command` | Start de app en FM met de lader. Steam moet open zijn. |
| `build.sh` | Bouwt en installeert alles vanuit de broncode (testversie). |

## Testen op een Mac (vanuit de broncode)

Vereist: de Xcode-command-line-tools (`xcode-select --install`) en Node.js. De .NET 8 SDK
zet `build.sh` zo nodig zelf in `~/.dotnet`.

```bash
git clone -b mac-support https://github.com/mavarobli/FMSuperScout.git ~/FMSuperScout-src
```

```bash
bash ~/FMSuperScout-src/mac/build.sh
```

Sluit Football Manager, en start dan:

```bash
"$HOME/Library/Application Support/FMSuperScout/mac/FMSuperScout.command"
```

Laad je save en klik in de app op **Nieuwe data**. Het logboek staat in
`~/Library/Application Support/FMSuperScout/mac.log`, de scanuitkomst in `diagnostics.txt`
ernaast (met per klasse wat de module zelf heeft opgemeten).

Bijwerken: `git -C ~/FMSuperScout-src pull` en `build.sh` opnieuw.

## Bouwen zonder Mac

De workflow `.github/workflows/mac.yml` bouwt bij elke wijziging aan `core/`, `mac/` of `app/`
een universele map (Apple Silicon + Intel) als artifact `FMSuperScout-mac`.
