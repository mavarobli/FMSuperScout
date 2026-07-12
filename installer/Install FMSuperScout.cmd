@echo off
REM Bootstrap: draait de PowerShell-installer zonder gedoe met execution policy.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
