# FMSuperScout 1.0.0 — release notes (concept voor de GitHub Release)

> Concept. Vóór publicatie: (1) checksum verifiëren tegen de definitieve build,
> (2) de exe door VirusTotal halen en de scanlink invullen, (3) na Marks akkoord
> publiceren met `dist/FMSuperScout-Setup.exe` + `.sha256` als assets.

---

**FMSuperScout** is a free, open-source scouting tool for Football Manager 26.
Press **F9** in-game and browse your entire loaded database — 45k+ players — in a
fast local web app: filter by position, division, wage, contract, transfer value,
compare players FM-style, estimate transfer interest, and find wonderkids.

Everything runs **100% locally**. No account, no uploads, no telemetry: the tool
reads your own running game's memory (the same crash-safe approach used by
well-known FM editors) and writes a local JSON file. Nothing leaves your PC.

## Install

1. Download **FMSuperScout-Setup.exe** below and run it.
2. The wizard auto-detects your FM26 folder (Steam — all libraries — plus Epic
   and Xbox/Game Pass) and installs the viewer, BepInEx 6 and the plugin.
   Already have BepInEx (e.g. for the AI Dialogue mod)? It is left untouched —
   only the plugin DLL is added.
3. Start FM26. **The first launch takes 1–3 minutes longer** (a black console
   window is normal — the mod layer is generating its bindings).
4. Load your save, press **F9**, and open FMSuperScout from the Start menu.

## A note on Windows SmartScreen / antivirus

The installer is currently **not code-signed** (signing certificates are pricey
for a free tool). Windows SmartScreen may warn about an "unknown publisher" —
click **More info → Run anyway**. Your antivirus may also flag **BepInEx**
(`winhttp.dll`): that is the standard, widely-used FM26 mod loader (the same one
behind the popular FM26 mods on Thunderstore), not malware.

Verify your download (PowerShell):

```powershell
Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256
```

Expected SHA-256:

```
586b3a9225a5f6e38df751ca0fdf34cfec61cc9d648d27a2539e34003fc9bef3
```

VirusTotal scan of this exact file: *(link invullen vóór publicatie)*

The full source — including the installer build script — is in this repository,
so you can audit or build everything yourself.

## Requirements & known limitations

- Windows 10/11, FM26 for PC (offsets pinned on game version **26.3.x**; the app
  shows a warning if your game version differs).
- Steam installs are fully tested. **Epic and Xbox/Game Pass detection is beta**
  — the installer finds them via the launcher manifests / XboxGames folder, but
  we could not test end-to-end on those platforms. Reports welcome!
- Women's football is not loaded (by design, keeps scans fast).
- The in-game date shown in the header is anchored to fixtures and can lag up to
  ~2 weeks during winter/summer breaks (cosmetic only).
- Not affiliated with Sports Interactive or SEGA.

## Roadmap / feedback

Issues and ideas: https://github.com/mavarobli/FMSuperScout/issues
