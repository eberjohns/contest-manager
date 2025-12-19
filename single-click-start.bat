@echo off
REM Start the full contest platform system (client, server, tunnel) using Docker Compose
cd /d %~dp0

echo Starting Contest Platform using Docker Compose...
docker-compose up -d --build

REM Wait for credentials file to be created
:waitloop
if not exist data\credentials.json (
    timeout /t 2 >nul
    goto waitloop
)

REM Read credentials using PowerShell for robust JSON parsing
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content data/credentials.json | Out-String | ConvertFrom-Json).admin_username + '|' + (Get-Content data/credentials.json | Out-String | ConvertFrom-Json).class_pin + '|' + (Get-Content data/credentials.json | Out-String | ConvertFrom-Json).url"') do set "creds=%%i"
for /f "tokens=1-3 delims=|" %%a in ("%creds%") do (
    set "admin_username=%%a"
    set "class_pin=%%b"
    set "url=%%c"
)

echo.
echo =============================
echo   Contest Platform Started!
echo   Admin Username: %admin_username%
echo   Class PIN: %class_pin%
echo   URL: %url%
echo =============================
echo.

REM Open the website in the default browser
start "" "%url%"

echo To stop the system, just double-click the single-click-stop.bat file in this folder.
pause
