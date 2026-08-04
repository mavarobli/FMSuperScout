# Changelog

Notable changes per release. The installer only picks up app and plugin changes when a
new release is built, so the Unreleased section below is what the next release ships.

## [Unreleased]

### Added
- Women's football as a setting (requested on the forum). Toggle "Include women's
  football" in settings; the plugin (0.1.46) reads the choice at the next F9 and scans
  the women's database too. Off by default so men's saves stay lean. Women's players
  carry a `gender` field in the dump for future filtering.
- French and German as app languages, next to Dutch and English. Full translations of the
  UI, help texts, attribute names (following common FM terminology; corrections from
  native speakers welcome), role names, player card and squad analysis. Number and date
  formatting follows the chosen language. A key-parity test guards that every language
  stays complete.
- Language-independent nations (fixes the core of issue #15): the plugin dumps FM's
  stable nation ID (`natId`) next to the name, and the app carries a 228-nation table
  (nations.js) with names in all four app languages plus an EU/EEA flag. Nation display
  and the EU check now work whatever language the game runs in. The EU flag follows
  citizenship, so French and Dutch overseas territories (Guadeloupe, Curaçao, Tahiti and
  the like) now correctly count as EU. Old dumps without `natId` fall back to name
  matching as before.
- Wage per week, month or year: new setting next to the currency. The wage column
  header, profile, comparison, player card and the max-wage filter all follow the chosen
  period; data stays weekly internally.
- Staff roles translate with the app language: the plugin dumps the job byte (`jobId`,
  plugin 0.1.45) and the app translates it (NL/EN/FR/DE). The staff-role filter keeps
  raw values, so saved presets survive language switches. Old dumps show the Dutch
  strings as before.

### Changed
- Help tooltips now appear after a short delay (450 ms) instead of instantly, so moving
  the mouse across the table no longer flashes "click = copy name" on every row. Moving
  directly from one tooltip target to the next still shows instantly.
- Help texts rewritten: shorter and more concrete (meta, PA meta, interest, growth,
  availability).
- With a non-Dutch app language, nation names from a Dutch-language dump now display in
  English instead of Dutch.
- Goalkeeper meta score. Keepers now get a meta score with their own weighting, taken from
  harvestgreen22's FM24 keeper attribute retest on FM-Arena (Reflexes and Agility count
  heaviest). Same Meta column, profile line, comparison and player card as outfield players.
- PA meta: the meta weighting applied to the attributes a player is expected to have at his
  potential (position-realistic projection, physical growth fades after 23). New sortable
  column next to Meta, a filter row under Quality & age, and a profile line for players with
  room left to grow. Hidden by both the hidden-stats toggle and the meta toggle.

## [1.4.2] - 2026-08-04

Plugin: v0.1.43. A crash fix and a scan that adapts to the machine it runs on.

