# FMSuperScout 1.5.0

The community release: most of this list started as a request on FM-Arena or GitHub.

## Meta for everyone

- **Goalkeeper meta score.** Keepers now get a meta rating, weighted by
  [harvestgreen22's keeper attribute retest](https://fm-arena.com/thread/18816-fm24-i-re-tested-the-goalkeeper-s-attributes-using-newer-test-league/)
  (Reflexes and Agility count heaviest). Measured numbers, same as the outfield score.
- **PA meta.** The meta score a player projects to at his potential, following the
  measured growth profile of his position group. Sortable column, filter and profile
  line. Sort on it to find tomorrow's meta stars.

## Four languages, language-proof data

- French and German join English and Dutch: full UI, help texts, attribute, role and
  staff-role names. Corrections from native speakers are welcome.
- Nation names and the EU check now work via FM's internal nation IDs, whatever
  language your game runs in (fixes #15). Staff roles translate too (plugin 0.1.46).

## Women's football

- New "Database" setting: scan men, women or both. With both, a gender filter appears
  in the sidebar. Defaults to men, so existing saves stay unchanged.

## Quality of life

- Wages per week, month or year, next to the existing GBP/EUR/USD choice.
- Restructured settings menu with a manual "Check for updates" action.
- Help tooltips appear after a short delay instead of instantly, and help texts are
  shorter and more concrete.
- "Report a problem" auto-embeds the last scan's telemetry, so reports are useful even
  without attachments.

The plugin updates automatically with the installer: run the setup over your current
install with FM26 closed. Settings and shortlist are kept.

**SHA-256** `FMSuperScout-Setup.exe`: `86977be2a4bd8bbc26e8eb00d934bfe66350f8649387ef44c242dcc46bc51a3e`
