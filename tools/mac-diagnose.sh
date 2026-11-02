#!/bin/bash
# FMSuperScout — Mac-diagnose (alleen lezen).
#
# Verzamelt wat nodig is om te bepalen of en hoe FMSuperScout op macOS kan werken
# (zie docs/macos.md, "Open vragen"). Het script:
#   - leest alleen informatie; het verandert niets aan je Mac, je game of je saves;
#   - vraagt geen beheerderswachtwoord (geen sudo) en zet niets van de beveiliging uit;
#   - vervangt je gebruikersnaam en thuismap in alle uitvoer door ~ en <gebruiker>.
#
# Gebruik: start Football Manager 27 en laad een save (dan kan het script ook de geladen
# onderdelen van de game zien), open Terminal en draai:
#   bash mac-diagnose.sh
# De uitkomst staat daarna op je bureaublad: fmss-mac-diagnose.txt

set -u
OUT="$HOME/Desktop/fmss-mac-diagnose.txt"
ME="$(id -un)"

# Persoonlijke gegevens uit de uitvoer halen.
anon() { sed -e "s#$HOME#~#g" -e "s#/Users/$ME#/Users/<gebruiker>#g" -e "s#$ME#<gebruiker>#g"; }
section() { printf '\n===== %s =====\n' "$1"; }

{
  echo "FMSuperScout Mac-diagnose — $(date '+%Y-%m-%d %H:%M')"

  section "Systeem"
  sw_vers 2>/dev/null
  echo "Architectuur: $(uname -m)"
  echo "Model: $(sysctl -n hw.model 2>/dev/null)"
  echo "CPU: $(sysctl -n machdep.cpu.brand_string 2>/dev/null)"
  echo "Geheugen (GB): $(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1073741824 ))"
  if [ -e /Library/Apple/usr/share/rosetta/rosetta ] || pgrep -q oahd 2>/dev/null; then echo "Rosetta: aanwezig"; else echo "Rosetta: niet gevonden"; fi

  section "Beveiliging (SIP / Gatekeeper)"
  csrutil status 2>/dev/null
  spctl --status 2>/dev/null

  section "Football Manager 27 zoeken"
  CANDIDATES=()
  for base in "$HOME/Library/Application Support/Steam/steamapps/common" \
              "/Applications" "$HOME/Applications" \
              "$HOME/Library/Application Support/Epic" "/Users/Shared/Epic Games"; do
    [ -d "$base" ] || continue
    while IFS= read -r app; do CANDIDATES+=("$app"); done < <(find "$base" -maxdepth 4 -name "*.app" -path "*Football Manager 2*" 2>/dev/null)
  done
  while IFS= read -r app; do CANDIDATES+=("$app"); done < <(mdfind "kMDItemCFBundleIdentifier == 'com.SportsInteractive.FootballManager*'" 2>/dev/null)
  if [ ${#CANDIDATES[@]} -eq 0 ]; then echo "Geen Football Manager-app gevonden."; fi
  printf '%s\n' "${CANDIDATES[@]+"${CANDIDATES[@]}"}" | sort -u

  while IFS= read -r APP; do
    [ -n "$APP" ] && [ -d "$APP" ] || continue
    section "App: $APP"
    PLIST="$APP/Contents/Info.plist"
    for k in CFBundleIdentifier CFBundleExecutable CFBundleShortVersionString CFBundleVersion LSMinimumSystemVersion; do
      echo "$k: $(/usr/libexec/PlistBuddy -c "Print :$k" "$PLIST" 2>/dev/null)"
    done
    EXE="$APP/Contents/MacOS/$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$PLIST" 2>/dev/null)"
    echo "Hoofdprogramma: $EXE"
    echo "--- lipo"; lipo -info "$EXE" 2>&1
    echo "--- codesign (ondertekening)"; codesign -dv --verbose=4 "$APP" 2>&1 | grep -Ev '^(CDHash|Hash|CandidateCDHash)'
    echo "--- entitlements"; codesign -d --entitlements - --xml "$APP" 2>/dev/null | plutil -p - 2>/dev/null || codesign -d --entitlements - "$APP" 2>&1
    echo "--- Frameworks / PlugIns"
    ls -la "$APP/Contents/Frameworks" "$APP/Contents/PlugIns" 2>/dev/null
    echo "--- Grote bibliotheken (>5 MB) in de app"
    find "$APP" \( -name "*.dylib" -o -name "*.bundle" -o -name "*.so" \) -size +5M -exec ls -la {} \; 2>/dev/null
    echo "--- Architectuur van die bibliotheken"
    find "$APP" -name "*.dylib" -size +5M -exec lipo -info {} \; 2>/dev/null
  done < <(printf '%s\n' "${CANDIDATES[@]+"${CANDIDATES[@]}"}" | sort -u)

  section "Draaiend Football Manager-proces"
  PIDS="$(pgrep -f 'Football Manager 2' 2>/dev/null)"
  if [ -z "$PIDS" ]; then
    echo "Geen draaiend FM-proces. Start FM27 met een geladen save en draai het script opnieuw voor dit deel."
  else
    for P in $PIDS; do
      echo "--- pid $P"
      ps -o pid=,rss=,comm= -p "$P"
      echo "Geladen onderdelen (alleen .dylib/.bundle, grootste eerst):"
      lsof -p "$P" 2>/dev/null | awk '$5=="REG" && ($9 ~ /\.dylib$|\.bundle|\.so$/) {print $7, $9}' | sort -rn | head -40
    done
  fi

  section "Hulpmiddelen"
  echo "node: $(command -v node 2>/dev/null || echo 'niet geïnstalleerd') $(node -v 2>/dev/null)"
  echo "Xcode-commandline-tools: $(xcode-select -p 2>/dev/null || echo 'niet geïnstalleerd')"
  for b in "Google Chrome" "Microsoft Edge" "Brave Browser"; do [ -d "/Applications/$b.app" ] && echo "Browser: $b"; done

  echo; echo "Klaar. Stuur dit bestand (fmss-mac-diagnose.txt) terug; er staan geen persoonlijke paden of namen in."
} 2>&1 | anon | tee "$OUT"

echo
echo "Opgeslagen op je bureaublad: fmss-mac-diagnose.txt"
