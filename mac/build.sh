#!/bin/bash
# Bouwt en installeert FMSuperScout voor de Mac vanuit deze broncode (testversie, zolang er
# nog geen kant-en-klare Mac-download is).
#
# Vereist de Xcode-command-line-tools (xcode-select --install). De .NET 8 SDK wordt zo nodig
# eenmalig in ~/.dotnet gezet, zonder beheerderswachtwoord. Installeert naar
# ~/Library/Application Support/FMSuperScout/mac en verandert niets aan FM of Steam.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
case "$(uname -m)" in
  arm64) RID=osx-arm64 ;;
  x86_64) RID=osx-x64 ;;
  *) echo "Onbekende processor: $(uname -m)"; exit 1 ;;
esac
xcode-select -p >/dev/null 2>&1 || { echo "Installeer eerst de Xcode-command-line-tools: xcode-select --install"; exit 1; }

has_sdk8() { "$1" --list-sdks 2>/dev/null | grep -q '^8\.'; }
DOTNET="$(command -v dotnet 2>/dev/null || true)"
if [ -z "$DOTNET" ] || ! has_sdk8 "$DOTNET"; then
  DOTNET="$HOME/.dotnet/dotnet"
  if ! [ -x "$DOTNET" ] || ! has_sdk8 "$DOTNET"; then
    echo ".NET 8 SDK installeren in ~/.dotnet (eenmalig, ongeveer 200 MB)…"
    curl -fsSL https://dot.net/v1/dotnet-install.sh -o "${TMPDIR:-/tmp}/dotnet-install.sh"
    bash "${TMPDIR:-/tmp}/dotnet-install.sh" --channel 8.0 --install-dir "$HOME/.dotnet" >/dev/null
  fi
  export DOTNET_ROOT="$HOME/.dotnet"
fi
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1

OUT="$SRC/mac/out"
rm -rf "$OUT"
mkdir -p "$OUT"
echo "Module bouwen ($RID)…"
"$DOTNET" publish "$SRC/mac/FMSuperScout.Mac.csproj" -c Release -r "$RID" -o "$OUT/core" -v quiet
echo "Lader bouwen…"
clang -dynamiclib -O2 -Wall -arch arm64 -arch x86_64 -o "$OUT/fmss_loader.dylib" "$SRC/mac/loader/fmss_loader.c"

DEST="$HOME/Library/Application Support/FMSuperScout/mac"
mkdir -p "$DEST"
cp "$OUT/core/fmss_core.dylib" "$OUT/fmss_loader.dylib" "$DEST/"
rm -rf "$DEST/app"
cp -R "$SRC/app" "$DEST/app"
cp "$SRC/mac/FMSuperScout.command" "$DEST/"
chmod +x "$DEST/FMSuperScout.command"
codesign -s - -f "$DEST/fmss_core.dylib" "$DEST/fmss_loader.dylib" >/dev/null 2>&1
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

cat <<EOF

Geïnstalleerd in: $DEST

Starten (sluit Football Manager eerst als het al draait):

"$DEST/FMSuperScout.command"

Of in Finder: dubbelklik FMSuperScout.command in die map (open hem met: open "$DEST").
Laad je save en klik in de app op "Nieuwe data". Logboek: $HOME/Library/Application Support/FMSuperScout/mac.log
EOF
