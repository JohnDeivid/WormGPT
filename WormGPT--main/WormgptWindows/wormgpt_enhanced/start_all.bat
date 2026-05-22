@echo off
rem Navigate to frontend and start dev server
cd /d "C:\Users\User Name\Downloads\WormGPT--main\WormGPT--main\WormgptWindows\wormgpt_enhanced\app"
start "Frontend" cmd /k "npm run dev"

rem Navigate to backend and start server
cd /d "C:\Users\User Name\Downloads\WormGPT--main\WormGPT--main\WormgptWindows\wormgpt_enhanced\server"
start "Backend" cmd /k "npm install && node index.js"
