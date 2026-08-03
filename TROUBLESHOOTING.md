# Troubleshooting

Two different problems live here. If **FM26 itself will not start** after installing,
read the section directly below. For **"no players loaded"**, start at step 1 and work
down; each step tells you what it means if it fails.

## 0. FM26 will not start, or seems to hang, after installing

Almost always this is the first launch still running, not a broken game.

After installing, the mod layer builds its files once. That takes **1 to 3 minutes**
and shows a black console window while it works. FM does not paint its own window in
that time, so it looks frozen. It is not. Leave it alone and it will start.

If you already closed it, just start FM26 again and wait it out. Later launches are
back to normal speed. FMSuperScout also shows this explanation on its empty screen
when it sees the mod layer has not finished setting up yet.

Still nothing after 5 minutes of waiting:

- Check your antivirus quarantine for `winhttp.dll` in your FM26 folder (see step 1).
- Already using BepInEx for another mod? A version conflict is possible. Rename the
  `BepInEx` folder, verify FM starts, then reinstall FMSuperScout.
- To rule the tool out entirely: delete `winhttp.dll` from your FM26 folder. FM then
  starts without any mods. If it still fails, the cause is not FMSuperScout.

Either way, please report it (see the bottom of this page) with `BepInEx\LogOutput.log`
attached. That log says exactly how far the mod layer got.

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
fixes the rare case where the game session ignores hotkeys entirely. If the hint
keeps coming back on every attempt, even after a full restart, read 4d.

## 4d. "FM26 is not picking up the request" on every single attempt

If F9 and "New data" are both dead in every session, while everything worked
before and nothing changed on your side, FM26 is probably restarting itself
during launch and dropping the mod layer on the way.

What happens: FM26 sometimes closes and relaunches itself while starting up (a
known FM bug, you can see it when the black console window appears and then the
game comes back without one). The mod loader marks the first process as handled;
the relaunched process inherits that mark and the loader skips it (known Doorstop
bug, [UnityDoorstop #34](https://github.com/NeighTools/UnityDoorstop/issues/34)).
The game you actually play then has no plugin at all: F9 does nothing, no
status.json appears, and requests from the app are never picked up.

How to check: open `BepInEx\LogOutput.log` in your FM26 folder. That file is
rewritten on every start where the mod layer runs. If its content is from an
older session (yesterday's date, a session you already closed), the mod layer is
not running in your current game.

The fix: create a plain text file called `steam_appid.txt` in your FM26 folder,
next to `fm.exe`, containing exactly this and nothing else:

```
3551340
```

That answers FM's "was I launched correctly?" check locally, so the game never
relaunches itself and the mod layer stays in. Found by a user in
[issue #7](https://github.com/mavarobli/FMSuperScout/issues/7), confirmed
working. If F9 ever goes dead again, first check whether the close-and-relaunch
pattern is back.

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
