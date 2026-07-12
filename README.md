<p align="center">
  <img src="app/logo.svg" width="88" height="88" alt="FMSuperScout logo">
</p>

<h1 align="center">FMSuperScout</h1>

<p align="center">A fast, accurate scouting tool for <strong>Football Manager 26</strong> (Windows / Steam).</p>

---

FMSuperScout reads the full database of your open save — players **and** staff — including the
hidden values FM normally masks: **CA/PA** (current & potential ability) and the hidden
personality attributes. You get a snappy, spreadsheet-style app with search, filters, role
ratings, player comparison and squad analysis over 50,000+ people.

It has two parts: a small **BepInEx plugin** that runs inside the game and dumps the database to
JSON, and a **local web app** (no internet, no accounts, data never leaves your PC) where you
search, filter and compare.

> Single-player use only. The plugin **only reads** memory (it never writes to the game) and runs
> fully offline.

## Features

- **Search & filter** — name/club, age, CA, PA, value, wage, nationality, EU/EEA, contract
  expiring, free agents, transfer-listed, club reputation tier, and more. Pick positions on a
  clickable pitch.
- **Tactical role ratings** — 19 FM roles (Advanced Forward, Ball-Playing Defender, Deep-Lying
  Playmaker, …) scored per player from the key/preferable attributes; sortable column + a
  "best roles" panel in each profile.
- **Player comparison** — put up to 3 players side by side, best value per attribute highlighted.
- **Squad needs analysis** — breaks your squad down by position group, flags thin depth / aging /
  no succession, and one-click scouts candidates for the gap.
- **Player profile** — attributes exactly as in FM (grouped, keeper-aware) with FM colours, hidden
  **personality** attributes, a CA/PA gauge, and an **estimated-potential** projection.
- **Estimated market value** — calibrated against real in-game values (see *Accuracy*).
- **Transfer-interest estimate** — reputation- and wage-based, and aware of the FIFA under-18
  international-transfer rule.
- **Shortlist** (★) with its own tab and CSV export.
- **Settings** — language NL/EN, currency £/€, and a **Hide CA/PA** toggle for those who consider
  it cheating (hidden everywhere consistently).

## Install (end users)

No coding needed, and you don't need Node installed — it's bundled.

1. Download **`FMSuperScout-Setup.zip`** from the [Releases](https://github.com/mavarobli/FMSuperScout/releases) page.
2. Unzip it anywhere and double-click **`Install FMSuperScout.cmd`**.
3. Launch **FMSuperScout** from the Start menu or desktop shortcut — it opens in its own window.
   Close the window and the background server stops by itself.

To remove it: *Apps & features* → FMSuperScout, or run `Uninstall FMSuperScout.cmd`.

## Run from source (developers)

Requires [Node.js](https://nodejs.org) (any recent version; no dependencies to install).

```bash
node app/server.js       # then open http://localhost:8765
```

Or double-click `Start FMSuperScout.cmd`. To build the shareable installer zip yourself:

```powershell
powershell -ExecutionPolicy Bypass -File installer/build-package.ps1
# → dist/FMSuperScout-Setup.zip
```

## Getting data out of Football Manager

The app reads whatever the FMSuperScout plugin last dumped from your **active save**:

1. Start FM26 and load your save.
2. Press **F9** in-game (or click **⬇ New data** in the app).
3. When the green bar appears, click it to load.

Data lives in `%LOCALAPPDATA%\FMSuperScout\` (`dump*.json` + `diagnostics.txt`).

The plugin install/removal steps for the game itself are in [`docs/`](docs/) and the in-repo
`Installeer plugin.cmd`. BepInEx only *adds* files to the FM folder — it is fully reversible
(or use Steam → Verify integrity of game files).

## Accuracy

**Read straight from memory (reliable):** name, nationality, birth year, height, foot · **CA and
PA** (the real values) · all visible + hidden attributes and positions · wage, contract end,
transfer status · current club · club & player reputation · staff CA/PA, attributes and role.

**Estimates (clearly labelled as such):**

- **Market value** — FM usually computes value live rather than storing it. FMSuperScout's estimate
  is a log-linear model **calibrated on the players in your save that do have a stored value**
  (~29% median error). Value roughly doubles every ~7 CA points and scales with age, club
  reputation and remaining contract length. Method: [`docs/value-model.md`](docs/value-model.md).
- **Transfer interest** — a heuristic from reputation gap (your club vs theirs and vs the player's
  own stature), wage affordability, availability, age, and the FIFA Article 19 rule (a non-EU
  player under 18 can't move internationally until they turn 18). Not an exact FM number, but built
  on FM's dominant factors.

## Project structure

| Path | Contents |
|---|---|
| `app/` | Local web app (Node, zero dependencies) |
| `plugin/` | C# source of the BepInEx plugin |
| `installer/` | Icon generator, launcher, PowerShell installer, package builder |
| `docs/` | Value-model and .fmf-format research notes |

## Support

FMSuperScout is free. If it helps your scouting and you'd like to say thanks, you can
[buy me a coffee](https://REPLACE-WITH-YOUR-DONATION-LINK). Totally optional. 🙏

## Disclaimer

Not affiliated with Sports Interactive or SEGA. For personal, single-player use. Football Manager
is a trademark of Sports Interactive.
