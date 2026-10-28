@echo off
rem Launch Hermes Desktop from this checkout in dev mode.
rem Hermes needs Node >= 26; use the nvm-installed 26.x without switching the
rem machine-wide default Node.
setlocal
for /d %%D in ("%NVM_HOME%\v26.*") do set "NODE26=%%~fD"
if not defined NODE26 (
  echo Node 26 not found under %NVM_HOME%. Run: nvm install 26
  exit /b 1
)
set "PATH=%NODE26%;%PATH%"
cd /d "%~dp0apps\desktop"
npm run dev
