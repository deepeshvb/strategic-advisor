@echo off
echo ========================================
echo Testing TypeScript Build
echo ========================================
echo.

echo [INFO] Running TypeScript compiler check...
call npx tsc --noEmit

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] TypeScript compilation successful!
    echo No type errors found.
    echo.
    echo ========================================
    echo BUILD TEST PASSED
    echo ========================================
    exit /b 0
) else (
    echo.
    echo [ERROR] TypeScript compilation failed!
    echo Please review errors above.
    echo.
    echo ========================================
    echo BUILD TEST FAILED
    echo ========================================
    exit /b 1
)
