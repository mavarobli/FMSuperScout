<p align="center">
  <img src="app/logo.svg" width="88" height="88" alt="FMSuperScout logo">
</p>

<h1 align="center">FMSuperScout</h1>

<p align="center">A fast, accurate scouting tool for <strong>Football Manager 26</strong> (Windows).</p>

---

FMSuperScout reads the full database of your open save (players **and** staff), including what FM
normally hides: **CA/PA**, hidden personality attributes and FM's **real transfer value**. You get
a snappy, spreadsheet-style app with search, filters, role ratings, comparison and squad analysis
over 45,000+ people. Monster saves work too: a 100+ league database with 635k people loads in
about 17 seconds.

Two parts: a small **BepInEx plugin** that dumps the database to JSON from inside the game, and a
**local web app** where you search, filter and compare. No internet, no accounts, data never
leaves your PC.

> Single-player use only. The plugin **only reads** memory, it never writes to the game.

## Features

- **Search and filter**: name/club, age, CA, PA, value, asking price, wage, nationality, EU/EEA,
  contract status, transfer status (for sale, for loan), division (with smart search). Pick
  positions on a clickable pitch.
- **Attribute filter**: min/max thresholds on any attribute ("Pace 15+"), hidden characteristics
  and personality included. Rules combine, show as removable chips and save into presets.
- **Tactical role ratings**: 19 FM roles scored from the key attributes; sortable column plus a
  "best roles" panel per profile.
- **Player comparison**: up to 3 side by side, FM-style bars, hidden stats included.
- **Squad analysis**: flags thin depth, aging and missing succession per position group, and
  scouts candidates for the gap in one click.
- **Player profile**: attributes in FM colours and grouping, personality and hidden
  characteristics, a CA/PA gauge and a potential projection per attribute. Opens beside the
  list or as a centered popup, your choice in Settings.
- **Shareable player card**: one click saves a PNG of any player in FM's own visual
  language: scout stars for current and potential ability, the full attribute grid in FM
  colours, best roles and finances. Wonderkids get a gold card. Built for showing off that
  one insane regen.
- **Loan-aware**: players on loan show in blue with their parent club in the tooltip and on
  the profile; under the My club filter your own loaned-out players show in red.
- **Development trends**: every dump adds a compact local snapshot, and player profiles grow
  a chart of CA/PA and value over time (dots mark real changes). Stored delta-only, a few
  MB per season, entirely on your own disk.
- **Growth and Intake Radar**: sort the world by how much CA a player gained since any
  reference date, filter on it, and get a heads-up on youth intake day listing every newgen
  that appeared worldwide since your last dump, best potential first. This is what the
  saved snapshots make possible and it is the one thing a tool without memory cannot do.
- **Market value from memory**: FM's actual transfer value for most players, a calibrated
  estimate for the rest (see *Accuracy*).
- **Asking price and transfer interest**: estimates based on contract, transfer status, age,
  reputation gap and wages, including the FIFA under-18 transfer rule.
- **Shortlist** (★) with its own tab and CSV export.
- **Settings**: NL/EN, GBP/EUR, and a toggle to hide all hidden stats at once for those who
  consider them cheating (the meta score has its own toggle, so you can keep either one).
- **One-click update**: the app checks the latest release about once a day and shows a
  dismissible notification. One click downloads the new installer, verifies its SHA-256
  against the release and starts it. Nothing installs without your click, no tracking.

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

Install the built DLL by copying `plugin/bin/Release/FMSuperScout.dll` to
`<FM26>\BepInEx\plugins\` while the game is closed.

## Getting data out of Football Manager

The app reads whatever the FMSuperScout plugin last dumped from your **active save**:

1. Start FM26 and load your save.
2. Press **F9** in-game (or click **⬇ New data** in the app).
3. The data loads by itself as soon as the dump is ready. If a read fails, the app shows what
   went wrong instead of waiting forever.

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

## Where this fits

FM26 has a healthy set of tools that read hidden data from memory, several of them very good
and several of them free. This one is worth a look if you want:

- **The whole database in one go, then instant everything.** F9 pulls your full loaded save
  (45k+ players) in about 10 seconds. After that, search while you type, sort 48k rows and
  stack filters with no pauses. A 635k-person monster save loads in about 17 seconds.
- **Squad needs analysis**: depth, aging and succession per position group, one click to scout
  candidates for the gap.
- **A meta score built on [FM-Arena's attribute testing](https://fm-arena.com/table/26-player-attributes-testing)**,
  so you can sort the world by what actually wins matches in the engine.
- **Shareable player cards** as PNG, in FM's own visual language.
- **Development trends** across your save's seasons, stored locally.
- **A one-click toggle to hide CA/PA and all hidden stats**, if you consider reading them cheating.
- **Open source**, so you can read exactly what it does with your system.

If you want to *edit* your save, want deep match statistics with xG and per-90s, or want an
overlay inside the game itself, other tools do those things and this one does not.

## Support

FMSuperScout is free and stays free. If it saved you an hour of squinting at slow menus, you can
[buy me a coffee](https://ko-fi.com/fmsuperscout). If not, it keeps working anyway. ☕

## Disclaimer

Not affiliated with Sports Interactive or SEGA. For personal, single-player use. Football Manager
is a trademark of Sports Interactive.
