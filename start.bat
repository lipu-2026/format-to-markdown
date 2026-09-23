@echo off
setlocal
cd /d "%~dp0"

set "PYTHON_CMD="

where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"

if not defined PYTHON_CMD (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  if exist "D:\Python3.14\python.exe" set "PYTHON_CMD=D:\Python3.14\python.exe"
)

if not defined PYTHON_CMD (
  echo Python was not found.
  echo Please install Python 3, then try again.
  pause
  exit /b 1
)

%PYTHON_CMD% app.py %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Startup failed.
  echo If a Python package is missing, run:
  echo %PYTHON_CMD% -m pip install -r requirements.txt
  pause
)

exit /b %EXIT_CODE%
