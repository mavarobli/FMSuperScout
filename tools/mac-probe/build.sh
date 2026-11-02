#!/bin/bash
# Bouwt de FMSuperScout-meetmodule en zet hem klaar. Vereist de Xcode-command-line-tools.
# Verandert niets aan FM: je voegt zelf één startoptie toe in Steam (zie onder), en haalt
# die na de meting weer weg.
set -euo pipefail
cd "$(dirname "$0")"
DIR="$HOME/Library/Application Support/FMSuperScout"
mkdir -p "$DIR"

# Universeel (Apple Silicon + Intel): FM27 is ook universeel.
clang -dynamiclib -O2 -Wall -arch arm64 -arch x86_64 -o "$DIR/fmss_probe.dylib" fmss_probe.c
rm -f "$DIR/mac-probe.txt" "$DIR/mac-probe.flag"

cat <<EOF

Gebouwd: $DIR/fmss_probe.dylib

1. Steam → Bibliotheek → rechtsklik Football Manager 27 → Eigenschappen → Algemeen →
   Opstartopties. Plak daar precies deze regel:

DYLD_INSERT_LIBRARIES="$DIR/fmss_probe.dylib" %command%

2. Start FM27 via Steam en laad je save.
3. Start de meting (duurt ongeveer een halve minuut) met dit commando in Terminal:

touch "$DIR/mac-probe.flag"

4. Wacht tot het rapport "Klaar" meldt:

cat "$DIR/mac-probe.txt"

5. Daarna: haal de opstartoptie in Steam weer weg. Stuur mac-probe.txt terug.
EOF
