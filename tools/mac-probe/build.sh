#!/bin/bash
# Bouwt de FMSuperScout-meetmodule en zet hem klaar. Vereist de Xcode-command-line-tools.
# Verandert niets aan FM of de gamemap: je voegt zelf één startoptie toe in Steam (zie
# onder), of start FM met het Terminal-commando; na de meting haal je de startoptie weg.
set -euo pipefail
cd "$(dirname "$0")"
# Resultaten in Application Support; de module en het startscript in ~/.fmss: een pad
# zonder spaties, want Steam op de Mac kan niet met spaties in de startoptie overweg.
OUTDIR="$HOME/Library/Application Support/FMSuperScout"
BIN="$HOME/.fmss"
mkdir -p "$OUTDIR" "$BIN"

# Universeel (Apple Silicon + Intel): FM27 is ook universeel.
clang -dynamiclib -O2 -Wall -arch arm64 -arch x86_64 -o "$BIN/fmss_probe.dylib" fmss_probe.c

# Startscript: Steam roept dit aan met het echte FM-programma als argumenten (%command%);
# het zet alleen de meeladen-instelling en start FM daarna ongewijzigd.
cat > "$BIN/launch.sh" <<'EOS'
#!/bin/bash
export DYLD_INSERT_LIBRARIES="$HOME/.fmss/fmss_probe.dylib"
exec "$@"
EOS
chmod +x "$BIN/launch.sh"
rm -f "$OUTDIR/mac-probe.txt" "$OUTDIR/mac-probe.flag"

FM="$HOME/Library/Application Support/Steam/steamapps/common/Football Manager 27/fm.app/Contents/MacOS/Football Manager 27"

cat <<EOF

Gebouwd: $BIN/fmss_probe.dylib

ROUTE 1 — via Steam
  Steam → Bibliotheek → rechtsklik Football Manager 27 → Eigenschappen → Algemeen →
  Opstartopties. Zet daar precies deze regel (vervangt een eventuele oude regel):

$BIN/launch.sh %command%

  Start FM27 daarna via Steam.

ROUTE 2 — als Steam een fout geeft: start FM vanuit Terminal (Steam moet wel open zijn)

SteamAppId=4530370 SteamGameId=4530370 DYLD_INSERT_LIBRARIES="$BIN/fmss_probe.dylib" "$FM"

Daarna, met je save geladen, de meting starten:

touch "$OUTDIR/mac-probe.flag"

Resultaat bekijken (wacht tot er "Klaar" onderaan staat):

cat "$OUTDIR/mac-probe.txt"

Na afloop: haal de startoptie in Steam weer weg (route 1), of sluit FM gewoon (route 2).
EOF
