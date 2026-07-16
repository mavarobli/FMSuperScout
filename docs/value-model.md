# Market value and interest estimation

## Calibration set (removed 15-07)

There used to be an automatic calibration set: on every dump the server stored the players with a real
in-game value in `value-history.json` (deduped on id). Now that the plugin reads the real transfer value
straight from memory (~74%) and the estimation model covers the rest well, that became
redundant, it only kept growing. Removed: the archiving,
the `/api/value-history` endpoint and the file. If the estimation model ever needs recalibrating
(e.g. after a major FM patch), collection can be switched back on temporarily.

## Update: reputation-driven model

After more real amounts came in (including mid-range players such as Bidstrup €17M, Beukema €14M), the
CA-driven model turned out to overshoot the mid-range badly (Bidstrup came out at €62M). Analysis of the data:
**FM value mainly follows world reputation (fame), not CA**: two players with the same reputation
are worth roughly the same. CA and reputation are so strongly correlated that including CA makes the regression
unstable (coefficients flip between CA-heavy and reputation-heavy fits). So the model is now:
**reputation (saturating above ~7500) + age + contract length + a small youth correction, without CA.**
Result: the mid-range is right (Bidstrup £17M, Beukema £14M), the top is tempered (Haaland ~£280M vs €274M).
Limitation: a strong player with low fame tends to be underestimated. The truly accurate route is reading
the value from memory (GenieScout does this via a memory agent), see `backlog.md`.

## Market value (estValue in app/app.js), historical (CA-driven, replaced)

FM computes transfer value internally (undocumented) and stores
`0xFFFFFFFF`/no value for most players; only a handful of players have a concrete value in
memory. We use those concrete values as calibration points.

**Method:** log-linear regression on **43 adult players** with a real FM value: the
values stored in dumps (mid-range) plus well-known stars whose value was read off in-game
screenshots (top range, €→£ at 1.16). That way the calibration covers the full range.
Predictors: **saturated CA + world reputation (fame) + club reputation + ln(contract months)**.

Key insight from the screenshots: at the top the value **saturates** strongly. Between CA 165
and 196 the value barely moves (£160-240M), because reputation/fame counts there, not CA. A
pure CA exponential therefore blew up (CA 196 → billions); hence the saturation knee and
`worldRep` as a separate term.

**Result (adult players: median error ~24%, 86% within 50%):**

| Factor | Effect |
|---|---|
| CA | ×1.11 per point up to 150; above that only 15% of that slope (saturation) |
| World reputation | ×1.09 per 1000 (separates "famous CA170" from "obscure CA170") |
| Club reputation | ×1.14 per 1000 |
| Contract length | value ∝ √months; (nearly) free agent: extra ×0.7 |
| Age | >29 tapering discount; ≤23 gets part of the PA headroom as extra "ability" |

Sanity check at the top (calibrated): Haaland ~£350M, Mbappé ~£228M, Pedri ~£212M, the order of magnitude
is right (real values £236M/£185M/£187M). Players with a real stored value show it directly.

**Teenagers are an exception.** In FM their value depends on potential plus hype/reputation that we
cannot read reliably: two 16-year-olds with identical CA/PA can be worth £1M vs £40M.
The estimate for players aged 20 and under is therefore rough and gets a wider band (±55%).

Coefficients live in `VAL_B` in app.js. More calibration points (especially real teenager values and
lower leagues) would sharpen the edges further.

## Asking price / transfer fee (feeMultiplier in app/app.js)

Estimates what **your club** is likely to pay (value × markup). Core principles:

- **Willingness to sell dominates, it does not stack.** A listed player goes for around or below
  the value (×0.35-1.0, shorter contract → lower), even on a long contract; the contract premium
  is dropped in that case. Set for release ≈ giveaway price (×0.2). Previously ×0.85 was applied on top of
  the contract premium, so listed players still "cost" ~1.6× the value.
- **Flatter contract premium** (max ×1.9 instead of ×2.2): the estimate was structurally too high.
- **Buyer-dependent ("big club tax").** Sellers ask more from a bigger club and settle
  for less from a smaller one: factor ×0.85-1.35 based on the reputation gap
  between my club (`meta.myClubRep`) and the selling club. The asking price therefore differs per
  save/club you play with.
- **Squad-status proxy via wage rank.** Exact squad status is not in the dump, but the
  wage rank within the selling club can be derived: top-2 earner ≈ star player (×1.2),
  bottom 40% ≈ fringe player (×0.9). Only for clubs with ≥8 players with a known wage.
- **Not for sale** stays much more expensive (×1.7, ceiling ×3.5); age/wonderkid corrections
  unchanged.

Calibration point: Cho Wi-Je (value £1M, paid £1.8M) comes out at ~×1.6-1.9 with an average contract and a bigger
buying club. What cannot be captured: competing bids, budgets and
negotiation dynamics. It remains an indication, so the profile shows a band.

## Interest (interestEstimate in app/app.js)

There is no ground truth in the dump (FM does not record an "interest" number), so this stays a
heuristic. Research (SI forum, community) confirms the factors used are the right ones:
club reputation/status, playing-time prospects, wage and personal ambition. Of those factors,
the dump provides: reputation gap (my club vs. the current club plus the player's personal
status/worldRep), wage feasibility (ceiling from your own squad),
availability (listed/for sale/expiring contract) and age. Ambition/loyalty/playing time
are not in the dump (see [[dump-fields]]), so we cannot weigh them.

See also `docs/fmf-format.md` and the project memory.
