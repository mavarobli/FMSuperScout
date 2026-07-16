# FMSuperScout 1.0.0, release notes

> Gepubliceerd 15-07-2026 als GitHub Release v1.0.0 (assets: FMSuperScout-Setup.exe
> + .sha256). Dit bestand is de bron van de release-tekst; alles onder de streep
> is de gepubliceerde inhoud.

---

**FMSuperScout** is a free, open-source scouting tool for Football Manager 26.
Press **F9** in-game and browse your entire loaded database (45k+ players) in a
fast local web app. Filter by position, division, wage, contract or transfer
value, compare players FM-style, and find wonderkids.

Everything runs locally. No account, no uploads, no telemetry. The tool reads
your own running game's memory, the same crash-safe approach known FM editors
use, and writes a JSON file to your disk. That's it.

## Install

1. Download **FMSuperScout-Setup.exe** below and run it.
2. The wizard auto-detects your FM26 folder (Steam incl. extra libraries, Epic,
   Xbox/Game Pass) and installs the viewer, BepInEx 6 and the plugin. Already
   have BepInEx for another mod? It stays untouched, only the plugin DLL is added.
3. Start FM26. The first launch takes 1-3 minutes longer and shows a black
   console window. That's normal: the mod layer is generating its bindings.
4. Load your save, press **F9**, and open FMSuperScout from the Start menu.

## SmartScreen / antivirus

The installer isn't code-signed yet, certificates are pricey for a free tool.
SmartScreen will warn about an "unknown publisher": click **More info → Run
anyway**. Your antivirus may also flag BepInEx (`winhttp.dll`). That's the
standard FM26 mod loader, the same one behind the popular mods on Thunderstore.

Verify your download if you like:

```powershell
Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256
```

Expected SHA-256:

```
586b3a9225a5f6e38df751ca0fdf34cfec61cc9d648d27a2539e34003fc9bef3
```

VirusTotal scan of this exact file:
https://www.virustotal.com/gui/file/586b3a9225a5f6e38df751ca0fdf34cfec61cc9d648d27a2539e34003fc9bef3

Full source, including the installer build script, is in this repo. Audit or
build it yourself if you prefer.

## Requirements & known limitations

- Windows 10/11, FM26 for PC. Offsets are pinned on game version 26.3.x; the
  app warns if your version differs.
- Steam installs are fully tested. Epic and Xbox/Game Pass detection is beta,
  we couldn't test end-to-end on those platforms. Reports welcome.
- Women's football is not loaded (keeps scans fast).
- The in-game date in the header is anchored to fixtures and can lag up to ~2
  weeks during winter/summer breaks. Cosmetic only.
- Not affiliated with Sports Interactive or SEGA.

## Feedback

Issues and ideas: https://github.com/mavarobli/FMSuperScout/issues
