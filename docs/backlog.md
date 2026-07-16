# Backlog & open items

Status overview of what is done, what is open, and ideas. Not yet built where it says "backlog".

## 1. Full standalone installer (.exe) - BUILT (15-07); to be tested by mavarobli

**Inno Setup 6 installer** (`installer/FMSuperScout.iss`, build with `installer/build-exe.ps1`
→ `dist/FMSuperScout-Setup.exe`, ~48 MB). One .exe that installs everything:

- **Viewer** (app + bundled node.exe + launcher vbs) → `Program Files\FMSuperScout`,
  Start menu + optional desktop shortcut, proper uninstaller in "Apps and features".
- **FM26 folder auto-detected**, with a manual folder picker (validation on `fm.exe`) as
  a safety net: **Steam** (registry `HKLM32\SOFTWARE\Valve\Steam` → parse all libraries via
  `steamapps/libraryfolders.vdf` → library with `appmanifest_3551340.acf`, `installdir`
  read as well), **Epic** (launcher manifests `ProgramData\Epic\...\Manifests\*.item`,
  JSON `InstallLocation`), **Xbox/Game Pass PC** (`<drive>:\XboxGames\Football Manager 26\
  Content`, C through L).
- **BepInEx payload bundled** (the proven set from mavarobli's installation = Thunderstore pack
  BepInEx 6 BE 6.0.738 IL2CPP x64 incl. patched Il2CppInterop): root loader (winhttp.dll,
  doorstop), core, config, unity-libs and the dotnet runtime (~79 MB). `interop/` and `cache/`
  deliberately left out, BepInEx generates those locally on first start (patch-proof). If a
  BepInEx already exists in the game folder, it is **not** overwritten (check cached, otherwise
  the check would flip halfway through the copy). LGPL notice (`LICENSE-BepInEx.txt`) included.
- **Plugin DLL** → `BepInEx\plugins`. A running `fm.exe` is detected (WMI) with a
  "close the game" retry dialog. Game folder is remembered in `HKLM\Software\FMSuperScout`;
  the uninstaller removes only our DLL (BepInEx stays in place for other mods).
- Bilingual (NL/EN), finish page warns about the slow first start (interop generation,
  1-3 min black console window) and a possible antivirus alert on BepInEx.

**Still to do before release:**
- **mavarobli tests the .exe end-to-end** on his own machine (wizard, detection, shortcut, F9).
- Epic/Xbox detection is **untested** (only Steam here) → mark as beta in the release.
- **Signing decision (15-07, mavarobli agreed): first release unsigned**, with SHA-256
  checksum (`build-exe.ps1` now builds it automatically as `.sha256` next to the exe) and a
  VirusTotal scan link in the release notes, as is common in the modding scene. The
  SmartScreen warning ("More info → Run anyway") is explained in the release notes
  (`docs/release-notes-v1.0.0.md`, draft ready). If the tool takes off, sign after all:
  **Certum Open Source** (~€60-90/yr) or **SignPath.io** (free for OSS) are the
  candidates; exe metadata (publisher/description/version) is already in place.

## 2. In-app data fetch with FM detection - DONE

Server endpoint `/api/fmstatus` checks via `tasklist` whether `fm.exe` is running. The "New data"
button checks this first: FM not running → red banner "Start Football Manager 26 first" instead of
waiting forever; FM running → write `request.flag` so the plugin starts the dump. Tested against the
real running game (correct detection).

## 3. Data accuracy (plugin) - partly done

- **Reading personality: DONE** - the plugin now fills Ambition/Loyalty/Professionalism
  and others (100% in the current dump). Included in the interest model (item 4).
- **Club name - DONE (14-07, verified end-to-end)**: the cause was `PlausibleClub` rejecting
  non-western Latin letters (Polish ł/ń/ś, Turkish ğ/ş/ı), so for example "Lech Poznań"
  was dropped while the club reputation was read fine. Now accepts the whole Latin Unicode
  block (through Latin Extended). Verified against the real F9 dump and in the app: Filip Wisłocki shows
  "Lech Poznań"; Beşiktaş A.Ş., Śląsk Wrocław and Górnik Zabrze also exist now.
