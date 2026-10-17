@echo off
echo.
echo ================================================================
echo   MS Ramaiah Institute of Management - MSRIM Digital Campus
echo   ERP Portal v2.0 - Proprietary Software
echo   Owner: M S Ramaiah Institute of Management, Bangalore
echo   All Rights Reserved (c) 2024-2026
echo ================================================================
echo.
echo  Modules: 30+ | Users: 8 Roles | Features: 200+
echo  Covering: AMS, Fees, Admissions, Exams, LMS, OBE, HR,
echo            Library, Placements, Hostel, Feedback, Infrastructure,
echo            Drive, Mentor-Mentee, Feed, Help Center, Analytics
echo ================================================================
echo.

if not exist "%~dp0frontend\dist\index.html" (
  echo [!] Frontend not built yet. Running BUILD-FRONTEND.bat first...
  call "%~dp0BUILD-FRONTEND.bat"
)

echo [1/1] Starting MSRIM ERP Server (Port 5000)...
start "MSRIM Digital Campus ERP" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 3 /nobreak > nul

echo.
echo ================================================================
echo  MSRIM Digital Campus ERP is RUNNING!
echo.
echo  Portal URL:  http://localhost:5000
echo  API URL:     http://localhost:5000/api
echo.
echo  Login Credentials:
echo   Admin:       systemsupport@msrim.org  / support@2026
echo   Student:     student1                 / Stu@123
echo   Faculty:     shashidhar               / (use /api/auth/reset)
echo   Accounts:    accounts                 / Acc@123
echo ================================================================
echo.

start http://localhost:5000
pause
