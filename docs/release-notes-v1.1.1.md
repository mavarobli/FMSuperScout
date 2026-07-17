# FMSuperScout 1.1.1, release notes

> Gepubliceerd 17-07-2026 als GitHub Release v1.1.1 (assets: FMSuperScout-Setup.exe
> + .sha256). Dit bestand is de bron van de release-tekst.

---

A fix release for the two problems reported this week: very large saves showing an
empty app, and the New data button hanging. Thanks for the reports and the log files,
they made the difference.

## Fixed

- **Huge saves now load.** With 100+ playable leagues a dump grows past 600 MB and
  the app choked on it: endless loading, an empty screen, or a crashed window.
  Loading is rebuilt to handle it (repeated names like clubs and divisions are stored
  once, and the app stays responsive while reading). A 611 MB dump with 635k people
  now loads in about 17 seconds.
- **No more silent empty screen.** If loading fails anyway, the app now says so, with
  the dump size, the error and a Report a problem button. If the app window crashed
  during the previous attempt, the next start explains the likely cause (out of
  memory) and the practical fix: close FM26 first, the dump is already on disk, the
  game is not needed for viewing.
- **New data no longer hangs.** The plugin (now v0.1.35) picks up requests from the
  app on its own thread. In some game sessions the old route never ran, so the app
  waited forever, and F9 was dead in those sessions too. The app also shows a hint
  after 15 seconds if the game does not respond.
- Dumps are a little smaller: an unused field is gone from every player and staff
  record.
- The bug report now includes the dump size on disk and the load error, and
  diagnostics.txt shows player/staff dedup numbers. Makes reports much easier to act
  on.

## Update / install

Download **FMSuperScout-Setup.exe** below and run it, also if you have 1.0.0 or
1.1.0: it updates in place, your shortlist, presets and settings are kept. The plugin
updates automatically, close FM26 before installing. New install? The wizard finds
your FM26 folder and sets up everything. First FM launch after installing takes 1-3
minutes (black console window is normal).

SmartScreen may warn about an unknown publisher, the installer is not code-signed.
Click More info, then Run anyway. Verify the download if you like:

```powershell
Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256
```

Expected SHA-256:

```
2ac543cbbc3cbc32c77b0c46446a315cb065fa20db1d169ea226a2d79e4a1f55
```

VirusTotal scan of this exact file:
https://www.virustotal.com/gui/file/2ac543cbbc3cbc32c77b0c46446a315cb065fa20db1d169ea226a2d79e4a1f55

Full changelog: https://github.com/mavarobli/FMSuperScout/blob/main/CHANGELOG.md
Issues and ideas: https://github.com/mavarobli/FMSuperScout/issues
