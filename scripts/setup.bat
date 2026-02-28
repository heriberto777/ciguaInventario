@echo off
REM Cigua Inventory - Setup Script for Windows

echo.
echo 🚀 Cigua Inventory - Setup Script
echo ==================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION%

REM Check pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ pnpm not found. Installing...
    npm install -g pnpm
)

for /f "tokens=*" %%i in ('pnpm -v') do set PNPM_VERSION=%%i
echo ✅ pnpm %PNPM_VERSION%

REM Install dependencies
echo.
echo 📦 Installing dependencies...
echo    This may take a few minutes...
call pnpm install
if %errorlevel% neq 0 (
    echo ⚠️ Install had issues but continuing...
)

REM Copy .env
if not exist .env (
    echo.
    echo 📝 Creating .env from .env.example...
    copy .env.example .env
    echo ⚠️ Please update .env with your configuration
) else (
    echo ✅ .env already exists
)

REM Start Docker
echo.
echo 🐳 Starting PostgreSQL...
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Docker not installed. Install Docker Desktop and retry.
    echo    Or run: docker-compose up -d manually
) else (
    docker-compose up -d
    if %errorlevel% neq 0 (
        echo ⚠️ Docker startup had issues. Ensure Docker Desktop is running.
    ) else (
        echo ⏳ Waiting for database to be ready...
        timeout /t 5 /nobreak
    )
)

REM Run migrations
echo.
echo 🔄 Running database migrations...
call pnpm -F @cigua-inv/backend prisma:generate
call pnpm -F @cigua-inv/backend prisma:migrate
if %errorlevel% neq 0 (
    echo ⚠️ Migrations failed. Run manually:
    echo    pnpm -F @cigua-inv/backend prisma:migrate
)

REM Generate Prisma client
echo.
echo 🔧 Generating Prisma client...
call pnpm -F @cigua-inv/backend prisma:generate

echo.
echo ✅ Setup complete!
echo.
echo Start development:
echo   pnpm dev
echo.
echo Available commands:
echo   pnpm -F @cigua-inv/backend dev              # Start backend (port 3000)
echo   pnpm -F @cigua-inv/web dev                 # Start web (port 5173)
echo   pnpm -F @cigua-inv/backend prisma:studio   # Open Prisma Studio
echo   docker-compose down                        # Stop database
echo.
echo 📖 Next steps:
echo   1. Update .env with your configuration
echo   2. Run: pnpm dev
echo   3. Visit: http://localhost:5173
echo.
pause
