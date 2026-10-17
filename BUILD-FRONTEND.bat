@echo off
echo.
echo ================================================================
echo   MSRIM Digital Campus ERP - Building Frontend
echo ================================================================
echo.
echo Building React frontend for production...
echo (This takes ~30 seconds and only needs to be run when UI changes)
echo.

cd /d "%~dp0frontend"
call npm run build

if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Build failed! Check errors above.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo  Frontend built successfully!
echo  Run START-ERP.bat to launch the portal.
echo ================================================================
echo.
pause
