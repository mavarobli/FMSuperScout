<p align="center">
  <img src="app/logo.svg" width="88" height="88" alt="FMSuperScout logo">
</p>

<h1 align="center">FMSuperScout</h1>

<p align="center">A fast, accurate scouting tool for <strong>Football Manager 26</strong> (Windows / Steam).</p>

---

FMSuperScout reads the full database of your open save (players **and** staff), including the
values FM normally hides: **CA/PA** (current and potential ability), the hidden personality
attributes, and FM's **real transfer value**. You get a snappy, spreadsheet-style app with search,
filters, role ratings, player comparison and squad analysis over 50,000+ people.

It has two parts: a small **BepInEx plugin** that runs inside the game and dumps the database to
JSON, and a **local web app** (no internet, no accounts, data never leaves your PC) where you
search, filter and compare.

> Single-player use only. The plugin **only reads** memory (it never writes to the game) and runs
> fully offline.

## Features

- **Search and filter**: name/club, age, CA, PA, value, asking price, wage, nationality, EU/EEA,
  contract expiring, free agents, transfer-listed, club reputation tier, and more. Pick positions
  on a clickable pitch.
- **Tactical role ratings**: FM roles (Advanced Forward, Ball-Playing Defender, Deep-Lying
  Playmaker, and more) scored per player from the key/preferable attributes; sortable column plus
  a "best roles" panel in each profile.
- **Player comparison**: put up to 3 players side by side, best value per attribute highlighted.
- **Squad needs analysis**: breaks your squad down by position group, flags thin depth, aging, or
  no succession, and scouts candidates for the gap with one click.
- **Player profile**: attributes exactly as in FM (grouped, keeper-aware) with FM colours, the
  hidden **personality** and hidden characteristics (consistency, injury proneness, and more), a
  CA/PA gauge, and a **potential-attributes projection**.
- **Market value read from memory**: FM's actual transfer value for most players, with a calibrated
  estimate as fallback for the rest (see *Accuracy*).
- **Asking-price estimate**: what a club is likely to want for the player (value adjusted for
  contract length, transfer status, age/potential and club size).
- **Transfer-interest estimate**: reputation- and wage-based, aware of youth settling and the FIFA
  under-18 international-transfer rule.
- **Shortlist** (★) with its own tab and CSV export.
- **Settings**: language NL/EN, currency GBP/EUR, and a **Show hidden stats** toggle (on by
  default; turn it off to hide CA/PA, personality and hidden characteristics everywhere at once,
  for those who consider them cheating).

## Install (end users)

One installer does everything: the viewer app, the BepInEx mod layer **and** the in-game plugin.
No coding needed, nothing else to download.

