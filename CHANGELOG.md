# Changelog

Notable changes per release. The installer only picks up app and plugin changes when a
new release is built, so the Unreleased section below is what the next release ships.

## [Unreleased]

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
