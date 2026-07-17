# Changelog

Notable changes per release. The installer only picks up app and plugin changes when a
new release is built, so the Unreleased section below is what the next release ships.

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
