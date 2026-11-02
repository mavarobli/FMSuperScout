# Bouwt de standalone installer: dist\FMSuperScout-Setup.exe
#
# Bundelt: viewer (app + node.exe) + externe scanner (FMSuperScout.Scanner.exe,
# self-contained .NET 8 single-file). Sinds 1.6.0 geen BepInEx/plugin meer: de scanner
# leest FM27 en FM26 van buitenaf, er komt niets in de gamemap.
#
# Vereist: node in PATH, .NET 8 SDK (dotnet), Inno Setup 6 (ISCC.exe).
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $repo 'dist'
$stage = Join-Path $dist 'stage'

# ---- controles vooraf ----
$iscc = @("$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
          "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) { throw 'Inno Setup 6 (ISCC.exe) niet gevonden. Installeer: winget install JRSoftware.InnoSetup' }
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { throw '.NET 8 SDK (dotnet) niet gevonden - nodig voor de scanner.' }

# ---- scanner publiceren (self-contained, één exe) ----
$scannerProj = Join-Path $repo 'scanner\FMSuperScout.Scanner.csproj'
& dotnet publish $scannerProj -c Release --nologo
if ($LASTEXITCODE -ne 0) { throw "dotnet publish scanner faalde (exit $LASTEXITCODE)" }
$scanner = Join-Path $repo 'scanner\dist\FMSuperScout.Scanner.exe'
if (-not (Test-Path $scanner)) { throw "scanner\dist\FMSuperScout.Scanner.exe ontbreekt na publish." }

# ---- icoon + wizard-afbeeldingen (opnieuw) genereren ----
node (Join-Path $PSScriptRoot 'make-icon.js')
node (Join-Path $PSScriptRoot 'make-wizard-images.js')

# ---- schone stage ----
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
$viewer = Join-Path $stage 'viewer'
New-Item -ItemType Directory -Force -Path "$viewer\app" | Out-Null

# Viewer: alleen wat de tool nodig heeft
foreach ($f in @('server.js', 'index.html', 'app.js', 'nations.js', 'style.css', 'logo.svg')) {
  Copy-Item (Join-Path $repo "app\$f") -Destination "$viewer\app" -Force
}
foreach ($f in @('FMSuperScout.vbs', 'icon.ico')) {
  Copy-Item (Join-Path $PSScriptRoot $f) -Destination $viewer -Force
}
$node = (Get-Command node).Source
Copy-Item $node -Destination (Join-Path $viewer 'node.exe') -Force
# Scanner naast node.exe: server.js zoekt hem op ..\FMSuperScout.Scanner.exe
Copy-Item $scanner -Destination $viewer -Force

$mb = [math]::Round((Get-ChildItem $stage -File -Recurse | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host "Stage klaar: $mb MB ongecomprimeerd"

# ---- compileren ----
& $iscc (Join-Path $PSScriptRoot 'FMSuperScout.iss')
if ($LASTEXITCODE -ne 0) { throw "ISCC faalde (exit $LASTEXITCODE)" }
$exe = Join-Path $dist 'FMSuperScout-Setup.exe'

# SHA-256 voor de release notes (verificatie door downloaders; we releasen ongesigneerd).
$hash = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLower()
Set-Content -Path "$exe.sha256" -Value "$hash  FMSuperScout-Setup.exe" -NoNewline

# version.json: mini-asset voor de update-check van de app. De publieke download-teller
# ervan telt de dagelijkse checks en is zo een anonieme maat voor actieve installaties.
# Bij elke release mee-uploaden naast de Setup.exe en .sha256.
$ver = (Select-String -Path (Join-Path $PSScriptRoot 'FMSuperScout.iss') -Pattern 'MyAppVersion "([^"]+)"').Matches[0].Groups[1].Value
Set-Content -Path (Join-Path $dist 'version.json') -Value "{`"tag`":`"v$ver`"}" -NoNewline -Encoding ascii
Write-Host ''
Write-Host "Klaar: $exe ($([math]::Round((Get-Item $exe).Length/1MB,1)) MB)" -ForegroundColor Green
Write-Host "SHA-256: $hash"
