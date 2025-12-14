#!/bin/bash

# HP Tourism Portal - Quick Deployment Script
# This script automates the deployment process on a new VM

set -e  # Exit on any error

echo "🚀 HP Tourism Portal - Deployment Script"
echo "========================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it first:"
    echo "export DATABASE_URL=postgresql://username:password@host:port/database"
    exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:push || npm run db:push -- --force
echo "✅ Database schema updated"
echo ""

# Seed initial data
echo "🌱 Seeding initial data (admin user)..."
npx tsx server/seed.ts
echo "✅ Database seeded"
echo ""

# Build application
echo "🔨 Building application for production..."
npm run build
echo "✅ Application built"
echo ""

echo "========================================"
echo "🎉 Deployment completed successfully!"
echo ""
echo "Default Admin Credentials:"
echo "  Mobile: 9999999999"
echo "  Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change this password after first login!"
echo ""
echo "To start the application:"
echo "  Development: npm run dev"
echo "  Production:  npm start"
echo ""
echo "Or use PM2 (recommended):"
echo "  pm2 start npm --name hp-tourism -- start"
echo "========================================"
