#!/bin/bash
# FMSuperScout voor de Mac: start de app en Football Manager 27 met de FMSuperScout-module.
#
# Start FM via dit script, niet via Steam: alleen zo laadt de module mee (macOS staat het
# meeladen alleen toe via een opstart-instelling, en Steam op de Mac geeft die niet door).
# Steam zelf moet wel open zijn; het script start het zo nodig.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="$HOME/Library/Application Support/FMSuperScout"
APPID=4530370
mkdir -p "$DATA"

find_node() {
  local n
  n="$(command -v node 2>/dev/null)" && [ -x "$n" ] && { echo "$n"; return 0; }
  for n in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.local/share/sf/bin/node" "$HOME"/.nvm/versions/node/*/bin/node; do
    [ -x "$n" ] && { echo "$n"; return 0; }
  done
  return 1
}

find_fm() {
  local a="$HOME/Library/Application Support/Steam/steamapps/common/Football Manager 27/fm.app"
  [ -d "$a" ] && { echo "$a"; return 0; }
  mdfind "kMDItemCFBundleIdentifier == 'com.SportsInteractive.FootballManager27'" 2>/dev/null | head -1
}

# Draait er al een FM mét module? (de module schrijft elke 5 s zijn pid en tijd weg)
module_alive() {
  local pid at now
  pid="$(sed -n 's/.*"pid":\([0-9]*\).*/\1/p' "$DATA/mac-agent.json" 2>/dev/null)"
  at="$(sed -n 's/.*"at":\([0-9]*\).*/\1/p' "$DATA/mac-agent.json" 2>/dev/null)"
  now="$(($(date +%s) * 1000))"
  [ -n "$pid" ] && [ -n "$at" ] && kill -0 "$pid" 2>/dev/null && [ $((now - at)) -lt 20000 ]
}

# 1) De app (lokale webserver + venster)
NODE="$(find_node)" || { echo "Node.js niet gevonden. Installeer het via https://nodejs.org en start dit opnieuw."; exit 1; }
if curl -fsS -m 2 http://localhost:8765/api/status >/dev/null 2>&1; then
  open "http://localhost:8765"
else
  FMSS_APP=1 nohup "$NODE" "$HERE/app/server.js" >"$DATA/server.log" 2>&1 &
  disown
fi

# 2) Football Manager
FM_APP="$(find_fm)"
[ -n "$FM_APP" ] || { echo "Football Manager 27 niet gevonden."; exit 1; }
EXE="$FM_APP/Contents/MacOS/Football Manager 27"
if pgrep -xq "Football Manager 27"; then
  if module_alive; then echo "Football Manager draait al met FMSuperScout."
  else echo "Football Manager draait al, maar zonder FMSuperScout. Sluit FM en start dit script opnieuw."
  fi
  exit 0
fi
if ! pgrep -xq steam_osx; then
  echo "Steam starten…"
  open -g -a Steam
  for _ in $(seq 1 60); do pgrep -xq steam_osx && break; sleep 1; done
  sleep 5   # Steam moet ingelogd zijn voordat FM start
fi
echo "Football Manager starten met FMSuperScout…"
# Niet via nohup of env: dat zijn door SIP beschermde systeemprogramma's, en macOS haalt alle
# DYLD_-variabelen weg als zo'n programma iets start. Dus rechtstreeks vanuit bash, met
# SIGHUP genegeerd zodat FM blijft draaien als dit Terminal-venster dichtgaat.
( trap '' HUP; SteamAppId=$APPID SteamGameId=$APPID DYLD_INSERT_LIBRARIES="$HERE/fmss_loader.dylib" exec "$EXE" ) >/dev/null 2>&1 &
disown
echo "Klaar. Laad je save en klik in FMSuperScout op 'Nieuwe data'. Dit venster mag dicht."
