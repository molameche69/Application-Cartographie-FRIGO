@echo off
start "" "mongoose.exe"
timeout /t 1 /nobreak >nul
start http://localhost:8080

exit