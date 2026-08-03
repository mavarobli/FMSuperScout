# FMSuperScout 1.4.0, release notes

> Gepubliceerd 03-08-2026 als GitHub Release v1.4.0 (assets: FMSuperScout-Setup.exe
> + .sha256). Dit bestand is de bron van de release-tekst.

---

Two things this release: stability and dollars. The bug reports of the past weeks mostly
pointed at the same family of problems, things that worked on one machine and broke on
another. This release fixes every cause of that we could find, plus the currency people
kept asking for.

## Stability

Found by working through your GitHub reports, the attached logs, and a full review of the
code with exactly those reports in mind:

- **The local server could crash silently** when FM wrote a new dump at the exact moment
  the app was reading the old one. That was the real story behind "Lost connection to the
  local server": the background process simply died. It now survives every file race, and
  one unexpected error can no longer take it down.
- **No more false alarm after a fast scan.** On a small save the scan could finish so
  quickly that the app missed it and put "FM26 is not picking up the request" over a
  perfectly good result. The very first dump on a fresh install now loads automatically
  too. And when the message is real, it links straight to the fix in the troubleshooting
  guide: FM26 sometimes relaunches itself during startup and loses the mod layer on the
  way, and a small `steam_appid.txt` file stops that at the source (section 4d, found in
  issue #7).
- **A half-readable scan can no longer overwrite your good data.** A scan while FM was
  still loading or unloading a save could read only part of the memory and quietly write
  a shrunken dump over a complete one. The plugin now measures what it could not read;
  above 10% it keeps your existing dump and tells you why.
- **A stalled scan is detected.** FM closing or crashing mid-scan used to leave a progress
  bar that never ended. After 15 seconds the app now says the scan stopped.
- **Redirected Windows profiles work.** On corporate or moved user profiles the app and
  the plugin could end up watching two different data folders: F9 worked, the app stayed
  empty forever. They now always agree on the folder.
- **EU detection in nine languages.** Nation names arrive in whatever language your FM
  runs in, and the EU/EEA filter (plus the under-18 transfer rule) only knew Dutch and
  English. Now also German, French, Spanish, Italian, Portuguese, Hungarian and Turkish.
- A stack of smaller ones: a "New data" click could vanish in a rare timing window, a
  full disk or antivirus lock could block every next dump until FM restarted, the reload
  button skipped the crash detector, in-game dates could shift a day for users in the
  Americas, and a few more. Full list in the CHANGELOG.

## New

- **USD.** Settings now offer $ next to £ and €, at FM's own fixed exchange rate
  (£1 = $1.35), checked against the in-game display. Requested on the forum.

The plugin is now v0.1.41 and updates automatically with the installer. Settings and
shortlist are kept, as always: run the setup over your current install, close FM26 first.