- **Competition UI (15-07)**: club-level filter (reputation thresholds) removed, the real
  division makes it redundant. The division filter is now a **smart search bar with its own dropdown**
  (app style, replaced the native datalist that stood out as a light "cloud" against the dark UI):
  suggestions ranked by competition strength (proxy = median club reputation of the players
  in it, because we don't dump competition reputation yet), with typo tolerance (Levenshtein per
  word) and substring/subsequence matching. "premeir" → Premier League on top. Your own club's
  competition(s) get priority (type "eredivisie" → your VriendenLoterij
  Eredivisie on top, not the foreign namesakes), but position weighs heavily so a
  prefix match like "Premier League" never loses to your own reserve "Premier Divisie".
  Strength proxy = 80th percentile club reputation (top clubs define standing). Reference-year
  field removed; in-game date sits in the header next to the player count with an SVG calendar
  (app style), tilde + tooltip when derived, exact with "memory".
- **In-game date, bug found in v0.1.11 (15-07, fixed in v0.1.12)**: the "clean"
  vote filter `& 0xFE00` threw away all team votes (the `+0x94` field carries flag bits in
  9-15). Fix: normalize votes on the decoded date, and read the date directly
  from the schedule object of MY team (`[myTeam+0xA0]+0x94`, with +0x18 as fallback), which
  gave exactly "today" in every measurement (19-09 verified). Team votes kept as cross-check.
- **Division/competition - PINNED + country-prefix fix (15-07, v0.1.10)**: `[team+0x50/0x60]` →
  competition object; first F9 (v0.1.7) gave 94.9% coverage and per-club consistent divisions
  (youth even correctly got the U19 competition), but the short name (`comp+0x48`) is missing
  the country for unlicensed competitions, all of Spain became "Eerste Divisie", Austria
  "Eredivisie". The comp name map (v0.1.8 watchlist) showed that the full name at
  `comp+0x40` does carry the country ("Oostenrijkse Eredivisie"), so v0.1.10 uses that
  first (NL then becomes "VriendenLoterij Eredivisie", sponsor names, just like FM itself shows).
  Check after F9: Vallecano players on "Spaanse Eerste Divisie" (or LALIGA name)?

## 4. Interest model - DONE (personality included)

Rebuilt with the now-available personality: ambition pushes toward a step up and dampens
sideways/downward moves, loyalty dampens, young players relocate less easily (age damping),
and for young players the club gap weighs heavier than the status gap. Art.19 (non-EU <18) remains.
Tested against real data (who does/doesn't want to join Feyenoord): from "everyone wants to come" to
**~13-15/17 correct**; the known false positives are gone. Remaining errors are borderline cases (48-49,
label "Redelijk") that cannot be distinguished from the real cases on the data - do not
overfit further. Further gains would require an FM "interest" field if that can be read somewhere.

## Robustness & tests - DONE (July)

- **Error state instead of eternal "scanning"**: the plugin now writes `state:"error"` (with reason) to
  `status.json` when the scan fails (no GameAssembly, or an exception); the web app then shows a
  red banner instead of endless "⏳ FM is fetching the database…". In the installed plugin
  (12-07 build and newer; hash game folder = repo dist verified 14-07).
- **XSS hardening**: player/club names from memory now enter the DOM everywhere via `escHtml`
  (detail, table, comparison, analysis) - a corrupt string with `<` no longer breaks the layout.
- **Unknown age ≠ minor**: `interestEstimate` no longer treats age 0/unknown
  as <15 (no false "too young" rejection).
- **parseMoney**: "mld" (billion) did not work (regex already matched on the M) - solved.
- **Jumping columns on sort (14-07) - solved**: the table used automatic
  column widths, so the content of the ~45 visible (virtualized) rows determined the
  width and everything shifted on every sort. Now `table-layout: fixed` with a
  default width per column (`w` in the column definitions); manually dragged widths take
  precedence and the table width follows the narrowing handle. Verified: positions byte-identical
  across multiple sorts; resize handle still works.
- **Model tests** (`npm test`, zero-dep `node:test`): the real calculation functions from `app.js` are
  loaded in Node via a test harness and checked on invariants (value/asking price/interest/potential/role).
  Catches regressions when tuning the models. See `test/README.md`.

## 5. Market value - SOLVED (real value from memory)

**Calibration set removed (15-07)**: an automatic calibration set was running (`value-history.json` +
`/api/value-history`). Now that the real value comes from memory and the estimation model is on point,
it was redundant, removed (archiving, endpoint, file). Can be temporarily re-enabled
if the estimation model ever needs recalibrating. See `docs/value-model.md`.


The plugin now reads FM's real transfer value from `pl+0x234` (verified via offset discovery
against in-game amounts). ~74% of players get the exact FM value; the rest (sentinel
0xFFFFFFFF/300000000) falls back to the reputation estimation model below. Bidstrup: €62M guess →
real €15.8M. This makes the separate estimate largely redundant, but it stays as fallback.

