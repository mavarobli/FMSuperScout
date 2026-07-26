# FMSuperScout 1.3.0, release notes

> Gepubliceerd 26-07-2026 als GitHub Release v1.3.0 (assets: FMSuperScout-Setup.exe
> + .sha256). Dit bestand is de bron van de release-tekst.

---

This one is about time. FMSuperScout already saved a snapshot every time you pressed F9,
and now it does something with them: you can see who is actually developing, and you get
a heads-up the moment a youth intake drops. Plus the filters people asked for on the
forums, and the loan fix that a few of you spotted.

## New

- **Growth.** A new Development section in the sidebar with a reference period: since your
  last dump, 6 months, a year, this season, or everything you have. A Growth column then
  shows how much CA a player has gained since that date, green for progress and red for
  decline, and you can sort and filter on it. Want the players who gained 10+ CA in the
  last year? That is one filter now.
- **Intake Radar.** After a youth intake a bar appears above the list: how many newgens
  turned up worldwide since your last dump, and who the best prospect is. One click shows
  them all, sorted by potential. This is only possible because the tool remembers your
  previous dump; a scouting tool that only reads the present cannot tell a brand new
  sixteen-year-old from one who has been there all season.
- **Wonderkid filter.** One tick for players aged 21 or under with PA 150+ and at least 25
  points of growth left. On a 51k player save that is 556 names instead of scrolling.
- **Height and preferred foot filters**, in a new Physical section. The foot options are
  built from your own save, so they work whatever language you run FM in.
- **Growth on the player profile** too: the development charts now show the change over
  the period next to the CA/PA and Value headings.

## Fixed

- **Loaned players show up under "My club" again.** A player who appears in two club
  squads was assigned to whichever club had him in the most senior team, which for a loan
  is a coin flip: land on the parent club and the loan becomes invisible. On a real save
  this found 429 loans instead of 167, and a club that showed 3 of its 12 loaned-out
  players now shows all 12. Thanks to whoever reported this.
- **Development chart axis.** A keeper with PA 168 had "172" written above his line. The
  axis keeps its breathing room but the labels are now the player's real high and low.
- **Chart tooltips** are in the app's own style instead of the bare Windows popup, and
  show the date and CA. PA is only added when it actually moved. The same cleanup was
  applied to the rest of the data: player names, meta and interest cells, squad depth
  dots and comparison bars.
- **The Interest column has a "?"** explaining what it means. Two people asked whether it
  was clubs being interested in the player or the player being willing to come. It is the
  second, and the tooltip is honest that it is an estimate: FM only works this out during
  a negotiation, where your actual offer counts too.
- **FM not starting after installation.** Almost always the first launch still running:
  the mod layer builds its files once and that takes 1 to 3 minutes behind a black
  console window. The app now recognises that state and says so instead of telling you to
  press F9, the installer leads with the warning, and troubleshooting opens with it.

## Changed

- The wonderkid bar is stricter. Age plus growth room alone matched 28% of a real
  database, because nearly every sixteen-year-old clears it. With the PA requirement it is
  about 1%. The gold player card follows the same rule, so gold means something again.
- Some tidying around the support link and its reminders.

## Install

Run **FMSuperScout-Setup.exe** over your current version. Settings, shortlist and your
saved history are kept. Close FM26 first.

SmartScreen may warn about an unknown publisher because the installer is not code-signed.
More info → Run anyway. Verify first if you like:
`Get-FileHash .\FMSuperScout-Setup.exe -Algorithm SHA256` and compare with the checksum
below.

SHA-256: `83d81562ef7fa91dfd9402f768cc6de17779eca88756e26c6eac81cf6db1200a`
[VirusTotal: 1/67](https://www.virustotal.com/gui/file/83d81562ef7fa91dfd9402f768cc6de17779eca88756e26c6eac81cf6db1200a);
de ene hit is Microsofts ML-heuristiek (Wacatac.C!ml), bekend vals alarm op ongesigneerde
installers. Lokale Defender met actuele definities keurt exact dit bestand goed;
false-positive-melding ligt bij Microsoft.
