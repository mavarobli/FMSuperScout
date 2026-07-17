# FMSuperScout 1.1.0, release notes

> Gepubliceerd 17-07-2026 als GitHub Release v1.1.0 (assets: FMSuperScout-Setup.exe
> + .sha256). Dit bestand is de bron van de release-tekst.

---

The first feature update, built largely on launch-week feedback. Thanks for all of
it, keep it coming.

## New

- **Attribute filter.** Filter on any attribute with min/max thresholds, hidden
  characteristics and personality included ("Pace 15+, Consistency 12+"). Click the
  attribute field for the full grouped list or just type to filter it. Rules combine
  with AND, show as removable chips, and are saved in your filter presets.
- **Update notification.** The app now checks for a newer release about once a day
  and shows a dismissible link in the top bar. No auto-install, no tracking, it only
  asks GitHub for the latest version number.
- **Report a problem.** Button in the settings menu (and on the empty screen) that
  opens a GitHub issue with your versions pre-filled. There is also a
  [TROUBLESHOOTING guide](https://github.com/mavarobli/FMSuperScout/blob/main/TROUBLESHOOTING.md)
  covering the common "no players loaded" causes. Short version: if no black console
  window appears when FM starts, your antivirus probably quarantined the BepInEx
  loader (`winhttp.dll`). Restore it and add an exclusion.

## Improved

- Tidier filter sidebar: secondary sections start collapsed (your clicks are
  remembered), section headers show a dot when a filter inside them is active, and
  the three contract checkboxes merged into one dropdown.
- Attributes now sort alphabetically in the app language within each group, the way
  FM itself orders them. Applies to profiles, comparison and the attribute filter.
- Foot and nationality names follow the app language; contract dates show as
  dd-mm-yyyy.
- The hidden-stats toggle now also hides the meta score and asking price everywhere,
  and hidden columns no longer appear in the column picker.

## Update / install

Download **FMSuperScout-Setup.exe** below and run it, also if you have 1.0.0: it
updates in place, your shortlist, presets and settings are kept. New install? The
wizard finds your FM26 folder and sets up everything. First FM launch after
installing takes 1-3 minutes (black console window is normal).

SmartScreen may warn about an unknown publisher, the installer is not code-signed.
Click More info, then Run anyway. Verify the download if you like:

```powershell
Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256
```

Expected SHA-256:

```
c393728e7977338e75b7f49dfa15da66329d53d6b55ec3e6056d2fae042f0c19
```

VirusTotal scan of this exact file:
https://www.virustotal.com/gui/file/c393728e7977338e75b7f49dfa15da66329d53d6b55ec3e6056d2fae042f0c19

Full changelog: https://github.com/mavarobli/FMSuperScout/blob/main/CHANGELOG.md
Issues and ideas: https://github.com/mavarobli/FMSuperScout/issues