**Big calibration 14-07** (`tools/value-calib.js`, 55 players from Telstar-€28K to Mbappé-€300M,
in-game ranges supplied by mavarobli): **54/55 correct**, our value (×1.16 £→€) falls
within FM's displayed transfer value range, apart from rounding edges. Bonus discovery:
for `listed` players with a fixed asking price set by the club, the value field is
**exactly** equal to it (4/4, ±1%) → the app now shows those without "~" and without rounding, and
`feeMultiplier` no longer applies a markup/markdown. Asking price model v2: premiums moderated
(contract markup cap 1.35; wonderkid ≤ ×1.2; total cap 1.7 / 2.2 when not for sale; v1 went
up to ×2.4, not supported by the calibration). Further tightening requires real "paid vs.
value" data points. **Open outliers: Nobel Mendy and Jozhua Vertrouwd** (field €39.1M vs
in-game €17.5-21M resp. €13.5M vs €0.95-8.4M), both 21-year-olds at Rayo; the 28+ players of
the same club are correct (De Frutos within range, Singh exact = clause €25M). Mendy is
not listed, plays everything, is happy, clause €55M (so that does not explain the low price).
**SOLVED (14-07, watchlist money dump)**: no read error, FM's stored value is
dynamic and can lag the display by days. On the repeat measurement Mendy's field was
£15.77M (€18.3M, right inside the in-game 17.5-21M) and Vertrouwd £4.9M (€5.7M, within
0.95-8.4M); FM had recalculated them between the dumps. Conclusion: value reading fully
validated; a dump is a snapshot, pressing F9 more often keeps values fresh.
By-catch from the money dump: `pl+0x244` looks like the last transfer fee (Haaland £51M),
`pl+0x248` = weekly wage; a release clause field (Mendy €55M) was NOT found in the player/contract
window, clauses presumably live in a separate list (nice-to-have).
Practical lesson: files placed into the data folder from outside are invisible
to fm.exe (virtualization); the plugin therefore creates/fills `watchlist.txt` itself (v0.1.5+).

### History: reputation estimation model (fallback)

Calibrated on 43 real values (~24% in-sample; ~44% out-of-sample on a later season). Recalibrating on
only the ~30 points of one dump gives unstable/wrong-signed coefficients (overfitting), so
the robust model stays. Real improvement requires **more calibration points from different
competitions/seasons** (mavarobli can supply those from FM). Teenager value remains intrinsically erratic.

## 6. Saved filter presets - DONE

Sidebar section "Saved filters": save the complete filter state under a name (text fields,
checkboxes, selects, field positions and the chosen tactical role), click to apply, ✕ to
remove, same name = overwrite. Stored in localStorage (`fmss_presets`). Tested
end-to-end against the real dump (save → clear → apply → reload → remove).

## 7. Meta-score column (FM-Arena) - DONE

Sortable column "Meta" (after PA) + row in the profile: weighted attribute score on the
1-20 scale with the measured points impact from FM-Arena's attribute testing as weights
(Pace 20.5, Acceleration 20.4, JumpingReach 11.6, Dribbling 9.8, …; source:
fm-arena.com/table/26-player-attributes-testing). Says "how meta is this player" independent of CA/role:
Adama Traoré (CA 135) scores higher on it than many a CA-160 player, exactly as intended. Goalkeepers
fall outside the test → no score. New columns are now inserted at their default spot in an
existing column configuration (no longer appended at the end).

## 8. Version warning on FM patch - DONE (rebuild plugin)

The plugin reads the file version of `game_plugin.dll` and sets `gameVersion` /
`supportedVersion` / `versionOk` in the dump meta (pinned to major.minor 26.3 in `Fields.cs`).
If the version differs, the app shows an amber bar "data possibly unreliable". On a
new FM patch: verify offsets and bump `SUPPORTED_*` in `Fields.cs`.

## 9. In-game date - PINNED via team schedule; KNOWN LIMITATION during breaks in play (15-07)

