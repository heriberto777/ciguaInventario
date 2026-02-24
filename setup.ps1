#!/usr/bin/env pwsh
# Cigua Inventory - Advanced Setup Script for Windows (PowerShell)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "🚀 Cigua Inventory - Advanced Setup (PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Function to check command exists
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $LASTEXITCODE -eq 0
}

# Check Node.js
Write-Host "✓ Checking Node.js..." -ForegroundColor Yellow
if (Test-CommandExists node) {
    $nodeVersion = node -v
    Write-Host "  ✅ Node.js $nodeVersion found" -ForegroundColor Green
} else {
    Write-Host "  ❌ Node.js not installed!" -ForegroundColor Red
    Write-Host "     Install from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check pnpm
Write-Host "✓ Checking pnpm..." -ForegroundColor Yellow
if (Test-CommandExists pnpm) {
    $pnpmVersion = pnpm -v
    Write-Host "  ✅ pnpm $pnpmVersion found" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  pnpm not found. Installing globally..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = pnpm -v
    Write-Host "  ✅ pnpm $pnpmVersion installed" -ForegroundColor Green
}

# Check Docker (optional)
Write-Host "✓ Checking Docker..." -ForegroundColor Yellow
if (Test-CommandExists docker) {
    $dockerVersion = docker -v
    Write-Host "  ✅ $dockerVersion found" -ForegroundColor Green
    $hasDocker = $true
} else {
    Write-Host "  ⚠️  Docker not found (optional)" -ForegroundColor Yellow
    Write-Host "     Install from: https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    $hasDocker = $false
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Write-Host "   This may take 5-10 minutes on first run..." -ForegroundColor Gray

$installOutput = pnpm install 2>&1
Write-Host $installOutput

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  pnpm install had errors. Continuing..." -ForegroundColor Yellow
    Write-Host "   If you see dependency errors, run: pnpm install --force" -ForegroundColor Gray
}

# Copy .env
Write-Host ""
Write-Host "📝 Checking .env..." -ForegroundColor Cyan
if (Test-Path .env) {
    Write-Host "   ✅ .env already exists" -ForegroundColor Green
} else {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "   ✅ Created .env from .env.example" -ForegroundColor Green
        Write-Host "   ⚠️  Please update .env with your configuration" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ .env.example not found!" -ForegroundColor Red
    }
}

# Generate Prisma Client
Write-Host ""
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Cyan
$prismaGenOutput = pnpm -F @cigua-inv/backend prisma:generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Prisma generation had issues" -ForegroundColor Yellow
    Write-Host $prismaGenOutput -ForegroundColor Gray
}

# Start Docker (if available)
if ($hasDocker) {
    Write-Host ""
    Write-Host "🐳 Starting PostgreSQL with Docker..." -ForegroundColor Cyan

    $downOutput = docker-compose down 2>&1
    Write-Host "   Stopping any existing containers..." -ForegroundColor Gray

    $upOutput = docker-compose up -d 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL container started" -ForegroundColor Green
        Write-Host "   ⏳ Waiting for database to be ready (10 seconds)..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
    } else {
        Write-Host "   ⚠️  Docker startup had issues" -ForegroundColor Yellow
        Write-Host "   Ensure Docker Desktop is running and try again" -ForegroundColor Yellow
        Write-Host $upOutput -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Docker not available" -ForegroundColor Yellow
    Write-Host "   Please ensure PostgreSQL is running on localhost:5432" -ForegroundColor Yellow
    Write-Host "   Update DATABASE_URL in .env if using local PostgreSQL" -ForegroundColor Yellow
}

# Run migrations
Write-Host ""
Write-Host "🔄 Running database migrations..." -ForegroundColor Cyan
$migrateOutput = pnpm -F @cigua-inv/backend prisma:migrate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Database migrations completed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Migrations had issues" -ForegroundColor Yellow
    Write-Host "   You can run manually: pnpm -F @cigua-inv/backend prisma:migrate" -ForegroundColor Gray
    Write-Host $migrateOutput -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "📖 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review .env configuration"
Write-Host "   2. Run: pnpm dev"
Write-Host "   3. Open: http://localhost:5173"
Write-Host "   4. Login: user@company.com / Password123!"
Write-Host ""

Write-Host "🚀 Available Commands:" -ForegroundColor Cyan
Write-Host "   pnpm dev                               - Start all (backend + web)"
Write-Host "   pnpm -F @cigua-inv/backend dev        - Backend only (port 3000)"
Write-Host "   pnpm -F @cigua-inv/web dev            - Frontend only (port 5173)"
Write-Host "   pnpm -F @cigua-inv/backend prisma:studio - Open Prisma Studio"
Write-Host "   docker-compose down                    - Stop database"
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - START_HERE.md      - Quick start guide"
Write-Host "   - TROUBLESHOOTING.md - Common issues & solutions"
Write-Host "   - QUICK_FIX.md       - Fast fixes for errors"
Write-Host "   - ARCHITECTURE.md    - Design patterns"
Write-Host ""

Write-Host "🎯 If you encounter issues:" -ForegroundColor Yellow
Write-Host "   1. Check: QUICK_FIX.md"
Write-Host "   2. Check: TROUBLESHOOTING.md"
Write-Host "   3. Review: .env configuration"
Write-Host ""

Read-Host "Press Enter to continue"
