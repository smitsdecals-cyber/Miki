@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Configurateur SVG Miki - Demarrage
echo ============================================
echo.

REM --- 1) Verifier que Java est installe ---
where java >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Java n'est pas detecte.
  echo.
  echo 1. Installez Java 21 JDK : https://adoptium.net/temurin/releases/?version=21
  echo 2. REDEMARREZ votre ordinateur apres l'installation
  echo 3. Relancez ce script
  echo.
  pause
  exit /b 1
)

echo [OK] Java detecte :
java -version
echo.

REM --- 2) Lancer Maven Wrapper directement dans CETTE fenetre ---
echo [INFO] Demarrage du serveur (premier lancement : 1 a 3 minutes)
echo [INFO] NE PAS FERMER cette fenetre tant que vous utilisez l'application.
echo.
echo Quand vous voyez la ligne "Started ConfiguratorApplication",
echo ouvrez votre navigateur sur :
echo.
echo     http://localhost:8080/configurator.html
echo.
echo Pour ARRETER : Ctrl+C dans cette fenetre, ou fermez-la.
echo ============================================
echo.

call mvnw.cmd spring-boot:run

REM Si on arrive ici, c'est que mvnw s'est arrete (erreur ou fermeture)
echo.
echo ============================================
echo Le serveur s'est arrete. Lisez le message ci-dessus.
echo ============================================
pause
endlocal
