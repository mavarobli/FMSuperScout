# Bouwt een deelbaar installatiepakket: bundelt node.exe + app + installer in een map
# en zipt die tot FMSuperScout-Setup.zip. Draai dit vanuit de repo (heeft node.exe nodig).
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$dist = Join-Path $repo 'dist'
$pkg = Join-Path $dist 'FMSuperScout'

# Icoon (opnieuw) genereren
node (Join-Path $PSScriptRoot 'make-icon.js')

# Schone dist-map
if (Test-Path $pkg) { Remove-Item $pkg -Recurse -Force }
New-Item -ItemType Directory -Force -Path $pkg | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $pkg 'app') | Out-Null

# App-bestanden (alleen wat de tool nodig heeft; geen testdata/servertooling voor devs)
foreach ($f in @('server.js', 'index.html', 'app.js', 'style.css', 'logo.svg')) {
  Copy-Item (Join-Path $repo "app\$f") -Destination (Join-Path $pkg 'app') -Force
}

# Installer-bestanden
foreach ($f in @('FMSuperScout.vbs', 'icon.ico', 'install.ps1', 'uninstall.ps1',
                 'Install FMSuperScout.cmd', 'Uninstall FMSuperScout.cmd', 'README.txt')) {
  $p = Join-Path $PSScriptRoot $f
  if (Test-Path $p) { Copy-Item $p -Destination $pkg -Force }
}

# node.exe meebundelen zodat vrienden zonder Node het gewoon kunnen draaien
$node = (Get-Command node).Source
Copy-Item $node -Destination (Join-Path $pkg 'node.exe') -Force
Write-Host "node.exe gebundeld ($([math]::Round((Get-Item $node).Length/1MB,1)) MB)"

# Zippen
$zip = Join-Path $dist 'FMSuperScout-Setup.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $pkg -DestinationPath $zip -CompressionLevel Optimal
Write-Host ''
Write-Host "Klaar: $zip" -ForegroundColor Green
Write-Host "Deel dit zip-bestand. Ontvangers pakken het uit en draaien 'Install FMSuperScout.cmd'."
