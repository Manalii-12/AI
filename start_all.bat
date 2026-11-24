@echo off
echo ========================================================
echo Starting Hugg AI Platform (Backend + Frontend)...
echo ========================================================
start "Hugg AI Backend (FastAPI :8000)" cmd /k "cd /d %~dp0backend && python run.py"
start "Hugg AI Frontend (React/Vite :3000)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both services launched in separate terminal windows!
echo Backend API : http://localhost:8000
echo Frontend UI : http://localhost:3000
