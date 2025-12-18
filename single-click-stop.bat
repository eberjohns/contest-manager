@echo off
REM Stop the contest platform system (client, server, tunnel) using Docker Compose
cd /d %~dp0

echo Stopping Contest Platform...
docker-compose down

echo System stopped. You can now close this window.
pause
