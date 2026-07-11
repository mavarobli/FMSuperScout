@echo off
title FMSuperScout
cd /d "%~dp0app"
start "" http://localhost:8765
node server.js
pause
