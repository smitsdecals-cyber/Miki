@echo off
REM Demarre le configurateur Miki sur Windows.
REM Double-cliquez sur ce fichier.

cd /d "%~dp0"

where java >nul 2>nul
if errorlevel 1 (
  echo.
  echo X Java n'est pas installe sur votre ordinateur.
  echo.
  echo Telechargez-le ici (gratuit, 1 minute) :
  echo    https://adoptium.net/temurin/releases/?version=21
  echo.
  echo Choisissez : version 21, type JDK, Windows x64 .msi
  echo Lancez l'installation, puis relancez ce fichier.
  echo.
  pause
  exit /b 1
)

echo Java detecte.
echo Demarrage du configurateur (premier lancement : 1 a 2 minutes)...
echo.

start "Miki Configurator" cmd /c "mvnw.cmd -q spring-boot:run"

echo    Preparation en cours...
set /a count=0
:wait_loop
set /a count+=1
if %count% gtr 120 goto :too_long
timeout /t 1 /nobreak >nul
powershell -Command "try { (Invoke-WebRequest -Uri http://localhost:8080/configurator.html -UseBasicParsing -TimeoutSec 1).StatusCode } catch { exit 1 }" >nul 2>nul
if errorlevel 1 goto :wait_loop

echo.
echo Pret ! Ouverture du navigateur...
echo.
echo    Configurateur :  http://localhost:8080/configurator.html
echo    Administration : http://localhost:8080/admin.html
echo.
start http://localhost:8080/configurator.html
echo Pour ARRETER : fermez la fenetre noire "Miki Configurator".
pause
exit /b 0

:too_long
echo Demarrage trop long. Consultez les messages dans l'autre fenetre.
pause
