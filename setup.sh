#!/bin/bash

# Vehicle Wash Management System - Setup Script
# This script helps set up the entire project

set -e

echo "🚀 Vehicle Wash Management System - Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"

# Check PostgreSQL
echo ""
echo "🐘 Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Please ensure it's installed and running.${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL found${NC}"
fi

# Setup Backend
echo ""
echo "🔧 Setting up Backend..."
cd backend
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit backend/.env with your database credentials${NC}"
fi

echo "📦 Installing backend dependencies..."
npm install

echo "🔄 Generating Prisma client..."
npm run prisma:generate

echo -e "${GREEN}✅ Backend setup complete${NC}"

# Setup Customer App
echo ""
echo "📱 Setting up Customer App..."
cd ../customer-app
echo "📦 Installing customer app dependencies..."
npm install
echo -e "${GREEN}✅ Customer app setup complete${NC}"

# Setup Company App
echo ""
echo "📱 Setting up Company App..."
cd ../company-app
echo "📦 Installing company app dependencies..."
npm install
echo -e "${GREEN}✅ Company app setup complete${NC}"

# Setup Admin Panel
echo ""
echo "💻 Setting up Admin Panel..."
cd ../admin-panel
echo "📦 Installing admin panel dependencies..."
npm install
echo -e "${GREEN}✅ Admin panel setup complete${NC}"

cd ..

# Final Instructions
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure your database:"
echo "   - Edit backend/.env with your PostgreSQL credentials"
echo ""
echo "2. Run database migrations:"
echo "   cd backend"
echo "   npm run prisma:migrate"
echo "   npm run seed"
echo ""
echo "3. Start the backend:"
echo "   npm run dev"
echo "   (Backend will run on http://localhost:4000)"
echo ""
echo "4. Start the admin panel (in a new terminal):"
echo "   cd admin-panel"
echo "   npm run dev"
echo "   (Admin panel will run on http://localhost:5173)"
echo ""
echo "5. Start mobile apps (in new terminals):"
echo "   cd customer-app && npm start"
echo "   cd company-app && npm start"
echo ""
echo "Default admin credentials:"
echo "   Mobile: 9999999999"
echo "   Password: admin123"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
