# Verwijdert FMSuperScout: snelkoppelingen, registervermelding en programmabestanden.
$ErrorActionPreference = 'SilentlyContinue'
$target = Join-Path $env:LOCALAPPDATA 'Programs\FMSuperScout'

# Draaiende server stoppen (node dat vanuit deze map draait)
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like "*Programs\FMSuperScout*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Snelkoppelingen
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\FMSuperScout.lnk'
$desktop = Join-Path ([Environment]::GetFolderPath('Desktop')) 'FMSuperScout.lnk'
Remove-Item $startMenu, $desktop -Force

# Registervermelding
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FMSuperScout' -Recurse -Force

# Bestanden (map verwijdert zichzelf via een losstaand proces zodat dit script niet in de weg zit)
Start-Process cmd.exe -WindowStyle Hidden -ArgumentList '/c', 'timeout /t 2 >nul & rmdir /s /q "' + $target + '"'
Write-Host 'FMSuperScout is verwijderd.' -ForegroundColor Green
