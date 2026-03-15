@echo off
echo ==========================================
echo Starting ARONIUM POS...
echo ==========================================

:: Start Backend
start "Backend - ARONIUM" cmd /c "cd backend && npm run dev"

:: Start Frontend
start "Frontend - ARONIUM" cmd /c "cd frontend && npm run dev"

echo.
echo Servers are starting in separate windows.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