### Fixed
- "Index was out of range (Parameter 'startIndex')" dump failures (issue #16). A corrupt
  metadata pointer near the top of the 64-bit address space caused an integer overflow
  in a bounds check, producing a negative array index during the scan. It depended on
  heap contents, so it started suddenly and then failed on every retry. The bounds check
  is now overflow-safe, and one broken scan region can no longer fail the whole dump:
  it counts as unreadable and the scan continues.
- Scanning is fast again (1.4.1 regression). The snapshot read from 1.4.1 slowed every
  scan down, and on memory-pressed machines the snapshot itself failed with Win32 1450
  (issue #13) and fell back to a live scan anyway. The scan now reads live by default
  and retries once from a snapshot when the live pass could not read more than 10% of
  FM's memory.

### Changed
- Lower memory footprint: read buffers and module caches are allocated once and reused,
  the worker count drops when physical memory is low, the module cache is skipped when
  it does not fit, and the plugin compacts its heap after every scan.
- Better field reports: every scan logs free physical/commit memory and the read source,
  diagnostics.txt records both plus per-phase timing, and "Report a problem…" embeds
  that telemetry in the prefilled GitHub issue. The unreadable-memory error now names
  the likely cause and the fix.
- Settings menu restructured: preferences on top, then version with a "Check for
  updates" action (skips the 20-hour cache, reopens a dismissed notice), then "Report
  a problem…".

## [1.4.1] - 2026-08-03

Plugin: v0.1.42. One fundamental change and one performance pass, both aimed at the same
goal: trustworthy data, snappy app.

### Changed
- Performance: derived per-player values (meta score, estimated value, asking price,
  interest, contract months, the name/club search string) are now computed once per dump
  instead of for every row on every keystroke. Measured on a 51k-player dump: a full
  meta pass dropped from 22 ms to 2 ms, sorting on meta or value from 73 ms to ~44 ms,
  and typing while filtered stays allocation-free. At 300k players the difference is
  hundreds of milliseconds per keystroke. Results are byte-identical; caches die with
  the dump they belong to.
- Performance: scrolling skips the re-render entirely when the visible row window has
  not moved (horizontal scrolls, sub-row wheel deltas), and typing no longer rebuilds
  the table header on every keystroke (mode, language and column changes still do).
- The scan now reads from a frozen point-in-time snapshot of FM's memory (a copy-on-write
  VA clone, captured in about a millisecond) instead of from the live, running process.
  This removes the root cause behind the whole "partially readable scan" class of
  problems: on big saves a 15-30 second scan raced against FM freeing memory, which
  produced shrunken dumps in the past and false "could not read X% of FM's memory"
  refusals in 1.4.0 (reported on the forum right after release). Everything FM frees or
  rewrites during the scan stays readable in the snapshot, so the scan is now a
  consistent picture of one moment. The 10% guard from 1.4.0 stays as a backstop, but
  should no longer fire on a loaded save. If the snapshot cannot be made (old Windows,
  restricted rights), the plugin logs it with the exact Windows error code and falls
  back to live reading as before, still protected by the 1.4.0 guards; diagnostics.txt
  states which mode was used. Honest trade-off: reading from the frozen snapshot is
  slower, measured ~12.6s versus ~8s for the scan phase on a 51k-player save. That is
  the price of a scan that cannot be corrupted by the game running underneath it, and it
  only affects the F9/New data action, never the app itself.

## [1.4.0] - 2026-08-03

Plugin: v0.1.41. Two themes: stability (the whole "works on my machine, buggy on yours"
class of problems, traced through issue reports, attached logs and a full code review)
and USD support.

### Added
- USD as a third currency next to GBP and EUR. Like the euro, the rate is FM26's own
  fixed one (frozen around the mid-2025 database lock): £1 = $1.35. All money in the
  dump stays internal GBP; only display and filter input convert.

### Fixed

App:
- The local server no longer dies on a file race with the plugin (a stat or stream read
  colliding with an F9 rewrite of dump.json). This was the likely source of the "Lost
  connection to the local server" reports: the process simply crashed. Streams now abort
  cleanly and one unexpected error can no longer take the server down.
- No more false "FM26 is not picking up the request" after a fast successful scan. The
  15-second watchdog is cancelled as soon as the plugin reports scanning, done or error;
  previously a small save could scan entirely between two polls and still get the red
  banner. The very first dump on a fresh install now auto-loads too, and the banner links
  straight to the troubleshooting fix when the request genuinely goes unanswered.
- The app reads its data folder from %LOCALAPPDATA%, like the plugin, instead of deriving
  it from the home folder. On redirected Windows profiles the two pointed at different
  places: F9 worked, the app stayed empty forever.
- A stalled scan is detected: status "scanning" with a status file older than 15 seconds
  now says the scan appears to have stopped, instead of an eternal progress bar when FM
  was closed or crashed mid-scan.
- Growth: a reference period longer than the recorded history no longer marks every
  player as "new"; the reference date clamps to the earliest snapshot (as the code
  comment already promised).
- EU/EEA detection recognises nation names in German, French, Spanish, Italian,
  Portuguese, Hungarian and Turkish, next to Dutch and English. FM writes nation names in
  its interface language; in an unrecognised language the EU filter matched nobody and
  every under-18 was treated as a non-EU minor. A language-independent nation ID stays on
  the backlog as the structural fix.
- Billions were labeled " mld" (Dutch) even with the app in English; now "B" in English.
- An unknown currency or language value in localStorage (older version, synced profile)
  no longer produces NaN prices or a blank app; both fall back to a valid default.
- The reload button on the error screen accidentally passed force=true and bypassed the
  crash detector it was supposed to respect.
- In-game dates are parsed as local midnight; west of UTC, ages and the season boundary
  could shift by a day.
- CSV export revokes its download URL after five seconds instead of immediately; Firefox
  could abort the download.
- Presets: the growth period no longer counts as an active filter, so the "no active
  filters to save" warning works again.
- Table cells and detail fields that render game strings without a custom renderer
  (nationality, foot, staff role, position, compare header) now escape HTML, matching
  the existing escaping of names and clubs. Only relevant for custom databases with
  markup in names, but now consistent.

Plugin (v0.1.41):
- A partially readable scan can no longer overwrite a good dump.json. Unreadable memory
  is retried in 1 MB windows and counted; if more than 10% stayed unreadable (typically a
  scan during save load/unload), the existing dump is kept and a clear error is shown.
- A click on New data can no longer be lost to a half-written request flag: the flag is
  validated before deletion, and a fresh-but-garbled flag gets one retry tick instead of
  being discarded as expired.
- After a mid-write failure (full disk, antivirus lock) the temp-file handle is released
  immediately; follow-up dumps no longer fail on "file in use" until FM restarts.
- status.json is written atomically (tmp + rename), player/staff counts no longer flap to
  zero during the JSON write phase, and error texts containing control characters no
  longer produce unreadable JSON exactly when an error needed displaying.
- Objects sitting precisely on a 32 MB scan-chunk boundary are no longer missed (windows
  now overlap by 16 bytes).
- A corrupt day-of-year 366 in a non-leap year no longer rolls a contract date into
  January 1 of the following year.

### Changed
- Troubleshooting: new section 4d on the "FM26 is not picking up the request" loop
  caused by FM26 relaunching itself during startup, which makes the mod loader skip
  the process you actually play in (UnityDoorstop #34). Documents the check
  (LogOutput.log frozen at an older session) and the `steam_appid.txt` fix from
  issue #7. Section 4c now points there.

## [1.3.1] - 2026-07-27

Plugin: v0.1.40. Two bug reports, one shared root: an empty or older dump was treated
worse than it deserved, and in one case the app destroyed good data.

### Fixed
- The plugin no longer writes an empty dump over a good one. A dump triggered while FM26
  was still starting up (before the game database module is loaded) used to overwrite
  dump.json with zero players. It now stops with a clear message and leaves the existing
  dump alone. The same guard applies whenever a scan finds zero players and zero staff,
  which on a loaded save never legitimately happens.
- A leftover data request no longer fires a dump during FM's next startup. The request
  the app writes for "New data" now expires after two minutes; the plugin ignores and
  removes anything older. Previously a request written moments before FM closed was
  picked up seconds into the next launch, producing exactly the empty dump above.
- Dumps made by a plugin older than 0.1.34 load again. Since 1.2.0 the app refused them
  with a misleading "the dump is incomplete" error, because it demanded a meta field that
  old plugins never wrote. A complete old dump now loads normally and shows a banner
  suggesting a fresh F9 instead. Genuinely incomplete files are still rejected.
- The "could not load" screen now has a "New data" button, so there is a way to request
  a fresh dump right where the problem shows up, next to Try again and Report a problem.

## [1.3.0] - 2026-07-26

Plugin: v0.1.39.

### Added
- Growth: a Development section in the sidebar with a reference period (since last dump,
  6 months, a year, this season, all history), a Growth column showing CA gained since
  that date in green or red, and filters for a growth range and for players who did not
  exist yet at that date. Built entirely on the snapshots the app already stored, so no
  extra data is collected. Players whose earliest record is too thin (CA under 40) stay
  blank rather than reporting a nonsense jump, and new players sort to the bottom instead
  of counting as zero growth.
- Intake Radar: after a youth intake, a bar above the list says how many newgens appeared
  worldwide since your last dump and who the best prospect is. One click filters to them,
  sorted by potential. It recognises an intake by shape (a burst of new players who are
  nearly all 17 or under), which on a real save finds all seven intakes across two
  seasons, including the southern-hemisphere round, without firing on transfer windows.
  No other tool can do this: it takes a memory of yesterday to know who is new.
- Season report: when your in-game season crosses July 1st, a small dismissible card
  shows what the tool did for you that season (profiles viewed, database loads, cards
  shared, shortlist size) with the coffee question underneath. Once per football season,
  never more often. It replaces the old milestone nudges at 25/500/2000 viewed profiles.
  Two footer links silence it forever: "Already donated?" also turns the coffee icon
  gold as a thank-you.
- Wonderkid filter: one tick for players aged 21 or under with a PA of 150+ and at least
  25 points of growth left. On a 51k player save that is 556 names.
- Height and preferred-foot filters, in a new Physical section in the sidebar. The foot
  options are built from your own save, so they follow the language FM runs in.

### Changed
- Development charts on the player profile now show the change over the period, in green
  for progress and red for decline, next to the CA/PA and Value headings.
- The chart's axis labels are the player's real high and low instead of the padded edge of
  the axis. A keeper with PA 168 had "172" written above his line, which is a number that
  never occurred in his save.
- Chart tooltips are app-styled instead of the bare Windows popup, and they show the date
  and CA. PA is only added when it actually moved during the period, which for most players
  it does not. The same treatment was applied to the rest of the data: player names, the
  meta and interest cells, squad-depth dots and the comparison bars no longer produce a
  Windows popup. Icon buttons keep their plain labels, which is what screen readers expect.
- Clearer handling of the slow first FM launch. The app now checks whether the mod
  layer finished setting itself up, and if not it says so on the empty screen instead
  of telling you to press F9. The installer's closing page leads with the warning, and
  troubleshooting opens with a section for "FM will not start" rather than burying it
  under "no players loaded". Someone reported FM refusing to load after installing,
  which is what an unfinished first launch looks like from the outside.
- The Interest column and filter now carry a "?" that explains what the score means.
  Two people asked whether it was clubs being interested in the player or the player
  being willing to come. It is the second one, and the tooltip also says plainly that
  it is an estimate: FM only works this out during a negotiation, where your actual
  offer counts too.
- The coffee icon's occasional glow now happens right after the tool gave you something:
  your database finishing loading (from the third load onwards), a saved player card or
  an exported shortlist. At most once a day, never while the season report is open, and
  a click anywhere no longer kills it. It used to run off a random timer 20 to 90 seconds
  after startup and switched itself off after four clicks anywhere in the app, which in a
  tool you click through constantly meant it was almost never visible at all.
- The wonderkid bar is stricter. It used to be age plus growth room only, which nearly
  every sixteen-year-old clears: 28% of a real database qualified. Adding the PA
  requirement brings that to 1%. The gold player card follows the same rule, so gold
  now means something.

### Fixed
- Loaned players now show up under "My club" and in the list. A player who appears in
  two club squads was assigned to whichever club had him in the most senior team, which
  for a loan is a coin flip: pick the parent club and the loan becomes invisible, because
  current club and parent club end up identical. The parent club is already known from
  the contract, so the other squad is now taken as where he actually plays. Verified on
  a 51,845 player save: 429 loans instead of 167, and a club that showed 3 of its 12
  loaned-out players now shows all 12.
- Ghost players no longer show up in the list. FM pre-generates newgens in memory
  (for example ahead of the youth intake) before they exist in the game world; they
  appeared as clubless "free agents" with great stats that you could never find or
  sign in FM (several hundred per save, more around intake time). Recognizable by
  the unset-reputation sentinel; real free agents always carry a reputation value.

## [1.2.0] - 2026-07-20

Plugin: v0.1.38.

### Added
- Shareable player card: saves a PNG per player in FM's own visual language: scout
  stars for current and potential ability, the full attribute grid in FM colours,
  best roles, finances, reputation, injury risk and transfer status. Gold card +
  badge for wonderkids, NL/EN labels, respects the hidden-stats and meta toggles.
- Development trends: every dump adds a delta-only local snapshot (CA, PA, value);
  profiles show mini charts once a player has history over two in-game dates.
  Rewinding to an older save discards the stale future points.
- Transfer status filter: the transfer-listed checkbox is now a dropdown (All /
  For sale / For loan / Either); old presets map automatically. Players on loan
  show in blue with their parent club; profiles get a "for loan" tag.
- Player profile can open as a centered popup instead of the side panel
  (Settings > Player profile).
- One-click update: the update notification downloads the installer, verifies its
  SHA-256 against the release and starts it. The installer force-closes a running
  app, so updating works with the app open.
- Separate "Show meta score" toggle, so meta and CA/PA can be hidden independently.
- Repin tooling for FM patches: diagnostics.txt prints hints when the game version
  deviates, docs/repin-guide.md documents the recovery workflow.
- The coffee icon gets a soft glow now and then (at most once per 8 hours).

### Fixed
- "New data" no longer fails with a bare "!" after playing FM for a while (browser
  timer throttling starved the heartbeat and stopped the local server); a real
  server loss now shows a clear message.
- Goalkeepers show "–" for meta (card and table), tooltips are app-styled instead
  of Windows popups, no more stray dots behind the shortlist stars, no stretched
  lone CA/PA chart, four untranslated Dutch strings gone from the English UI.
- Sorting large databases is roughly 10x faster (sort key computed once per row).
- Hardening round after an external code review: dumps and history are written
  atomically and half-written dumps are refused with a clear message; the local
  server rejects foreign-origin requests on top of the localhost Host pinning;
  the memory scan caps its workers (0.5-1 GB less RAM on many-core machines, the
  likely cause of OOM reports on big saves); per-dump plugin state fully resets
  between careers; corrupt browser storage no longer blanks the app; FM names are
  HTML-escaped; "Clear filters" also resets the team chip; age-unknown players no
  longer count as wonderkids; the updater gets a 30s network timeout and confirms
  the installer started before shutting down.

## [1.1.1] - 2026-07-17

Plugin: v0.1.35.

### Fixed
- Huge dumps (600+ MB, saves with 100+ playable leagues) now load fast and reliably.
  Repeated strings (club, division, contract dates, positions) are deduplicated while
  parsing and the parser yields to the UI every 8 MB instead of every 32 MB: a 611 MB
  test dump with 635k people now loads in about 17 seconds with a ~520 MB memory peak,
  where it previously froze the app for 90+ seconds. The plugin (v0.1.35) also stops
  writing the unused searchName field, which shrinks every dump.
- If loading still crashes the app window (out of memory on machines where FM26 uses
  most of the RAM), the app now detects the crashed attempt on the next start and shows
  a hint (close FM26, the dump is already on disk) with a Try again button, instead of
  silently crash-looping on every start.
- "New data" no longer hangs forever when FM26 does not pick up the request. The plugin
  (v0.1.35) now polls the web-app trigger on its own background thread instead of inside
  Unity's Update loop, which in some game sessions never ticks for injected plugins (F9
  died along with it). The app also shows a hint after 15 seconds if the scan has not
  started, instead of an endless "reading player data" banner.
- Player/staff double-count (plugin v0.1.35): every person carries a non-player/coaching
  facet next to its player data, so nearly every player was also picked up as "staff" and
  counted twice, roughly doubling the dump on large saves. Staff now excludes any uid that
  is already a player (player-coaches keep showing as players); real coaches, scouts and
  physios are unaffected. diagnostics.txt reports raw staff, the overlap removed, and net
  staff. This also roughly halves the dump size on big saves.
- A dump that fails to load (parse or out-of-memory, seen on very large saves with many
  leagues loaded) no longer leaves a silent empty screen with the misleading "press F9"
  steps. The empty screen now shows the failure, the dump size on disk and the error
  detail, with Try again and Report a problem buttons. The bug report now also includes
  the dump size on disk and the load error, so those reports are actionable at a glance.

## [1.1.0] - 2026-07-17

### Added
- Update notification: the app checks the latest GitHub release about once a day and
  shows a dismissible pill in the top bar when a newer version exists. No auto-install,
  just a link; fails silently when offline.
- Report a problem: button in the settings menu and on the empty screen. Opens a
  GitHub issue with app, plugin and game versions pre-filled, plus instructions on
  which diagnostic files to attach. The dump now includes the plugin version
  (plugin v0.1.34) and there is a TROUBLESHOOTING.md for the common "no players
  loaded" causes (antivirus quarantining the BepInEx loader is the usual one).
- Attribute filter: filter on any attribute with min/max thresholds ("Pace >= 15"),
  including hidden characteristics and personality. Opens as a popup from the filter
  sidebar, rules combine with AND, active rules show as removable chips and are saved
  in filter presets. Hidden-data rules pause while hidden stats are off.
- Ko-fi nudge now has usage milestones: 25, 500 and 2000 viewed profiles, 3 times ever,
  at least 14 days apart. Was a single nudge at 25.

### Changed
- The three contract checkboxes (free agent, expiring within 6 months, within 1 year)
  merged into one contract status dropdown. Old presets that used the checkboxes still
  apply correctly.
- The "Attainable" checkbox is gone: it only checked whether a player could leave his
  club, which the contract dropdown and transfer-listed filter now cover, and its name
  wrongly suggested "attainable for you" (that question is the Interest filter). The
  green "Available" tag on player profiles stays, now with an explanatory tooltip.
- Attribute filter polish: the selected attribute is actually visible now (a CSS clash
  squeezed the dropdown to 17px), column headers in the popup, goalkeeper duplicates
  removed from the list. Active rules show only as chips above the table plus a count
  on the button; the extra list in the sidebar was redundant.
- Tidier filter sidebar (39% shorter on first use): secondary sections (presets, role,
  financial, origin and competition merged into one, availability) start collapsed,
  your own open/closed clicks are remembered as before, and section headers get a dot
  when a filter inside them is active, so nothing hides silently.
- The small "clear" button next to the Position header is gone; the position chip above
  the table and Clear filters already cover it.
- The attribute picker in the popup is now a combobox: your active rules sit at the
  top, click the attribute field and the full grouped list drops down, or just type
  to filter it ("kop" shows Heading, Enter picks the top match). Attributes already
  in use disappear from the list, "+ attribute" adds a row with the picker already
  open, and the popup is roomier (space for about 5 rules).
- Attributes within each group are now sorted alphabetically in the app language,
  the way FM itself orders them. Applies to the player profile, the comparison
  panels and the attribute filter list.
- Shorter, simpler meta score explanation in the tooltip (NL and EN).

### Fixed
- Foot value (Right/Left/Both) now follows the app language instead of always Dutch.
- Nationality names translate to English when the app language is English. Note:
  division and club names come straight from the game's memory in the game's language;
  play FM in English to get those in English.
- The hidden-stats toggle now also hides the meta score and asking price, everywhere:
  table columns, player profile, comparison, CSV export, and their filters and sort.
- The column picker no longer lists CA, PA, Meta and Asking price while hidden stats
  are off.
- Contract dates display as dd-mm-yyyy. CSV export keeps ISO dates for spreadsheets.

## [1.0.0] - 2026-07-15

First public release.

- Standalone installer: viewer, BepInEx 6 and the plugin in one .exe, with automatic
  FM26 folder detection (Steam incl. extra libraries; Epic and Xbox/Game Pass in beta).
- F9 dumps the full loaded database (45k+ players, 30k+ staff) in about 10 seconds.
- Search, filters, smart division search, role ratings (19 FM roles), FM-style player
  comparison (up to 3), squad needs analysis, saved filter presets, shortlist with CSV
  export, meta score (FM-Arena weights), transfer value read from memory with a
  calibrated estimate as fallback, asking-price and transfer-interest estimates.
- Loan detection (red = out on loan, blue = loaned in) under "My club".
- NL/EN interface, GBP/EUR, hidden-stats toggle.