1. Grab **`FMSuperScout-Setup.exe`** from the [Releases](https://github.com/mavarobli/FMSuperScout/releases) page.
2. Windows SmartScreen may warn about an unknown publisher — the installer is not code-signed
   (it's a free tool). Click **More info → Run anyway**. Want to verify first? Check the file's
   SHA-256 against the release notes: `Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256`.
3. Run it. The wizard finds your FM26 folder automatically (Steam — all libraries — plus Epic
   and Xbox/Game Pass detection in beta) and installs everything. Already using BepInEx for
   another mod? It is left untouched; only the plugin DLL is added.
4. Start FM26. **The first launch takes 1–3 minutes longer** (a black console window is normal —
   the mod layer is generating its bindings). Your antivirus may ask about BepInEx: that is the
   standard FM26 mod loader, allow it.
5. Load your save, press **F9**, and open **FMSuperScout** from the Start menu.

To remove it: *Apps and features* → FMSuperScout. That removes the viewer and the plugin DLL;
BepInEx stays (other mods may use it).

## Run from source (developers)

Requires [Node.js](https://nodejs.org) (any recent version; no dependencies to install).

```bash
node app/server.js       # then open http://localhost:8765
npm test                 # run the model tests (zero dependency, node:test)
```

Or double-click `Start FMSuperScout.cmd`. To build the standalone installer yourself (requires
Inno Setup 6 and a local FM26 install with BepInEx as the payload source):

```powershell
powershell -ExecutionPolicy Bypass -File installer/build-exe.ps1
# -> dist/FMSuperScout-Setup.exe (+ .sha256)
```

A viewer-only zip package is also available via `installer/build-package.ps1`.

The plugin is C# (BepInEx 6, IL2CPP). It builds with a standard .NET SDK:

```bash
dotnet build plugin/FMSuperScout.csproj -c Release
```

On this machine the SDK lives user-local (not on PATH):
`%LOCALAPPDATA%\Microsoft\dotnet\dotnet.exe build plugin/FMSuperScout.csproj -c Release`.
Install the built DLL by copying `plugin/bin/Release/FMSuperScout.dll` to
`<FM26>\BepInEx\plugins\` while the game is closed.

## Getting data out of Football Manager

The app reads whatever the FMSuperScout plugin last dumped from your **active save**:

1. Start FM26 and load your save.
2. Press **F9** in-game (or click **⬇ New data** in the app).
3. When the green bar appears, click it to load. If a read fails, the app shows a red bar with the
   reason instead of waiting forever.

Data lives in `%LOCALAPPDATA%\FMSuperScout\` (`dump*.json`, `status.json`, `diagnostics.txt`).

The setup exe installs the plugin for you. For development, `Installeer plugin.cmd` copies a
freshly built DLL into the game folder. BepInEx only *adds* files to the FM folder, so it is
fully reversible (or use Steam, Verify integrity of game files).

## Accuracy

**Read straight from memory (reliable):** name, nationality, birth year, height, foot; **CA and
PA** (the real values); all visible and hidden attributes and positions; wage, contract end,
transfer status; current club; club and player reputation; **FM's real transfer value** for most
players; staff CA/PA, attributes and role.

**Estimates (clearly labelled as such):**

- **Market value fallback**: for the minority of players where FM does not store a value, a
  log-linear model calibrated on players with a real in-game value fills the gap (saturating
  reputation curve, age, and remaining contract length). Read values are shown exactly; estimates
  are shown as a range. Method: [`docs/value-model.md`](docs/value-model.md).
- **Asking price**: the read/estimated value adjusted by contract length, transfer status
  (listed, not-for-sale, release clause), age and potential, and club reputation.
- **Potential attributes**: projects each attribute toward the player's PA. Derived from how FM's
  Current Ability works (CA is a linear, weighted sum of the attributes, so scaling toward PA is
  the profile-preserving projection), then tilted by age and attribute type so physical attributes
  fade with age while mental and technical keep improving, and capped at 20.
- **Transfer interest**: a heuristic from reputation gap (your club vs theirs and vs the player's
  own stature), wage affordability, availability, personality, age, and FIFA Article 19.

None of the estimates are exact FM numbers, but each is built on FM's dominant factors and covered
by the model tests in [`test/`](test/).

## Project structure

| Path | Contents |
|---|---|
| `app/` | Local web app (Node, zero dependencies) |
| `plugin/` | C# source of the BepInEx plugin |
| `installer/` | Icon generator, launcher, PowerShell installer, package builder |
| `test/` | Zero-dependency model tests (`npm test`) |
| `docs/` | Value-model, .fmf-format and status/backlog notes |

## How it compares

There's a healthy little ecosystem of FM26 tools that read hidden data from memory. Here's how
FMSuperScout stacks up, as of July 2026:

| | FMSuperScout | FM Genie Scout 26 | FMST 26 | FMRTE 26 |
|---|---|---|---|---|
| Price | Free, no ads | Free (ads) or €6+ for ad-free | Free | Free to scout, paid to save edits |
| Open source | Yes | No | No | No |
| Live from memory | Yes | Yes | Yes | Yes |
| Tactical role ratings | 19 FM roles, sortable | – | – | – |
| Player comparison | Up to 3, side-by-side | – | – | – |
| Squad needs analysis | Depth/aging/succession, 1-click scout | – | – | – |
| Saved filter presets | Yes | – | – | – |
| Hide hidden stats toggle | Yes, one click | – | – | – |
| Statistics depth | Core scouting fields | Extensive | 100+ columns, xG/p90 | Extensive (editor-first) |

No shade to the others — Genie Scout in particular has been the default recommendation since 2009
for good reason. FMSuperScout is aimed at a specific gap: fast squad-management workflow (compare,
find gaps, save your filters) rather than a raw stats dump or a save editor.

## Support

FMSuperScout is free and stays free. If it saved you an hour of squinting at slow menus, you can
[buy me a coffee](https://ko-fi.com/fmsuperscout). If not, it keeps working anyway. ☕

## Disclaimer

Not affiliated with Sports Interactive or SEGA. For personal, single-player use. Football Manager
is a trademark of Sports Interactive.
