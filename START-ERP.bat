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

echo [1/2] Starting Backend Server (Port 5000)...
start "MSRIM Backend - MS Ramaiah Institute" cmd /k "cd /d "%~dp0backend" && node server.js"

timeout /t 4 /nobreak > nul

echo [2/2] Starting Frontend Portal (Port 5173)...
start "MSRIM Frontend - MS Ramaiah Institute" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 6 /nobreak > nul

echo.
echo ================================================================
echo  MSRIM Digital Campus ERP is RUNNING!
echo.
echo  Portal URL:  http://localhost:5173
echo  API URL:     http://localhost:5000
echo.
echo  Login Credentials:
echo   Admin:       admin      / Admin@123
echo   Registrar:   registrar  / Reg@123
echo   HOD:         hod.mgt    / Hod@123
echo   Faculty:     faculty1   / Fac@123
echo   Student:     student1   / Stu@123
echo   Accounts:    accounts   / Acc@123
echo   Librarian:   librarian  / Lib@123
echo   Placement:   placement  / Plc@123
echo ================================================================
echo.

start http://localhost:5173
pause
