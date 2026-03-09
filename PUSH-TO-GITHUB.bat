@echo off
cd /d "%~dp0"
echo.
echo === Push latest code to GitHub ===
echo.
set /p MSG="Commit message (or press Enter for 'Updates'): "
if "%MSG%"=="" set MSG=Updates

git add -A
git diff --cached --quiet 2>nul
if %errorlevel% equ 0 (
  echo Nothing to commit - working tree clean or no changes staged.
  pause
  exit /b 0
)

git status --short
echo.
git commit -m "%MSG%"
if %errorlevel% neq 0 (
  echo Commit failed.
  pause
  exit /b 1
)

git push origin main
if %errorlevel% neq 0 (
  echo Push failed. Check remote and credentials.
  pause
  exit /b 1
)

echo.
echo Done. Latest code is on GitHub.
pause
