<p align="center">
  <img src="app/logo.svg" width="88" height="88" alt="FMSuperScout logo">
</p>

<h1 align="center">FMSuperScout</h1>

<p align="center">A fast, accurate scouting tool for <strong>Football Manager 26</strong> (Windows).</p>

---

FMSuperScout reads the full database of your open save (players **and** staff), including what FM
normally hides: **CA/PA**, hidden personality attributes and FM's **real transfer value**. You get
a snappy, spreadsheet-style app with search, filters, role ratings, comparison and squad analysis
over 45,000+ people.

Two parts: a small **BepInEx plugin** that dumps the database to JSON from inside the game, and a
**local web app** where you search, filter and compare. No internet, no accounts, data never
leaves your PC.

> Single-player use only. The plugin **only reads** memory, it never writes to the game.

## Features

- **Search and filter**: name/club, age, CA, PA, value, asking price, wage, nationality, EU/EEA,
  contract status, division (with smart search). Pick positions on a clickable pitch.
- **Tactical role ratings**: 19 FM roles scored from the key attributes; sortable column plus a
  "best roles" panel per profile.
- **Player comparison**: up to 3 side by side, FM-style bars, hidden stats included.
- **Squad analysis**: flags thin depth, aging and missing succession per position group, and
  scouts candidates for the gap in one click.
- **Player profile**: attributes in FM colours and grouping, personality and hidden
  characteristics, a CA/PA gauge and a potential projection per attribute.
- **Market value from memory**: FM's actual transfer value for most players, a calibrated
  estimate for the rest (see *Accuracy*).
- **Asking price and transfer interest**: estimates based on contract, transfer status, age,
  reputation gap and wages, including the FIFA under-18 transfer rule.
- **Shortlist** (★) with its own tab and CSV export.
- **Settings**: NL/EN, GBP/EUR, and a toggle to hide all hidden stats at once for those who
  consider them cheating.

## Install (end users)

One installer does everything: the viewer app, the BepInEx mod layer **and** the in-game plugin.
No coding needed, nothing else to download.

1. Grab **`FMSuperScout-Setup.exe`** from the [Releases](https://github.com/mavarobli/FMSuperScout/releases) page.
2. Windows SmartScreen may warn about an unknown publisher, since the installer isn't code-signed.
   Click **More info → Run anyway**. Want to verify first? Check the file's SHA-256 against the
   release notes: `Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256`.
3. Run it. The wizard finds your FM26 folder automatically (Steam incl. extra libraries, Epic and
   Xbox/Game Pass in beta) and installs everything. Already using BepInEx for another mod? It is
   left untouched; only the plugin DLL is added.
4. Start FM26. **The first launch takes 1-3 minutes longer** and shows a black console window.
   That's normal, the mod layer is generating its bindings. Your antivirus may ask about BepInEx:
   that's the standard FM26 mod loader, allow it.
5. Load your save, press **F9**, and open **FMSuperScout** from the Start menu.

To remove it: *Apps and features* → FMSuperScout. That removes the viewer and the plugin DLL;
BepInEx stays (other mods may use it).

Something not working (no players loaded, no console window)? See
[TROUBLESHOOTING.md](TROUBLESHOOTING.md), or use **Report a problem** in the app's settings menu.

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

There's a healthy little ecosystem of FM26 tools that read hidden data from memory: Genie Scout,
FMST 26 and FMRTE all do it well, and Genie Scout has been the default recommendation since 2009
for good reason. It also has role ratings and player comparison of its own, so here's an honest
picture of where FMSuperScout actually earns its place (as of July 2026):

**Speed is the main one.** Press F9 and the full loaded database (45k+ players) is pulled from
your save in about 10 seconds, with a progress bar. After that everything is instant: search
while you type, sort 48k rows, stack filters, no loading pauses between clicks. It runs as a
modern web app, so it feels closer to a fast website than to classic desktop tooling.

Beyond that:

- **Squad needs analysis**: depth, aging and succession per position group, one click to scout
  candidates for the gap. Built for the "what does my squad actually need" question.
- **Comparison the way FM shows it**: up to 3 players with FM-style bars, hidden stats and
  personality included.
- **Complete filter setups as presets**: pitch positions, role, all criteria, saved under one name.
- **A one-click toggle to hide CA/PA and all hidden stats**, for people who consider reading
  them cheating.
- **Open source and free, no ads**: the only one in this list where you can read exactly what
  it does with your system.

And to be fair, the others win elsewhere. Genie Scout and FMST 26 go deeper on raw statistics
(FMST does 100+ columns with xG and per-90s), FMRTE is the tool if you want to *edit* your save,
and all three have a longer track record. If that's what you need, use them, they're good.

## Support

FMSuperScout is free and stays free. If it saved you an hour of squinting at slow menus, you can
[buy me a coffee](https://ko-fi.com/fmsuperscout). If not, it keeps working anyway. ☕

## Disclaimer

Not affiliated with Sports Interactive or SEGA. For personal, single-player use. Football Manager
is a trademark of Sports Interactive.