**Limitation discovered 15-07 (v0.1.30→0.1.33)**: mavarobli saw the app show Dec 22 while the game
was at Jan 1-3. Cause: `[team+0xA0]+0x94` is the **next fixture date**, not a
world clock. On match days (when we pinned in September) it coincides with "today";
during the winter/summer break it stays on the last/next match and lags
up to ~2 weeks. A discovery scan (temporarily in v0.1.31/0.1.32) across **9,791 teams**
on all date fields of team, schedule, competition and club objects found **nowhere** a
shared "today" date: no single offset had high agreement on the real date (the
comp fields carry season/creation dates from 2026, the sched fields are per-team different
fixture dates). Conclusion: the calendar clock is not stored as a readable FM date u32 on these native
DB objects; it presumably lives as a C# `DateTime` (ticks) in GameAssembly or on
a global world object. **mavarobli's decision: leave it**, the exact hunt (multiple FM-close/
F9 rounds, uncertain outcome) is not worth the effort, because the impact is cosmetic: age
only changes on a birthday, so ~2 weeks of slack almost never changes an age.
The discovery scaffolding has been cleaned up again (v0.1.33). For whoever wants it exact later: start with
a .NET `DateTime` ticks scan in GameAssembly or a pointer path from the human manager to
the world object.

### History: pin via team votes (15-07, plugin v0.1.10)

**Breakthrough 15-07**: the fixture hunt showed that `[team+0xA0]+0x94` carries exactly the current
in-game date (2027-09-05 on multiple independent teams, confirmed by mavarobli).
v0.1.10 lets all teams from the squad walk vote; with ≥10 votes and ≥60% agreement
the date is set (`gameDateSource:"memory"`, ages recalculated), otherwise honestly
back to "derived". The app hides the reference-year field as soon as the source is "memory" (mavarobli's
wish). History of the search below.

### History: false positive + discovery rounds (14-07)

**Lesson from the F9 loop (12-07 vs 14-07)**: the game_plugin image scan found exactly the same
candidate list (same values and offsets) on two dumps with different in-game dates, so those
are constants in the binary, not a live date. The "chosen" 2027-09-13 was wrong; real was
15-08-2027 (0x07EB00E3), and that value was not even in the list → the real date lives on
the heap or in GameAssembly statics.

**v2 (plugin v0.1.2)**: no longer picks anything automatically (`gameDateSource` stays `"derived"`) and
collects three traces in `diagnostics.txt`: (1) gp image (reference/constants), (2)
GameAssembly image statics (a `ga+offset` would be stable within a version), (3) a
heap histogram of all FM-date-encoded u32's from the main scan. Workflow: mavarobli reports the
in-game date on every F9; the candidate with that value across two dumps (with different
dates!) is the source to pin.

**Round 14-07 (real: 26-08-2027)**: the date was in none of the three u32 traces, but the
heap histogram of busy dates stops exactly just before "today" (22/8), so the
data is fresh but "today" does not live as a loose u32 glob. **v0.1.4** therefore also scans for
.NET DateTime ticks (u64, midnight, year window) in GameAssembly, the C# layer possibly stores
the date as a System.DateTime static. mavarobli's wish once this is reliable: automatically hide the
reference-year field in the sidebar.

## 10. Progress bar on new data - DONE (14-07)

Real progress, no fake animation, in two places in the banner:
- **Plugin scan**: during the scan the plugin writes `progress` (0..1) to
  `status.json` every ~0.5 s, scanned bytes/total for 0-85%, linking phase 87-90%, JSON writing 90-100%
  (ratio ≈ real runtime). The app polls faster (750 ms) during a scan and shows
  bar + percentage. Older plugins without `progress` get the old text banner.
- **Loading the dump in the app**: streaming fetch with `Content-Length` → "Data laden… X / Y MB"
  with bar, then "Data verwerken…" during the JSON parse.
In plugin v0.1.2 (installed 14-07) + app. App side tested end-to-end (48,869 players
loaded via the new streaming path; bar rendering verified; model tests green). The
plugin side rides along on mavarobli's next F9.

**Auto-load (14-07)**: as soon as the plugin is done, the app loads the new dump automatically:
the green bar is now a short confirmation ("Nieuwe data geladen") that disappears by itself
after 6 s, no click needed anymore. Tested end-to-end with a simulated scanning→done
transition in `status.json`. Instruction step 3 in the empty state was updated along with it.

