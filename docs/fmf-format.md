# .fmf shortlist format: research findings

Goal: export FMSuperScout shortlists as `.fmf` files that FM26 can load directly
(instead of CSV). Status: **not yet feasible** with the current information. Below is what we know.

## Container structure (decoded)

Sample file `TEST.fmf` (521 bytes, 1 player) is an SI resource archive:

```
offset 0 : 02 01                     version/flags ("97% of .fmf files start with 02 01")
offset 2 : "afe."                    data-region tag (archive front end)
...      : per-file payloads          (image.img, TEST.slf, _data/details.aom)
offset389: "fmf."                    index tag
offset396: 28 b5 2f fd ...           zstd frame = the index (decompresses cleanly)
```

The **index** decompresses cleanly with standard zstd and contains:
- root "TEST", 2 children
- `image.img`, `TEST.slf` (the actual shortlist), `_data/details.aom`
- per file: name, extension, offset/size fields and a timestamp-like trailer.

## Why export does not work (yet)

The **payloads** in the `afe.` region cannot be read with standard codecs:
- Brute force over inflate/inflateRaw/gunzip/brotli/zstd at every starting point: not a single
  real match (just one 11-byte false positive).
- Entropy ~7.1 bits/byte: an SI-proprietary codec or encryption.

This matches what the community reports: `.fmf` is a closed SI format that can only be
opened/created with the bundled **Football Manager Resource Archiver** (Steam tool).
Without that codec plus the internal `.slf` schema we cannot produce a file FM accepts,
and we cannot verify the result in the game here either.

## Final conclusion (after 3 extra samples: test1=1 player, test2=2, test3=3)

With samples of increasing size the format has now been dissected far enough to draw a hard
conclusion:

- **`.slf` = header + 4 bytes per player.** The index sizes grow by exactly +4 bytes per
  extra player (uncompressed 84→88→92, compressed 31→35→39 for 1→2→3 players). That is
  one `uint32` player ID per shortlist item. So the schema is solved.
- **The index is public zstd** (98% identical between files), which is why it does read.
- **The payloads are encrypted with a random per-file nonce.** Evidence: all three
  shortlists contain the same default image (`image.img`), yet those bytes are completely
  different in each file; only 15% of the data region matches and that is just
  the framing/length header. Identical input → different output = encryption, not compression.

**Consequence: writing a valid `.fmf` is not feasible.** More samples will not help,
the key sits in `GameAssembly.dll` and cannot be derived from ciphertext. The only real
route would be extracting the encryption routine plus key from the game binary (a large, separate RE job,
unverifiable without the game), or invoking SI's own Resource Archiver.

Practical alternative for sharing players: the readable export (name/club/position) which lets you
re-add them via FM search. See [[dump-fields]] and the project memory.
