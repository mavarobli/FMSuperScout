# FMSuperScout 1.2.0, release notes

> Gepubliceerd 20-07-2026 als GitHub Release v1.2.0 (assets: FMSuperScout-Setup.exe
> + .sha256). Dit bestand is de bron van de release-tekst.

---

The biggest update so far: a shareable player card, development charts, a smarter
transfer filter and one-click updates. Plus a hardening round based on an external
code review. Thanks to everyone who opened GitHub issues and sent feedback in DMs,
several of these came straight from you.

## New

- **Shareable player card.** One click on a player profile saves a PNG in FM's own
  visual language: scout stars for current and potential ability, the full attribute
  grid in FM colours (a wall of green for that one insane regen), best roles, value,
  wage and contract. Wonderkids get a gold card. Made for Reddit and your group chat.
- **Development charts.** Every dump now adds a compact snapshot, and player profiles
  grow CA/PA and value charts over time. Dots mark real changes, tooltips show exact
  numbers per date. Stored delta-only on your own disk (a few MB per season), needs
  dumps from two different in-game dates to appear.
- **Transfer status filter.** The transfer-listed checkbox is now a dropdown: All /
  For sale / For loan / For sale or loan. Loan-listed players show a tag on their
  profile, and players out on loan show in blue in the list with their parent club.
- **Profile as popup.** New setting: open player profiles beside the list (as before)
  or as a centered popup.
- **One-click update.** The update notification now downloads the new installer,
  verifies its SHA-256 against the release and starts it. Nothing installs without
  your click.
- **Separate meta toggle.** Hide CA/PA and hidden characteristics but keep the meta
  score, or the other way around.

## Fixed

- **The "!" bug.** After playing FM for a while, New data could fail with a bare "!":
  browsers throttle background tabs, the app's heartbeat went quiet and the local
  server shut itself down. Fixed on both sides, and if the server really is gone the
  app now says so in plain words.
- **Goalkeepers show "–" for meta** instead of a made-up average, and the stray dots
  behind the shortlist stars on smaller windows are gone.
- **Faster sorting.** Sorting by meta or name on large databases is roughly 10x
  faster. Four untranslated Dutch strings are gone from the English UI, and the "?"
  help texts are now proper in-app tooltips.
- **Hardening round** (thanks to an external code review): the plugin writes dumps
  atomically and the app refuses half-written ones with a clear message; the local
  server rejects requests from other websites (on top of the existing localhost
  pinning); the memory scan caps its RAM use on many-core machines (the likely cause
  of out-of-memory reports on big saves); corrupt browser storage no longer blanks
  the app; the updater gets a network timeout. Full list in the changelog.

## Update / install

Download **FMSuperScout-Setup.exe** below and run it, also if you have an older
version: it updates in place, your shortlist, presets and settings are kept. The
plugin updates automatically, close FM26 before installing. From this version on,
the next update is one click inside the app. New install? The wizard finds your FM26
folder and sets up everything. First FM launch after installing takes 1-3 minutes
(black console window is normal).

SmartScreen may warn about an unknown publisher, the installer is not code-signed.
Click More info, then Run anyway. Verify the download if you like:

```powershell
Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256
```

Expected SHA-256:

```
e2f596522cac984798c63f31b2573151c80933dd87afc0c40b44b0d1006299af
```

VirusTotal scan of this exact file:
https://www.virustotal.com/gui/file/e2f596522cac984798c63f31b2573151c80933dd87afc0c40b44b0d1006299af

Full changelog: https://github.com/mavarobli/FMSuperScout/blob/main/CHANGELOG.md
Issues and ideas: https://github.com/mavarobli/FMSuperScout/issues
