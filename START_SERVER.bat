@echo off
title GymPro Server
echo ==========================================
echo    GymPro - Gym Management System
echo ==========================================
echo.
echo Starting server at http://localhost:8080
echo Press Ctrl+C to stop
echo.
start http://localhost:8080
python -m http.server 8080
pause
