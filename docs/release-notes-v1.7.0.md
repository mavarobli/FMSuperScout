# FMSuperScout 1.7.0

**FMSuperScout now runs on the Mac.** Football Manager 27 (Steam), Apple Silicon and Intel.

## Mac

Download `FMSuperScout-Mac.dmg`, open it and drag FMSuperScout to Applications.

- **Its own app**: a window with the FMSuperScout icon, nothing else to install (Node is
  built in).
- **Start Football Manager from the app.** macOS does not let another program read a running
  game unless you lower your Mac's security. So on the Mac, FMSuperScout loads together with
  FM: open Steam, click **Start Football Manager** in the app, load your save and click
  **New data**. Once FM runs you can close and reopen FMSuperScout as often as you like.
- **First launch**: macOS warns that it cannot check the app, because it is not signed with an
  Apple certificate. Open **System Settings → Privacy & Security**, scroll down and click
  **Open Anyway**. You only do this once.
- **Same results as on Windows**: the same scan core, checked on an M1 Mac against the same
  save as on Windows. A full scan takes about 5 seconds.
- No F9 on the Mac (macOS would ask for keyboard-monitoring permission for FM); use
  **New data**.
- Intel Macs: built, not yet tested. Reports are very welcome.

FMSuperScout only reads; it never changes Football Manager, Steam or your saves.

## Windows

No visible changes. The scan core was reorganised to share it with the Mac; we checked that
the output is identical (same save, scanned back to back: 0 differences).

## Documentation

- README and TROUBLESHOOTING: Mac install, first launch, and what to do if FM was started from
  Steam.
- `docs/macos.md`: how the Mac version works and what was measured.
