@echo off
echo ==============================================
echo   Placement Preparation Portal Startup Script
echo ==============================================
echo.
echo Starting backend Server on http://localhost:5000 ...
start cmd /k "echo Starting Backend... && cd backend && npm run dev"
echo.
echo Starting frontend Vite Dev Server on http://localhost:5173 and LAN access ...
start cmd /k "echo Starting Frontend... && cd frontend && npm run dev -- --host 0.0.0.0"
echo.
echo ==============================================
echo Setup Complete! Direct your browser to http://localhost:5173
echo For local-network access, use your PC IP like http://192.168.x.x:5173
echo ==============================================
pause
