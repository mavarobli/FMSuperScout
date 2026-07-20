# Troubleshooting

The most common issue is "no players loaded". Work through this list top to bottom;
each step tells you what it means if it fails.

## 1. Does a black console window appear when FM26 starts?

That console is the mod layer (BepInEx). No console = the plugin never runs, and
that is almost always the problem.

- **Antivirus removed the loader.** Check your antivirus quarantine for
  `winhttp.dll` in your FM26 folder. Restore it and add the FM26 folder as an
  exclusion. This is by far the most common cause: BepInEx injects via that DLL
  and some scanners flag it. Every FM26 mod that uses BepInEx has this issue.
- **Wrong folder.** Open your FM26 folder (right-click FM26 in Steam > Manage >
  Browse local files) and check that `winhttp.dll` and a `BepInEx` folder sit next
  to `fm.exe`. If not, run the FMSuperScout installer again and point it there.

## 2. Did the first launch finish?

The first FM26 start after installing takes 1-3 minutes longer while the mod layer
generates its bindings. If you killed the game during that, start it again and let
it finish.

## 3. Load a save, then press F9

F9 only works with a save loaded, not on the main menu or during initial game
setup. The app shows a progress bar within a few seconds; a full scan takes about
10-20 seconds.

## 4. Check the data folder

Open `%LOCALAPPDATA%\FMSuperScout\` (paste that in the Explorer address bar):

- **No files at all**: the plugin never ran. Back to step 1.
- **`status.json` says `"state":"error"`**: the scan failed; the file includes the
  reason. Report it (see below) with this file attached.
- **`dump.json` exists but the app shows nothing**: since v1.1.1 the app tells you
  what went wrong on the empty screen (with a Report button). On older versions:
  click the reload button, or check `diagnostics.txt` for `Spelers: 0`.

## 4b. Huge saves (100+ playable leagues)

A fully loaded database (300k+ players) produces a dump of 600+ MB. Since v1.1.1
the app loads those fine (about 15-20 seconds). If the window still crashes while
loading, your PC is out of free memory: close FM26 first (the dump is already on
disk, the game is not needed for viewing) and click Try again.

## 4c. "New data" hangs or FM26 does not respond

Since v1.1.1 the plugin picks up app requests on its own background thread, and
the app shows a hint after 15 seconds if the game does not respond. If that hint
appears: check that a save is loaded, or press F9 in the game; a full FM26 restart
fixes the rare case where the game session ignores hotkeys entirely.

## 5. Game version

The offsets are pinned to FM **26.3.x**. The app shows an amber warning when your
game version differs; after a big FM patch the tool may read garbage or nothing
until it is updated. Check for a newer FMSuperScout release.

## 6. Platform notes

- **Steam**: fully tested.
- **Epic / Xbox Game Pass**: detection is beta. The plugin approach should work,
  but we could not test end to end. Reports (working or not) are very welcome.

## Reporting a problem

Use **Report a problem** in the app (settings menu, or the link on the empty
screen). It opens a GitHub issue with your versions pre-filled. Please attach:

- `%LOCALAPPDATA%\FMSuperScout\diagnostics.txt` and `status.json`
- `BepInEx\LogOutput.log` from your FM26 folder, if it exists

Those three files answer 90% of the questions we would otherwise have to ask.