## 11. Comparison screen v2 - DONE (14-07)

Fully worked out at mavarobli's request: attributes in FM colors (winner gets an
accent underline instead of a color override), meta score, asking price, height, contract and
foot added, group averages (Technical/Mental/Physical/Standard, 1 decimal, with
color), a win count ("Best on … attributes"), and hidden attributes +
personality as their own groups (same visibility rule as the detail panel;
injury proneness/dirtiness/controversy count inverted). With exactly 2 players there is
a Δ column (player 1 − player 2; green = player 1 better off, also with "lower is better"
such as asking price); with 3 players the Δ column is dropped and the rows mark the winner. Max
stays 3 players. Verified end-to-end (Mbappé/Haaland/Wirtz); tests green.

**v2.1 (14-07, cleaned up after mavarobli's feedback)**: the first version was one list of 66 rows
(2,195px, 2.7 screens of scrolling). Now: group averages gone, win count as a badge in the
header ("11× beste attribuut"), and the attributes in two columns with panels, with 2 players
in FM style (value | name | value | Δ), with 3 players name | w1 w2 w3. Key figures
stay at the top as a grid with sticky header. Scroll length ~-40%; panels stack automatically
on narrow windows (minmax 300px).

**v2.2 (14-07, modeled after FM's own comparison screen)**: comparison bars in the
middle of each attribute row instead of the Δ text column (green to the left = player 1 better,
blue to the right = player 2; length ∝ difference, 8 points = full; Δ as tooltip; also works
inverted with "low is better"). The header is now its own sticky grid above the whole scroll with
name, age·position·club, value·salary·contract year and the win badge. Per panel
an "Average" footer row with its own bar (like FM does at the bottom). Verified: sticky
stays in place while scrolling, bar direction/length correct, 3-player mode without bars intact.

## 12. Male/female filter - DONE (15-07, v0.1.19)

Gender byte final after 3 wrong pins: **`person+0x19` bit `0x10`** = female. Earlier
candidates 0x0A and 0x18 bit 0x08 were youth/team-type flags (set on ALL youth →
male wonderkids were flagged as female). Decisive: diffing youth-male vs youth-female
(age confound removed) + validation against men's YOUTH competitions. Final validation
v0.1.19: Premier League/Eredivisie/Danish-German-French U19 = **0 women**, women's competitions
100%, all 228 women found are in real women's competitions (WSL, Frauen-Bundesliga,
Eerste Divisie Vrouwen…). Segment toggle Men/Women/Both (default Men) live; app
safety net: filter is a no-op if the dump has no gender data (prevented 0 results).

**Decision 15-07 (mavarobli): do not load women at all.** The toggle has been removed; the plugin
already skips women (person+0x19 bit 0x10) during the scan → saves time/space, and the
stray women that "leaked" are gone. No more `gender` field in the dump, no more filter/UI
in the app. Research into the missing women (the CA/PA filter was NOT the cause, 0
rejected players; there IS a separate class offset ~0x219 with ~39k objects, presumably the
women's class) has been stopped: not needed now that we deliberately leave women out. Can be picked up
again later if a full women's scan is ever wanted.

### History: earlier wrong pins (0x0A, 0x18)

mavarobli wants to filter male/female; default men. **Gender byte (2 rounds)**: first pin
`person+0x0A` was WRONG, turned out to be a youth/level flag (Simon Banza, male/Ligue 1, also got 1;
"women" were mostly male youth/lower-division players). Cause: discovery set too
one-sided (elite men vs young women → age/level confound). Discovery v2 with a diverse
set (Banza 31y, Mparaganda 19y, Haaland, Mbappé as men; women 16-18y) + full
byte map pointed to **`person+0x18` bit `0x08`**: all 4 men 0x00, all 5 women 0x08.
v0.1.16 reads that, dumps `gender` (0/1) per player/staff, and logs a validation (women per
men's/women's competition). **App side**: segment toggle in Settings "Men/Women/
Both" (default Men), app style; row only appears with gender data. Tested with
simulated data (3 states filter correctly). After mavarobli's F9 with v0.1.16: check validation
rows (Premier League ~0 women), then the toggle is definitively live.

## 13. Loan players in and out under "My club" - DONE (15-07, v0.1.24)

mavarobli wants to see loaned-out/loaned-in players at his own club too, in FM's colors (red =
loaned out, blue = loaned in). Key: **parent club = full contract chain**
(`person+0xA8→team(+0x10)→club(+0x30)`), while the squad walk gives the current/loan club.
Discovery confirmed this with mavarobli's loaned-out Feyenoord players (Amaury Zimmermann → SK Beveren,
contract → Feyenoord). The plugin now dumps `ownerClub` when it differs from `club`. App: under
the "My club" filter, players with parent club==my club are shown as well; name colored
red (loaned out to X) / blue (loaned in from X) with tooltip. Only under My club (mavarobli's
choice). Tested with simulated loan data (red/blue + tooltip correct); tests green.
Caveat: catches the cases where the squad walk correctly yields the loan club; loaned-out
players that the squad walk (still) assigns to Feyenoord show as regular players, to be
refined if mavarobli sees someone missing.

