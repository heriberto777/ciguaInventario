#!/usr/bin/env bash

echo "🚀 Cigua Inventory - Setup Script"
echo "=================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️ pnpm not found. Installing..."
    npm install -g pnpm
fi

PNPM_VERSION=$(pnpm -v)
echo "✅ pnpm $PNPM_VERSION"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Copy .env
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️ Please update .env with your configuration"
fi

# Start Docker (optional)
echo ""
echo "🐳 Starting PostgreSQL..."
docker-compose up -d

# Wait for DB
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run migrations
echo ""
echo "🔄 Running database migrations..."
pnpm -F @cigua-inv/backend prisma:migrate

# Seed database
echo ""
echo "🌱 Seeding database..."
pnpm -F @cigua-inv/backend seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start development:"
echo "  pnpm dev"
echo ""
echo "Available commands:"
echo "  pnpm -F @cigua-inv/backend dev      # Start backend"
echo "  pnpm -F @cigua-inv/web dev         # Start web"
echo "  pnpm -F @cigua-inv/backend prisma:studio  # Open Prisma Studio"
