# FMSuperScout 1.4.2

Fixes from two field reports (issues #13 and #16).

## Fixed: "Index was out of range (Parameter 'startIndex')"

A corrupt metadata pointer near the top of the 64-bit address space caused an integer overflow in a bounds check during the scan. The result was a negative array index and a failed dump. Whether you hit it depended on what happened to be in FM's memory, so it started suddenly and then failed on every retry in that session. The bounds check is now overflow-safe. A broken scan region can no longer fail the dump either: it counts as unreadable and the scan continues.

## Scans are fast again

1.4.1 read every scan from a frozen memory snapshot. That made every scan slower, and on machines low on memory the snapshot failed with Win32 1450 and fell back to a live scan anyway. In 1.4.2 the scan reads live by default, like 1.4.0 and earlier. The snapshot only runs as an automatic retry when the live pass could not read more than 10% of FM's memory.

## Lower memory footprint

Read buffers and module caches are allocated once and reused, so repeated scans no longer grow FM's memory use. With little free memory the scan uses fewer workers and skips the big module cache. The plugin compacts its heap after every scan. If a scan still fails on memory, the error says so and tells you what to do: close other apps, check your page file, or reboot.

## App changes

- "Report a problem" includes the last scan's telemetry (read source, free memory, timing per phase) in the prefilled GitHub issue.
- The settings menu was reorganized and has a "Check for updates" action next to the version number.

The plugin is now v0.1.43 and updates with the installer. Run the setup over your current install with FM26 closed; settings and shortlist are kept.

**SHA-256** `FMSuperScout-Setup.exe`: `2aed3eb52b02a916c365175001079a46bd71a274ee805edc3e954ae3eefac092`
