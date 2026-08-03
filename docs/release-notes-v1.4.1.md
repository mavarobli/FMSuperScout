# FMSuperScout 1.4.1, release notes

> Gepubliceerd 03-08-2026 als GitHub Release v1.4.1 (assets: FMSuperScout-Setup.exe
> + .sha256). Dit bestand is de bron van de release-tekst; de release-body is dezelfde
> tekst zonder harde regelafbrekingen.

---

A quick follow-up to 1.4.0, with one fundamental fix and a performance pass.

## The scan now reads from a frozen snapshot

Right after 1.4.0 a user reported "The scan could not read 15% of FM's memory" on a big
save, even with the save fully loaded. That message was 1.4.0's new safety net being too
careful, but the underlying problem was real and older than the safety net: the scan
used to read from the live, running game for 15 to 30 seconds, racing against FM freeing
memory the whole time. On big saves that race produced shrunken dumps in the past, and
in 1.4.0 it produced false refusals.

The scan now takes a frozen point-in-time snapshot of FM's memory first (a copy-on-write
clone, captured in about a millisecond) and reads from that. Whatever FM frees or
rewrites during the scan stays readable in the snapshot, so the result is a consistent
picture of one moment and the whole class of "partially readable scan" problems is gone
at the root. If the snapshot cannot be made, the plugin says so in the log with the
exact error code and falls back to the old live reading, still protected by the 1.4.0
guards.

One honest trade-off: reading from the snapshot is slower. On a 51k-player save the scan
went from about 10 to about 15 seconds. That is the price of a scan that cannot be
corrupted by the game running underneath it, and it only affects the F9/New data action.

## The app itself got faster

The same release makes the app quicker where you feel it all day: derived values (meta
score, estimated value, asking price, interest, contract months, the search string) are
now computed once per dump instead of for every row on every keystroke. On a 51k-player
database a full meta pass dropped from 22 ms to 2 ms and sorting on meta or value nearly
halved; on the really big saves the difference is hundreds of milliseconds per
keystroke. Scrolling also skips re-rendering when the visible rows have not changed, and
typing no longer rebuilds the table header. Results are identical, it is purely less
wasted work.

The plugin is now v0.1.42 and updates automatically with the installer. Settings and
shortlist are kept: run the setup over your current install, close FM26 first.
