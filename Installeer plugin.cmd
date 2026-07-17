@echo off
title FMSuperScout - plugin installeren
setlocal

set "SRC=%~dp0plugin\dist\FMSuperScout.dll"
set "DST=C:\Program Files (x86)\Steam\steamapps\common\Football Manager 26\BepInEx\plugins"

echo FMSuperScout plugin installeren
echo.

if exist "%SRC%" goto srcok
echo [FOUT] Bronbestand niet gevonden:
echo        %SRC%
echo        Bouw de plugin eerst (dotnet build plugin -c Release en kopieer naar plugin\dist).
pause
exit /b 1
:srcok
for %%F in ("%SRC%") do echo Te installeren build: %%~tF - %%~zF bytes

if exist "%DST%" goto dstok
echo [FOUT] BepInEx plugins-map niet gevonden op:
echo        %DST%
echo        Klopt je Steam-installatiepad?
pause
exit /b 1
:dstok
if not exist "%DST%\FMSuperScout.dll" goto check
for %%F in ("%DST%\FMSuperScout.dll") do echo Nu geinstalleerd:      %%~tF - %%~zF bytes

:check
tasklist /FI "IMAGENAME eq fm.exe" 2>NUL | find /I "fm.exe" >NUL
if errorlevel 1 goto copy
echo.
echo [let op] Football Manager 26 draait nog; de plugin-DLL is dan vergrendeld.
echo          Sluit de game VOLLEDIG af en druk daarna op een toets...
pause >NUL
goto check

:copy
copy /Y "%SRC%" "%DST%\FMSuperScout.dll" >NUL 2>&1
if not errorlevel 1 goto ok
echo.
echo [FOUT] Kopieren mislukt.
echo        - Draait FM26 toch nog? Controleer Taakbeheer op fm.exe.
echo        - Geen schrijfrechten? Rechtsklik dit script en kies
echo          "Als administrator uitvoeren".
pause
exit /b 1

:ok
echo.
for %%F in ("%DST%\FMSuperScout.dll") do echo [OK] Geinstalleerd:    %%~tF - %%~zF bytes
echo      Start FM26; de nieuwe plugin laadt vanzelf mee.
echo.
pause
