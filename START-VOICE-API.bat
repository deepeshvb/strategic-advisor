@echo off
echo ============================================
echo  Starting Voice API Server
echo ============================================
echo.
echo Starting Voice API on port 3001...
echo.
echo This provides endpoints for Siri shortcuts:
echo   - /api/voice/critical
echo   - /api/voice/summary
echo   - /api/voice/status
echo   - /api/voice/query
echo.
echo Keep this window open!
echo.

npm run api

pause
