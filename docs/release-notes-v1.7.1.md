# FMSuperScout 1.7.1

**Staff search, done properly.** Free agents used to show up as "Staff member" with no way
to tell what job they want or how good they are. That is fixed.

## Staff

- **Preferred job**, read straight from FM: the same "Preferred job" you see in FM's staff
  search, for free agents too. Free agents now show "–" as their role, like FM.
- **Role filter that knows preferences**: pick "Fitness coach" and you also get free fitness
  coaches and staff with a strong preference (15/20 or more) for the job, even if it is not
  their first choice.
- **Suitability (1-20)**: how well someone fits the role, from the staff attributes that
  matter for it. Picking a role sorts on it. This is our own estimate, not FM's stars.
- **Reputation**: world reputation in the table (now visible by default) and in the profile.
- **Personality**: ambition, professionalism, loyalty and the rest in the staff profile, and
  you can filter on them.
- Staff no longer get a nonsensical "estimated value" in the profile.

Known limit: FM stores no recruitment/performance split for analysts' preferred job, so they
show as "Analyst".

Checked on Windows against a running FM 27.0 save. The Mac version gets the same changes but
was not re-tested on a Mac for this release.

FMSuperScout only reads; it never changes Football Manager, Steam or your saves.

**SHA-256**

- `FMSuperScout-Setup.exe`: `4cf11bb99e0093baa35bc8c92770c165eb3aadb68d9a7bdb4e114b489def2413`
- `FMSuperScout-Mac.dmg`: `ee0bbc9f12099f5f99b3a453afd1c44e9882daeab6e240f8a3ded648049d715a`