## 14. Scan overhead cleaned up - DONE (15-07, v0.1.25)

mavarobli noticed loading felt slower. Cause: the date hunt had left behind heavy diagnostics,
for every 8-byte word in the whole heap it checked whether it encoded an FM date or
.NET tick (millions of extra operations + two growing histograms per scan). Now that the
date is pinned via the team schedule, that is redundant. Removed: `CountHeapDate` (2×/word),
the heap tick check (1×/word), `HeapDateHist`/`HeapTickHist`, the image date scans
(`ScanGpDates`/`ScanGaDates`/`ScanGaTicks`/`ScanImageDates`) and the `heap-dates.txt` file
plus all associated diagnostics sections. `FindGameDate` now only reads the
team schedule directly (+ team votes as cross-check). The app side got lighter anyway: women
are no longer loaded and the gender field is gone → smaller dump, faster parse. Scan
and load time back to the old level.

## 15. Diagnostics/discovery scaffolding cleaned up - DONE (15-07, v0.1.26)

Big cleanup now that all offsets are pinned. Removed from the plugin: CLUB-OFFSET,
DIVISION-OFFSET (incl. `DivDiscover`/`WriteDivCand`/`ObjNameMap`/`DivNameOffs`), SQUAD-LIST,
fixture-hunt, VALUE-OFFSET and WATCHLIST discovery (incl. `WriteWatchlist`/`NormName`/
`MoneyLike`), plus `ClubNameAt`/`ChainClubName`/`FmDateDebug`/`ResolveClubName` and the
diagnostics collections `DiagPersons`/`DiagClubs`/`DiagTeams`/`ProbeHist`/`DiagMyClubObj`.
Those probed hundreds of objects × offsets in memory on every F9, pure development
scaffolding for problems that are now solved. `WriteDiag` is now a tight health check
(class-offset top 15, matches, my club, date source, 12 sample players, loan overview) that
attempts nothing extra. `diagnostics.txt` is a fraction of the size; scan/diag fast again.
The health check stays: if an FM patch shifts the offsets, you see it in the class peaks.

## 16. UX ideas (nice-to-have)

- **Own-team switcher, BUILT (15-07, verify with F9)**: the v0.1.9 discovery
  found the team structure (Feyenoord: tt=0 first team/Eredivisie, tt=3 reserves, tt=11
  U18), but the list entries turned out not to be person pointers (name resolution gave garbage).
  Solution in v0.1.10: **squad walk v2**, clubs from the proven contract chain, and probing per
  list entry (direct + [entry+0x00..0x80]) against the known person addresses; the
  winning offset goes into the diagnostics ("entry→person-offsets"). Yields per player
  `teamType` (0=1st, ~3=reserves, ≥10=youth) and the team division (youth → youth competition).
  App side done: chips "Alles · 1e elftal · 2e elftal · Jeugd" appear under the
  "My club" checkbox as soon as teamType data is present (old dumps → invisible). Tested
  with simulated data (24/19/18 splits correctly). Check after F9 with v0.1.10: are the
  counts per team and the offsets histogram in diagnostics correct?
- Filtering on individual attributes / attribute thresholds (e.g. "Pace ≥ 15").
- Quick buttons: wonderkids, expiring contracts, free agents.
- Role comparison between shortlist players; export of the comparison.

## 17. Potential projection recalibrated on the own database - DONE (14-07)

