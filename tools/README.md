# tools/: calibration and analysis scripts

Standalone Node scripts (zero-dep) that read and analyse the most recently loaded dump from
`%LOCALAPPDATA%\FMSuperScout\dump.json`. Purely for maintenance/recalibration;
not needed to run the app.

```bash
node tools/<script>.js
```

- **ca-analysis.js**: CA → attribute total per bucket plus regression. Basis for the
  `CA_TOTAL_*` curves in the potential model. Rerun after a major FM patch or a new DB.
- **pos-curve.js**: measured attribute profile per position group at CA anchors (80/110/140/170).
  Generates the `POS_ATTR_PROFILE` table in `app/app.js` (potential projection).
- **value-calib.js**: compares the extracted market value (×1.16 £→€) against in-game
  transfer value bands; fill in a calibration set by hand. For checking the value
  estimation.

## Mac measuring tools

Used to measure the Mac memory layout (see `docs/macos.md`); needed again after a big FM patch.

- **mac-diagnose.sh**: read-only overview of the Mac and the FM installation (signing,
  entitlements, modules). Replaces your user name and home folder with placeholders.
- **mac-probe/**: a small measuring module loaded into FM (`build.sh` builds it and prints
  how to start FM with it). Writes a class histogram with RTTI names and, on request,
  object dumps of named people to `~/Library/Application Support/FMSuperScout/mac-probe.txt`.
