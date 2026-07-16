# Bouwt de standalone installer: dist\FMSuperScout-Setup.exe
#
# Bundelt: viewer (app + node.exe) + plugin-DLL + BepInEx-payload.
# De BepInEx-payload wordt gekopieerd uit een werkende FM26-installatie (de bewezen
# set: Thunderstore-pack BepInEx 6 BE 738 IL2CPP x64 incl. gepatchte Il2CppInterop).
# interop/ en cache/ worden bewust NIET gebundeld: die genereert BepInEx bij de
# eerste start lokaal tegen de game-build van de gebruiker (patch-bestendig).
#
# Vereist: node in PATH, Inno Setup 6 (ISCC.exe), en een FM26-map met BepInEx.
param(
  [string]$GameDir = 'C:\Program Files (x86)\Steam\steamapps\common\Football Manager 26'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $repo 'dist'
$stage = Join-Path $dist 'stage'

# ---- controles vooraf ----
$iscc = @("$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
          "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) { throw 'Inno Setup 6 (ISCC.exe) niet gevonden. Installeer: winget install JRSoftware.InnoSetup' }
if (-not (Test-Path (Join-Path $GameDir 'BepInEx\core\BepInEx.Core.dll'))) {
  throw "Geen BepInEx-installatie gevonden in '$GameDir' - nodig als bron voor de payload."
}
$dll = Join-Path $repo 'plugin\dist\FMSuperScout.dll'
if (-not (Test-Path $dll)) { throw 'plugin\dist\FMSuperScout.dll ontbreekt - bouw de plugin eerst.' }

# ---- icoon + wizard-afbeeldingen (opnieuw) genereren ----
node (Join-Path $PSScriptRoot 'make-icon.js')
node (Join-Path $PSScriptRoot 'make-wizard-images.js')

# ---- schone stage ----
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
$viewer = Join-Path $stage 'viewer'
$bepx = Join-Path $stage 'bepinex'
New-Item -ItemType Directory -Force -Path "$viewer\app", $bepx | Out-Null

# 1) Viewer: alleen wat de tool nodig heeft
foreach ($f in @('server.js', 'index.html', 'app.js', 'style.css', 'logo.svg')) {
  Copy-Item (Join-Path $repo "app\$f") -Destination "$viewer\app" -Force
}
foreach ($f in @('FMSuperScout.vbs', 'icon.ico')) {
  Copy-Item (Join-Path $PSScriptRoot $f) -Destination $viewer -Force
}
$node = (Get-Command node).Source
Copy-Item $node -Destination (Join-Path $viewer 'node.exe') -Force

# 2) Plugin-DLL
Copy-Item $dll -Destination $stage -Force

# 3) BepInEx-payload (root-loader + core + config + unity-libs + dotnet-runtime)
foreach ($f in @('winhttp.dll', 'doorstop_config.ini', '.doorstop_version')) {
  Copy-Item (Join-Path $GameDir $f) -Destination $bepx -Force
}
foreach ($d in @('BepInEx\core', 'BepInEx\config', 'BepInEx\unity-libs', 'dotnet')) {
  $src = Join-Path $GameDir $d
  $dstDir = Join-Path $bepx $d
  New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  Copy-Item "$src\*" -Destination $dstDir -Recurse -Force
}
# Lege plugins-map zodat de structuur compleet is
New-Item -ItemType Directory -Force -Path (Join-Path $bepx 'BepInEx\plugins') | Out-Null
# Licentie mee de payload in
Copy-Item (Join-Path $PSScriptRoot 'LICENSE-BepInEx.txt') -Destination $stage -Force

$mb = [math]::Round((Get-ChildItem $stage -File -Recurse | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host "Stage klaar: $mb MB ongecomprimeerd"

# ---- compileren ----
& $iscc (Join-Path $PSScriptRoot 'FMSuperScout.iss')
if ($LASTEXITCODE -ne 0) { throw "ISCC faalde (exit $LASTEXITCODE)" }
$exe = Join-Path $dist 'FMSuperScout-Setup.exe'

# SHA-256 voor de release notes (verificatie door downloaders; we releasen ongesigneerd).
$hash = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLower()
Set-Content -Path "$exe.sha256" -Value "$hash  FMSuperScout-Setup.exe" -NoNewline
Write-Host ''
Write-Host "Klaar: $exe ($([math]::Round((Get-Item $exe).Length/1MB,1)) MB)" -ForegroundColor Green
Write-Host "SHA-256: $hash"
