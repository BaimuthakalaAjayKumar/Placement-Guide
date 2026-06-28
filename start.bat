@echo off
echo ==============================================
echo   Placement Preparation Portal Startup Script
echo ==============================================
echo.
echo Starting backend Server on http://localhost:5000 ...
start cmd /k "echo Starting Backend... && cd backend && npm run dev"
echo.
echo Starting frontend Vite Dev Server on http://localhost:5173 ...
start cmd /k "echo Starting Frontend... && cd frontend && npm run dev"
echo.
echo ==============================================
echo Setup Complete! Direct your browser to http://localhost:5173
echo ==============================================
pause
