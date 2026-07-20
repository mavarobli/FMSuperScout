# Changelog

Notable changes per release. The installer only picks up app and plugin changes when a
new release is built, so the Unreleased section below is what the next release ships.

## [1.2.0] - 2026-07-20

Plugin: v0.1.38.

### Fixed
- "New data" no longer sometimes fails with a bare "!" after playing FM for a while.
  Cause: browsers throttle timers in background windows, the heartbeat went quiet and
  the local server shut itself down mid-session. The shutdown threshold is now 90
  seconds, every API request counts as a sign of life, the window sends an immediate
  heartbeat when refocused, and if the server really is gone the app says so in a
  clear banner instead of "!".
- Goalkeepers show "–" for meta instead of a made-up average, on the card and in the
  meta column of the table (which showed a dot).
- The help texts (the "?" hints) now show as app-styled tooltips instead of the bare
  Windows title popups, and they follow the app language live.
- The development section no longer stretches a lone CA/PA chart across the full
  profile width (huge text) when a player has no stored market value to chart.
- No more stray dots after the shortlist stars when the window is not full screen:
  the star column clips instead of showing a text ellipsis.
- Four untranslated Dutch strings no longer show in the English UI: the copy-name
  tooltip on every table row, the copy button on the profile, the "unknown club"
  tooltip and the empty-shortlist toast.
- Sorting computes the sort key once per row instead of once per comparison and
  reuses a single Intl.Collator for text. Sorting by meta score or name on large
  databases is roughly an order of magnitude faster.
- The local server only accepts requests with a real localhost Host header (403
  otherwise). This closes the DNS-rebinding hole where a malicious website could
  reach the local API, which matters now that the API can start an update install.
- Release-hardening round (external code review by Codex, verified and fixed):
  - The plugin now writes dump.json atomically (via a .tmp file and rename) and the
    app refuses to load an incomplete dump, with a clear "FM was probably still
    writing it" message. Previously a dump read mid-write, or a truncated stream,
    could silently show (and store in history) half a player list.
  - Cross-site protection on top of the Host check: any request carrying a non-local
    Origin gets a 403, and /api/bye only accepts POST, so a malicious website can no
    longer trigger an update install, a dump or a server shutdown from the browser.
  - The memory scan caps its parallel workers at 8. Each worker carries a 32 MB read
    buffer, so "cores minus one" meant 0.5-1 GB extra RAM on 16/32-core machines: the
    likely culprit behind out-of-memory reports on big saves. Above ~8 workers the
    bottleneck is memory reading anyway, so scans stay just as fast.
  - The plugin resets all per-dump state (manager, club, reputation, season year,
    diagnostics) at the start of every dump, so a failed detection can no longer
    silently reuse the previous career's club badge, My club filter or history.
  - Corrupt browser storage (one bad JSON value) no longer crashes the app into a
    blank screen before the error screen exists: broken keys reset to defaults.
  - Manager, club and staff-role names from FM memory are HTML-escaped before
    rendering, and the history file is written atomically like the dump.
  - "Clear filters" now also resets the first-team/reserves/youth chip under My club.
  - Players with an unknown age (0) no longer count as wonderkids on the player card
    or as young talents in squad analysis.
  - The one-click updater gets a 30-second network timeout (a silent connection now
    falls back to the release-page link instead of hanging on "downloading") and only
    shuts the server down after Windows confirms the installer process really started.

### Added
- Shareable player card: a button on the player profile saves a 1200x1600 PNG in
  FMSuperScout style, built from FM's own visual language so FM players read it at a
  glance: scout star ratings for current and potential ability, the full three-column
  attribute grid with FM-style colouring (green chips for 16+, a wall of green for that
  one insane regen), best two roles, a finance panel (value, asking price, wage,
  contract), reputation, injury risk and transfer status, plus the meta score as a hex
  chip. Card accent follows CA (elite green / strong blue / neutral); wonderkids (21 or
  younger, PA at least 25 above CA) get a gold card with a badge. Labels follow the app
  language (NL/EN). With hidden stats off the card keeps the stars (visible scout info
  in FM) but drops the raw CA/PA numbers and asking price; the meta chip follows the
  meta toggle.
- The meta score now has its own "Show meta score" toggle in Settings, separate from the
  hidden-stats toggle, so you can hide CA/PA and the hidden characteristics while keeping
  meta, or vice versa. The estimated-potential toggle is now correctly hidden when hidden
  stats are off (it is derived from PA).
- Development trends: every loaded dump adds a compact snapshot per player (CA, PA,
  value) to a local history, stored delta-only so it stays small (a 49k-player save:
  ~2 MB baseline, then a few hundred KB per snapshot with real changes; value noise
  under 2.5% is ignored). The player profile shows a Development section with two
  mini charts (CA/PA and value) once a player has history; dots mark real changes,
  tooltips show the exact numbers per dump date. Reloading an older save (rewind)
  discards the now-invalid future points; history is kept per manager under
  %LOCALAPPDATA%\FMSuperScout\history. With hidden stats off you only see the value
  chart. Charts need plugin dumps from two different in-game dates to appear.
- The installer now force-closes a running FMSuperScout app before updating
  (CloseApplications), so the one-click update also works when you leave the app
  open. The FM26-running check with retry dialog already existed.
- Maintenance tooling for FM patches: diagnostics.txt prints repin hints whenever the
  game version deviates from the pinned one, and docs/repin-guide.md documents the
  full recovery workflow.
- Transfer status filter: the transfer-listed checkbox is now a dropdown with All /
  For sale / For loan / For sale or loan. Loan-listed data comes from plugin v0.1.36
  (contract flags bit 1, pin still to be confirmed in-game; diagnostics.txt shows a
  bit histogram and a sample of loan-listed players to verify against FM). Old presets
  that used the checkbox map to "For sale" automatically. Player profiles show a
  "for loan" tag.
- Players on loan show in blue in the table (parent club in the name tooltip and on
  the profile). Under the My club filter, own players parked elsewhere stay red.
- Player profile can open as a centered popup instead of the right-side panel:
  new setting under Settings > Player profile. Escape, the close button or a click
  next to the popup closes it.
- The coffee icon gets a soft glow now and then (at most once per 8 hours, on a
  random subset of app starts, 20-90 s after opening). It fades after a few clicks
  anywhere in the app or after 90 seconds.
- One-click update: clicking the update notification now downloads the new installer
  from GitHub, verifies its SHA-256 against the release and starts it, with progress
  shown in the pill. Falls back to a link to the release page if anything fails.

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
