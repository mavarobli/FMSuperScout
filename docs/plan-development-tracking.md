# Plan: development tracking (growth column, growth filter, Intake Radar)

Status: **plan only, nothing built**. Written 26-07, all numbers measured on this machine's
real dump (51,845 players) and history file (25 dates, 59,046 players, 12.1 MB).

## 0. The one design decision

mavarobli asked for three things: an intake feature, a growth filter field, and a growth column.
They should not be three features. They are **one mechanism with three faces**:

```
        ┌─ reference period ─┐
        │  (one control)     │
        └─────────┬──────────┘
                  │  per player: CA-then, first-seen
      ┌───────────┼───────────┬──────────────┐
      │           │           │              │
  Growth       Growth      "New since"   Intake Radar
  column       filter       filter       (a moment)
```

Everything reads from one per-player lookup: *what was his CA at the reference date, and
did he exist then at all*. The Intake Radar is then not separate code, it is a preset over
the same filters plus a trigger that notices when an intake happened.

Building it as one mechanism means the growth column automatically works inside the intake
view, presets keep working, and there is a single place where "no history yet" is handled.

---

## 1. Data layer

### 1.1 New endpoint

```
GET /api/history/deltas?manager=<name>&since=<YYYY-MM-DD>
→ { dates: [...], ref: "2028-07-28", p: { "<uid>": [caAtRef, paAtRef, firstSeenIdx] } }
```

`caAtRef` = last known value at or before `ref`, `null` if he did not exist yet.
`firstSeenIdx` = index into `dates` of his first snapshot, so the client can answer
"new since X" for any X without a second request.

**Measured payload** on the real file: **1.33 MB** raw, 0.30 MB gzipped, 59,046 entries.
Restricted to players in the current dump: 1.16 MB. Next to the 87 MB dump the app already
streams, this is free. No compression needed over localhost.

**Coverage** is good: 51,486 of 51,845 dump players (99.3%) have history after 25 dumps.

### 1.2 Server-side computation

Do **not** implement `caAtRef` as a per-player scan over all dates (59k x 120 dates worst
case = 7M operations). Walk the dates forward once, keeping a running last-value map:

```js
for (const d of dates) { if (d > ref) break;
  for (const uid in playersAtDate(d)) lastVal[uid] = ...; }
```

That is O(total stored entries), which is what the file already is. `loadHist` is cached
(`histCache`), so repeated period changes do not re-read the 12 MB file.

### 1.3 Client side

Fetch once after a dump loads, alongside `buildFootOptions()` / `buildDivisions()`. Store
as a `Map` on `state.hist` (uid → [caRef, paRef, firstIdx]). Refetch on period change
(one request, ~50 ms locally).

Failure is non-fatal: no history, no data, column hides, filters hide. Same rule the app
already uses for the division filter.

---

## 2. The reference period control

A select at the top of a new sidebar section. Options and what they actually yield on the
real save:

| Option | ref date | players with growth data | grew | +5 or more | +10 or more | new |
|---|---|---|---|---|---|---|
| Since last dump | 2029-07-10 | 45,925 | 3,025 | 17 | 6 | 0 |
| Last 6 months | 2029-01-28 | 43,690 | 12,767 | 3,591 | 547 | 3,087 |
| **Last year (default)** | 2028-07-28 | 43,181 | 17,052 | 8,404 | 4,101 | 3,282 |
| This season | 2029-07-01 | 45,769 | 4,776 | 92 | 9 | 295 |
| All history | first seen | — | — | — | — | — |

**Default = last year.** It is the only window that produces a scoutable list: 4,101
players at +10 or more. "Since last dump" is right for "what just happened" but at 18 days
apart it yields 17 movers, and "this season" is near-empty early in a season.

"This season" reuses the July 1st boundary already written for the Ko-fi season report
(`seasonYearOf()`), so no new date logic.

---

## 3. Growth column

```js
{ key: 'growth', label: 'c_growth', num: true, help: 'growthHint', w: 84,
  get: p => { const h = state.hist?.get(p.id); return h && h[0] != null ? (p.ca||0) - h[0] : null; },
  render: p => growthHtml(p), defHidden: false }
```

- **Rendering**: `+12` in green, `-7` in red, `0` muted, `–` when unknown. Same colour
  vocabulary as the rest of the app (`--accent` / `--bad` / `--muted`).
- **New players** get `null`, not `0`. The existing sort already pushes `null` to the
  bottom in both directions (`sortRows`, line 1768), so newgens never pollute the top of a
  "biggest risers" sort. This is why null matters more than it looks.
- **Hidden-stats toggle**: growth is derived from CA, so it must be registered in
  `hiddenStatCol()` exactly like `ca`/`pa`/`fee`. Toggle on hidden stats and the column and
  filter disappear together.
- **Staff**: staff have CA in the dump but no history is posted for them
  (`postHistorySnapshot` only sends `state.players`). So the column hides in staff mode,
  same treatment as the meta column. Alternative: start posting staff snapshots too, which
  is a one-line change but grows the history file; **decision needed, see §8**.
- Column is added to the default order via the existing "insert at default position"
  mechanism, so people with a saved column config get it in the right place rather than
  appended at the end.

## 4. Growth filter

New sidebar section `data-sec="development"`, collapsed by default, and **only rendered
when `state.hist` has at least two dates**. Contents:

```
Periode        [ Afgelopen jaar        v ]
Groei          [ min ] – [ max ]
[ ] Alleen nieuwe spelers
```

- `f-growth-min` / `f-growth-max`, same `range2` pattern as CA/PA/leeftijd, so chips,
  section dots, clear-filters and presets all work through the existing plumbing.
