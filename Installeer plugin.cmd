@echo off
title FMSuperScout - plugin installeren
setlocal

set "SRC=%~dp0plugin\dist\FMSuperScout.dll"
set "DST=C:\Program Files (x86)\Steam\steamapps\common\Football Manager 26\BepInEx\plugins"

echo FMSuperScout plugin installeren...
echo.

:check
tasklist /FI "IMAGENAME eq fm.exe" 2>NUL | find /I "fm.exe" >NUL
if not errorlevel 1 (
  echo [!] Football Manager 26 draait nog. Sluit de game volledig af.
  echo     Druk op een toets zodra FM26 dicht is om opnieuw te proberen...
  pause >NUL
  goto check
)

if not exist "%DST%" (
  echo [FOUT] BepInEx plugins-map niet gevonden op:
  echo        %DST%
  echo        Klopt je Steam-installatiepad?
  pause
  exit /b 1
)

copy /Y "%SRC%" "%DST%\FMSuperScout.dll" >NUL
if errorlevel 1 (
  echo [FOUT] Kopieren mislukt.
) else (
  echo [OK] Nieuwe plugin geinstalleerd. Start FM26 en druk op F9.
)
echo.
pause
