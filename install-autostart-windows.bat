@echo off
echo ========================================
echo   AUTO-START INSTALLATION (Windows)
echo ========================================
echo.
echo This will configure Strategic Advisor to:
echo   ✓ Start automatically when Windows starts
echo   ✓ Run in the background
echo   ✓ Monitor 24/7
echo.
echo Press any key to continue, or Ctrl+C to cancel...
pause >nul

REM Get the current directory
set SCRIPT_DIR=%~dp0
set SCRIPT_PATH=%SCRIPT_DIR%START-SERVER-MODE.bat

REM Create VBS script to run batch file hidden
set VBS_PATH=%SCRIPT_DIR%start-hidden.vbs
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_PATH%"
echo WshShell.Run chr(34) ^& "%SCRIPT_PATH%" ^& Chr(34), 0 >> "%VBS_PATH%"
echo Set WshShell = Nothing >> "%VBS_PATH%"

REM Create shortcut in Startup folder
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\Strategic Advisor.lnk

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%VBS_PATH%'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.WindowStyle = 7; $Shortcut.Description = 'Strategic Advisor 24/7 Monitoring'; $Shortcut.Save()"

echo.
echo ✓ Auto-start configured successfully!
echo.
echo Strategic Advisor will now:
echo   • Start automatically when Windows starts
echo   • Run in the background
echo   • Continue monitoring 24/7
echo.
echo To disable auto-start:
echo   1. Press Win+R
echo   2. Type: shell:startup
echo   3. Delete "Strategic Advisor" shortcut
echo.
echo To start now, run: START-SERVER-MODE.bat
echo.
pause
