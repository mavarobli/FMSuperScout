# FMSuperScout 1.6.0

**Football Manager 27 is here, and so is FMSuperScout.** Works with FM26 too.

## No more mod loader

FMSuperScout now reads the game with a small scanner of its own. Nothing is installed into
your game folder any more, so the old BepInEx headaches are gone in one go:

- no antivirus quarantining `winhttp.dll`;
- no 1-3 minute black console on the first launch;
- no F9 going dead after FM restarted itself (#7, #12, #13, #14, #25).

Press **F9** in the game or click **New data** in the app, as before. A full FM27 database
(40,000 players, 24,000 staff) loads in about 6 seconds. The scanner only reads; it never
changes your game or your save.

Coming from 1.5.0 with FM26? Just run the installer. Your old plugin keeps working and the two
never scan at the same time; you can remove it whenever you like (see TROUBLESHOOTING).

## Verified against FM27

Every field was checked against a running FM27 save and FM's own screens: CA/PA, attributes,
positions, personality, contracts, wages, values, loans, clubs, competitions and every staff
attribute FM27 shows.

## New look

- An FM27-style navy theme and a new logo.
- A rebuilt filter panel:
  - quick filters for wonderkids, contract ending, for sale and my club;
  - your active filters at the top, with "clear all";
  - a count per section;
  - a slim rail when collapsed.
- Results read "145 of 40,246 players".

## Fixes and requests from GitHub and the forums

- **Positions** now show natural *and* accomplished positions, like FM's own position column
  (#23).
- **Staff attributes** are translated and grouped exactly like FM27's staff profile, and the
  attribute filter works for staff too (#26; thanks to MisterC72 for PR #27). "Working with
  youngsters" was always shown far too low; fixed.
- **Staff roles**: recruitment analysts, performance analysts and heads of performance
  analysis no longer show as plain "Staff" (in FM26 too).
- **Network saves**: pick which manager is you; the choice is remembered per save.
- **Growth history** is kept per game, so FM27 never mixes with your FM26 history.
- **Football Manager running as administrator** gets a clear explanation instead of
  "not running".
- **Keyboard** use of the filter panel.
- **MIT license** (#11).

## Support

The coffee icon now opens a small panel. You can:

- buy a coffee;
- star the project on GitHub (free);
- copy the download link for a friend.

Thank you to everyone who already did.

## Mac

Not in this release, but on its way. We confirmed on a real Mac with FM27 that FMSuperScout
can run there without touching macOS security settings. See `docs/macos.md`.
