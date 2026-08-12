@echo off
title GC Net - Kumpul Spek Jarak Jauh (Admin)
echo Menjalankan script penarik data spek dari PC Client...
echo.
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0Get-Specs-Remote.ps1"
echo.
pause
