@echo off
REM Vehicle Wash Management System - Setup Script for Windows
REM This script helps set up the entire project

echo ========================================
echo Vehicle Wash Management System - Setup
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)
node -v
echo [OK] Node.js is installed
echo.

REM Check PostgreSQL
echo Checking PostgreSQL...
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] PostgreSQL not found. Please ensure it's installed and running.
) else (
    echo [OK] PostgreSQL found
)
echo.

REM Setup Backend
echo Setting up Backend...
cd backend
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo [WARNING] Please edit backend\.env with your database credentials
)

echo Installing backend dependencies...
call npm install

echo Generating Prisma client...
call npm run prisma:generate

echo [OK] Backend setup complete
echo.

REM Setup Customer App
echo Setting up Customer App...
cd ..\customer-app
echo Installing customer app dependencies...
call npm install
echo [OK] Customer app setup complete
echo.

REM Setup Company App
echo Setting up Company App...
cd ..\company-app
echo Installing company app dependencies...
call npm install
echo [OK] Company app setup complete
echo.

REM Setup Admin Panel
echo Setting up Admin Panel...
cd ..\admin-panel
echo Installing admin panel dependencies...
call npm install
echo [OK] Admin panel setup complete
echo.

cd ..

REM Final Instructions
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Configure your database:
echo    - Edit backend\.env with your PostgreSQL credentials
echo.
echo 2. Run database migrations:
echo    cd backend
echo    npm run prisma:migrate
echo    npm run seed
echo.
echo 3. Start the backend:
echo    npm run dev
echo    (Backend will run on http://localhost:4000)
echo.
echo 4. Start the admin panel (in a new terminal):
echo    cd admin-panel
echo    npm run dev
echo    (Admin panel will run on http://localhost:5173)
echo.
echo 5. Start mobile apps (in new terminals):
echo    cd customer-app
echo    npm start
echo.
echo    cd company-app
echo    npm start
echo.
echo Default admin credentials:
echo    Mobile: 9999999999
echo    Password: admin123
echo.
echo Happy coding!
echo.
pause
