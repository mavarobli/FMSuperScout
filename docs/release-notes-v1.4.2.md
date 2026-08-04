# FMSuperScout 1.4.2 — fast scans back, crash fixed at the root

Two field reports (issues #13 and #16) led straight to this release: one real bug that
could kill every scan in a session, and a hard lesson about 1.4.1's snapshot approach.

## The "Index was out of range (startIndex)" failure is fixed

If your dumps suddenly started failing with `Index was out of range. Must be
non-negative... (Parameter 'startIndex')` — that was a genuine bug, and an old one. A
corrupt metadata pointer near the very top of the 64-bit address space made an internal
bounds check wrap around, producing a negative array index deep in the scan. Whether you
hit it depended on what happened to be in FM's memory at that moment, which is why it
appeared out of nowhere and then failed every retry. The bounds math is now
overflow-safe, and as a second line of defence a single broken scan region can no longer
take down the whole dump: it is counted as unreadable and the scan moves on.

## Scans are fast again — the snapshot is now a fallback, not the default

1.4.1 made every scan read from a frozen memory snapshot. Honest verdict after two days
in the field: wrong default. It made every scan slower, and on machines already tight on
memory the snapshot itself failed (`Win32 1450: insufficient system resources`), falling
back to exactly the live scan it was meant to replace.

1.4.2 flips the order. The scan reads live by default — the fast pre-1.4.1 way — and
only retries once from a frozen snapshot when the live pass could not read more than 10%
of FM's memory. In practice: fast machines never pay the snapshot cost, and the retry
quietly rescues scans made while the game is still loading or simulating.

## The scan now adapts to your machine

Big saves on modest hardware were the common thread in recent reports, so the plugin now
behaves accordingly: read buffers and caches are allocated once and reused (repeated
scans no longer grow FM's memory footprint), the worker count drops when free memory is
low, the big module cache is skipped when it would not fit, and the plugin compacts its
heap after every scan. If memory pressure still wins, the error message now says so in
plain language — close other apps, check your page file, or reboot — instead of leaving
you guessing.

## Better problem reports, and a manual update check

- "Report a problem…" now auto-embeds the last scan's telemetry (read source, free
  memory, per-phase timing) in the prefilled GitHub issue, so a report is useful even if
  you forget the attachments.
- The settings menu was restructured, and next to the version you'll find a new
  "Check for updates" action that checks GitHub immediately instead of waiting for the
  automatic daily check.

The plugin is now v0.1.43 and updates automatically with the installer. Settings and
shortlist are kept: run the setup over your current install, close FM26 first.

**SHA-256** `FMSuperScout-Setup.exe`: `2aed3eb52b02a916c365175001079a46bd71a274ee805edc3e954ae3eefac092`