- Filter predicate mirrors the height filter: unknown growth (new player, no baseline)
  falls outside a set range rather than counting as 0.
- **Placeholder hygiene.** Unfiltered, the biggest-risers list is dominated by junk:
  `CA 1 → 98`, no name, no club, plus retiring players at `CA 123 → 11`. The fix is a
  baseline floor: ignore growth when `caAtRef < 40`. Measured, that turns
  `+106 CA 5→111 "?"` into `+45 CA 58→103 Majid Al-Bishi (17, Al-Fateh)`. This floor is
  not cosmetic, it is the difference between a feature and a bug report.
- Presets: add the three ids to `PRESET_TEXT_IDS` / `PRESET_CHECK_IDS` / `PRESET_SELECT_IDS`.

## 5. "New since" filter

The `Alleen nieuwe spelers` checkbox uses `firstSeenIdx > refIdx`. Cheap, and it is the
same data the radar needs.

Honest caveat to put in the tooltip: **new to the tool is not always a newgen.** A player
transferring into a league you have loaded also appears for the first time. The measurement
below shows how to separate them.

## 6. Intake Radar

### 6.1 Trigger, calibrated on real data

Rule: **at least 200 new players since the previous dump, and at least 70% of them aged 17
or under.** Run over all 24 transitions in the real history file:

| date | new | % aged ≤17 | verdict |
|---|---|---|---|
| 2028-03-19 | 1,092 | 97% | **intake** |
| 2028-04-09 | 1,531 | 98% | **intake** |
| 2028-04-20 | 543 | 99% | **intake** |
| 2028-04-30 | 212 | 97% | **intake** |
| 2028-10-21 | 374 | 93% | **intake** (southern hemisphere) |
| 2029-04-01 | 1,174 | 100% | **intake** |
| 2029-04-29 | 1,508 | 100% | **intake** |
| 2028-05-14 | 510 | 11% | rejected (transfer window) |
| 2028-07-02 | 531 | 0% | rejected |
| 2029-07-02 | 229 | 0% | rejected |
| 2029-07-28 | 0 | — | rejected |

Seven true intakes found, every transfer-window date correctly rejected. The rule needs no
tuning beyond these two constants.

### 6.2 What it shows

A dismissible banner above the table when the trigger fires:

> **Jeugdintake: 1.174 nieuwe spelers wereldwijd**
> Beste vooruitzicht: Gavin Osborn, 16, Liverpool, PA 178
> [ Toon de intake ]  [ Later ]

"Toon de intake" applies a preset: period = since last dump, new-only = on, age ≤ 18,
sort by PA descending. That is it. No separate view to maintain.

Real output from the 2029-04-01 intake in this save:

```
PA 178  CA 95  Gavin Osborn        16, Liverpool
PA 177  CA 89  Dušan Todorov       16, Rode Ster Belgrado
PA 177  CA 89  Enzo Valentini      16, Casciavit Milano
PA 174  CA 93  Lores Cankaya       16, FC Bayern München
```

### 6.3 Why it is defensible

A stateless tool cannot tell a PA-178 sixteen-year-old who appeared today from one who has
been in the database for a year. Genie Scout, FMST and FMLE all read the present only.
This needs memory, and memory is the thing a competitor cannot back-fill for a user who
switches.

Architecturally it already works: ghost newgens (reputation sentinel) are filtered out of
`state.players` before the snapshot is posted, so a pre-generated newgen enters the history
on the day FM actually places him at a club. "New" therefore means "he exists now", not
"the scan noticed him".

---

## 7. Edge cases

| Case | Behaviour |
|---|---|
| First ever dump (1 snapshot) | Section and column hidden. Radar silent. No empty screens. |
| Two snapshots, days apart | Everything works, "last year" falls back to earliest available date and the period label says so. |
| Save rewind | Already handled: `mergeSnapshot` drops points at or after the loaded date. |
| **New career, same manager name** | Known issue (backlog #9): history keys on manager name only, so a second save with the same name inherits the old timeline and would report ~50,000 "new" players. **Guard: if new-since-previous exceeds 40% of the dump, treat it as a new baseline, suppress the radar and the growth column for that dump.** Cheap, and it also covers "loaded far more leagues than last time". |
| Player leaves the database | He is not in the dump, so he is not a row. Nothing to do. |
| Value growth | Same data (`[ca, pa, val]` is already stored). Deliberately out of scope for v1; a second column later if the first one lands well. |

## 8. Decisions

1. **Staff history: no.** Besloten 26-07. Only players are snapshotted, so the growth column
   hides in staff mode, same as the meta column.
2. **Growth of CA only.** Besloten 26-07. No value-growth column in v1, even though the data
   is already stored.
3. **Radar presentation: open.** Banner versus card, see below.

## 9. Build order and estimate

| Step | Work |
|---|---|
| 1. `/api/history/deltas` + forward-walk computation + client fetch and cache | ~half a day |
| 2. Growth column, incl. null handling, hidden-stats registration, colour rendering | ~half a day |
| 3. Development sidebar section: period, growth range, new-only, presets, chips, dots | ~half a day |
| 4. Intake Radar: trigger, banner, preset, new-career guard | ~half a day |
| 5. NL/EN strings, edge cases, verification against the real 25-date history | ~half a day |

Roughly **2.5 days**. No new storage, no plugin change, no new dependency.

## 10. What this deliberately does not do

- No attribute-level history. That is the bigger request and the expensive one
  (~48 values instead of 3); it needs measuring on two real dumps first. See
  [usp-research-2026-07.md](usp-research-2026-07.md) §3C.
- No prediction. Genie Scout's GS Stats predicts development from an aggregate of other
  users' saves, uploaded to their server. This records what actually happened in yours,
  locally. Those are different products and we should not blur them.
