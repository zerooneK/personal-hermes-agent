@echo off
rem Launch Hermes Desktop from this checkout.
rem Hermes needs Node >= 26; use the nvm-installed 26.x without switching the
rem machine-wide default Node.
rem
rem   start-desktop.cmd         run the last production build (builds it first
rem                             if there is none)
rem   start-desktop.cmd build   rebuild, then run (after changing the code/theme)
rem   start-desktop.cmd dev     Vite dev mode with hot reload (for development;
rem                             less stable when the machine is busy)
setlocal
for /d %%D in ("%NVM_HOME%\v26.*") do set "NODE26=%%~fD"
if not defined NODE26 (
  echo Node 26 not found under %NVM_HOME%. Run: nvm install 26
  exit /b 1
)
set "PATH=%NODE26%;%PATH%"
rem A built app otherwise falls back to the older installed runtime under
rem %LOCALAPPDATA%\hermes\hermes-agent; pin it to this checkout like dev mode.
set "HERMES_DESKTOP_HERMES_ROOT=%~dp0."
cd /d "%~dp0apps\desktop"

if /i "%~1"=="dev" (
  npm run dev
  exit /b
)
if /i "%~1"=="build" goto build
if not exist "dist\index.html" goto build
if not exist "dist\electron-main.mjs" goto build
goto run

rem Call node and electron.exe directly: npm run / npx each add a few seconds
rem of startup on Windows before any real work begins.
:build
node scripts\build.mjs || exit /b 1

:run
set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
if exist "%ELECTRON_EXE%" (
  "%ELECTRON_EXE%" .
) else (
  call npx electron .
)
