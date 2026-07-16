# Changelog

Notable changes per release. The installer only picks up app and plugin changes when a
new release is built, so the Unreleased section below is what the next release ships.

## [Unreleased]

### Added
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