mavarobli's observation: wonderkids (e.g. Sinky Petersen, CA 102 / PA 180) got almost everything at 20.
Cause: the projection scaled each attribute by ×PA/CA, but FM's CA scale has a large
base. Large-scale measurement over the real dump (`tools/ca-analysis.js`, 43,905 outfield players +
4,964 goalkeepers):
- attribute total ≈ 148 + **2.1 × CA** (r = 0.91; goalkeepers 169 + 2.2 × CA), the old model
  therefore handed out up to ~75% too many growth points;
- even CA-170+ players have on average only **0.23 attributes at 20** and ~3.5 ≥ 18
  (top-5 average 17.6);
- the age effect within a CA band is small (±3%), position spread sd ≈ 18-27 points.

**v2 (budget model)**: growth budget = T(PA) − T(CA) from measured bucket averages, distributed with
type weighting + damping toward the cap. Better, but mavarobli rightly saw that wonderkids still became
too complete all-rounders (a full-back with Crossing 16 and Marking 17 and Heading 19).

**v3 (position-profile model, 14-07, current)**: second measurement (`tools/pos-curve.js`), which
attributes grow with CA differs strongly per position. Per position group (GK/DC/FB/DM/MC/
W/AMC/ST + ALL fallback) the average profile is measured at CA anchors 80/110/140/170
(validation: anchor-170 deviates at most ~1 point from real CA-165+ profiles). Projection = own
value + (position norm(PA) − position norm(CA)), averaged over the player's positions;
physical growth extra damped for 24+. Personal strengths/weaknesses are preserved, the
position shape is right: Sinky Petersen (DR, CA 102/PA 180) goes from ~everything-20 (v1) to avg 13.9
with Finishing 9 and only his existing outliers at 20. Table in app.js generated with
`node tools/pos-curve.js`, rerun and replace on a new database/patch.

## 19. Scan parallelized - DONE (15-07, v0.1.30)

After the cleanup (14/15) the main scan remained the bottleneck at ~17s; it is
entirely walking the heap (95% of the F9 time). The memory regions are
independent, so they are now distributed round-robin across **N workers (cores−1)**:
each worker reads into its own buffer and collects into its own collections, which are
merged lock-free after `Task.WaitAll`. Result on mavarobli's 16-core machine
(15 workers): **main scan 17,134 → 8,438 ms**, total F9 **18.1s → 9.8s** (~halved).
No linear scaling with cores because the scan is memory-bandwidth bound
(the whole heap is copied via ReadProcessMemory), ~2× is the realistic
ceiling. Data integrity verified unchanged (48.9k players, 32.5k staff,
loan/club linking consistent). Implementation note: `Task.Run` instead of
`Parallel.ForEach`, because an Il2Cpp reference contains a stripped `NullableAttribute`
which makes the compiler stumble over Parallel's annotated delegate; a
parameterless Task lambda works around that. The "Fasen" line in `diagnostics.txt` stays
as cheap, permanent perf diagnostics.

## 18. Distribution / launch - OPEN (13-07-2026)

Market research done: see the comparison table in the README (Genie Scout 26 / FMST 26 / FMRTE 26
are the direct competitors; FMST 26 itself only launched July 2026 with nearly the same promise).
Still to do before wide distribution:

- **GitHub Release v1.0.0 - PUBLISHED (15-07)**: repo set to public, old test release
  ("FmSuperScout V1.0", tag `stable-version`, 12-07) removed, and v1.0.0 published with
  `FMSuperScout-Setup.exe` + `.sha256` as assets and `docs/release-notes-v1.0.0.md` as text
  (incl. SHA-256, VirusTotal link, SmartScreen explanation, Epic/Xbox beta caveat). The .exe
  was tested end-to-end by mavarobli (wizard, Steam detection, shortcuts, F9); `gh` CLI
  installed and linked (account mavarobli).
- **Screenshot/GIF for the README** - the app itself works fine (tested against the real dump, 48k+
  players), but an automated browser screenshot of the local server kept hanging
  (probably due to the fast status-poll loop, not the app). mavarobli will record a short
  screen capture of the workflow himself (F9 → filter → compare) - that gives a stronger image
  anyway than a static list.
- Forum post drafts (fmscout.com FM26-tools, r/footballmanagergames, FM-Arena) are ready in
  `private/marketing-drafts.md` (gitignored, deliberately not in the public repo). Only post
  after explicit approval per post.
