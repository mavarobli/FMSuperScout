# FMSuperScout 1.7.4

**Ready for FM 27.1.** The 27.1 patch did not change how Football Manager keeps its data in
memory, so everything reads as before. The amber "calibrated for 27.0.x" warning is gone.

- **FM 27.1 supported**: checked against a running 27.1 save (names, ages, CA/PA, attributes
  per position, contracts, values, loans and agreed transfers). Still on 27.0? That keeps
  working too.
- **Fix for "Scan failed: Access to the path is denied"** (#38): Windows will not let the
  scanner replace its data file while another program has it open, such as the app still
  loading the previous scan or an antivirus check. The scanner now waits and tries again for
  about 15 seconds. If the file stays locked, the message tells you what is holding it up.

Checked on Windows against a running FM 27.1 save. The Mac version gets the same changes but
was not re-tested on a Mac for this release.

FMSuperScout only reads; it never changes Football Manager, Steam or your saves.
