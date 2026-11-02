# Backlog

What is still open (November 2026, after 1.7.0). Done work is in [CHANGELOG.md](../CHANGELOG.md);
the old, longer backlog is in the git history.

## Features (from GitHub issues)

- **Best XI** (#20), with code in the closed PR #24 by iamPurity. Most requested. Plan: smaller
  PRs on current main, or port it with credit.
- **League / club overview** (#22), also part of PR #24.
- **Custom attribute weighting** (#21), with a note that only the default weighting is backed by
  testing data.
- **Per-position meta and position proficiency** (#18, #19, #28). The dump already has natural
  and accomplished positions (`posNat`, `posArr`); waiting for solid data on the weighting.
- **UID column** (#30): the UID is in the dump (`id`), just not shown.

## Mac

- Intel Macs: built, never run.
- Only the Steam version of FM27; Epic not supported yet (other start route, no `SteamAppId`).
- Check that the game version is read on the Mac since 1.7.0 (diagnostics: "game_plugin 27.0").
- No F9 (would need keyboard-monitoring permission for FM).

## After FM patches

- **FM27 launch, 10 November 2026**: check the layout against the day-one patch on Windows
  (`docs/repin-guide.md`) and the Mac ("= gemeten ✓" in diagnostics, `docs/macos.md`).

## Known limitations

- In-game date comes from the next fixture of your team; during breaks it can run up to two
  weeks ahead.
- Market value estimate (for the minority without a value in memory) underrates strong players
  at small clubs. See `docs/value-model.md`.
- Installer and Mac app are not code-signed (deliberately: signing would publish a real name).

## Distribution

- FM-Arena thread: update once the site is back (it was down on 2 November because of an outage at
  its host).
- FM-Base: account blocked, appeal sent.
- FMScout download page: waiting for the site admin.
