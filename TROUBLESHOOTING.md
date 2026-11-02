# Troubleshooting

Since 1.6.0 FMSuperScout reads Football Manager from the outside with a small scanner
(`FMSuperScout.Scanner.exe`). Nothing is installed into your game folder, so the old
BepInEx problems (antivirus on `winhttp.dll`, the slow first launch, F9 going dead after
FM relaunched itself) are gone. Still stuck? Start at step 1 and work down.

## 1. Is Football Manager running with a save loaded?

The scanner reads the save that is open in the game. On the main menu or during game
setup there is nothing to read. Load your save, then click **New data** or press **F9**.
A full scan takes about 5-20 seconds depending on how many leagues are loaded.

## 2. "Football Manager is not picking up the request"

The request from the app is handled by a small watcher that starts with the app. If the
app shows this hint after 15 seconds:

- **Antivirus quarantined the scanner.** Check your antivirus quarantine for
  `FMSuperScout.Scanner.exe` (in the FMSuperScout install folder). Restore it and add the
  folder as an exclusion. Reading another program's memory is exactly what scouting tools
  do, and some scanners flag it.
- **Restart the app.** Closing and reopening FMSuperScout starts a fresh watcher.
- **Check the log.** `%LOCALAPPDATA%\FMSuperScout\scanner.log` shows every request and
  scan, with the reason when one fails.

## 3. Check the data folder

Open `%LOCALAPPDATA%\FMSuperScout\` (paste that in the Explorer address bar):

- **`status.json` says `"state":"error"`**: the scan failed; the file includes the
  reason. Report it (see below) with this file attached.
- **`dump.json` exists but the app shows nothing**: the app tells you what went wrong on
  the empty screen (with a Report button). Also check `diagnostics.txt` for `Spelers: 0`.

## 4. Huge saves (100+ playable leagues)

A fully loaded database (300k+ players) produces a dump of 600+ MB. The app loads those fine
(about 15-20 seconds). If the window crashes while loading, your PC is out of free memory:
close Football Manager first (the dump is already on disk, the game is not needed for
viewing) and click Try again.

## 5. "The scan could not read X% of FM's memory"

Windows is low on memory while FM holds a large save. The scan reads live and automatically
retries from a frozen snapshot when it misses too much; if you still see this error, the
machine genuinely ran out of committable memory. Close other apps, make sure your Windows
page file is system managed on a drive with free space, or reboot. `scanner.log` prints the
free memory at each scan (`Geheugen: ... MB fysiek vrij`), which tells you how tight it is.

## 6. Game version

FMSuperScout knows the memory layout of **FM27 (27.0)** and **FM26 (26.3)**. The app shows
an amber warning when your game version differs; after a big FM patch the tool may read
garbage or nothing until it is updated. Check for a newer FMSuperScout release.

## 7. Platform notes

- **Steam**: fully tested.
- **Epic / Xbox Game Pass**: the scanner does not depend on the store, so these should work;
  we could not test them end to end. Reports (working or not) are very welcome.

## Coming from 1.5.0 or older (FM26 with the BepInEx plugin)

The plugin is no longer needed: the scanner reads FM26 too. An installed plugin keeps
working: when FMSuperScout sees the plugin loaded in FM26, its own F9/"New data" handling
steps aside and lets the plugin do the scan, so the two never scan at the same time. To get rid of it, uninstall
FMSuperScout 1.5.0 or delete `BepInEx\plugins\FMSuperScout.dll` from your FM26 folder. To
remove BepInEx entirely (only if no other mod uses it), also delete `winhttp.dll`,
`doorstop_config.ini`, the `BepInEx` and the `dotnet` folder there.

## Reporting a problem

Use **Report a problem** in the app (settings menu, or the link on the empty screen). It
opens a GitHub issue with your versions pre-filled. Please attach:

- `%LOCALAPPDATA%\FMSuperScout\diagnostics.txt` and `status.json`
- `%LOCALAPPDATA%\FMSuperScout\scanner.log`

Those files answer 90% of the questions we would otherwise have to ask.
