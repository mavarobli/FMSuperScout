# Tests

Zero-dependency model tests (`node:test`) for the calculation functions in `app/app.js`:
value estimation, asking price, interest, potential projection and role score.

```bash
npm test        # or: node --test test/*.test.js
```

## How it works

`app/app.js` is one classic browser script full of DOM handling, so it is not a module you
can simply `require`. `harness.js` runs the real source code in a function scope with
fake (no-op) globals (`document`, `localStorage`, `fetch`, …) and then returns the calculation
functions. That way we test the real code, not a copy: a model change that breaks the tests
gets noticed right away.

## Recalibrating the value model

The automatic calibration set (`value-history.json`) was removed (15-07) because the real value now
comes straight from memory and the estimation model is on point. If the estimation model ever needs
recalibrating, temporarily restore the collection in `app/server.js` (see the
git history of `archiveValues`). The current tests check *invariants* (value does not drop
with more reputation, potential stays ≤ 20, and so on).
