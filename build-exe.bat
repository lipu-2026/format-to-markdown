@echo off
setlocal
cd /d "%~dp0"

python build_portable.py %*

if errorlevel 1 (
  echo.
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Build complete. See the versioned ZIP in the release folder.
pause
