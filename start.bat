@echo off
echo ==========================================
echo   Job Agents — تشغيل النظام
echo ==========================================

echo.
echo [1/2] تشغيل الـ Backend...
start "Job Agents Backend" cmd /k "cd /d %~dp0backend && set PYTHONPATH=%~dp0backend && C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo [2/2] تشغيل الـ Frontend...
timeout /t 3 /nobreak > nul
start "Job Agents Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo   الموقع سيفتح على: http://localhost:5173
echo   الـ API يعمل على:  http://localhost:8000
echo ==========================================
timeout /t 5 /nobreak > nul
start http://localhost:5173
