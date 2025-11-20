#!/bin/bash

###############################################################################
# Vehicle Wash System - Hostinger VPS Deployment Script
#
# This script automates the deployment process on Hostinger VPS
#
# Prerequisites:
# - Ubuntu 20.04/22.04 LTS
# - Root or sudo access
# - Domain pointed to server IP
#
# Usage:
#   chmod +x deploy-hostinger.sh
#   ./deploy-hostinger.sh
#
###############################################################################

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Vehicle Wash System - Hostinger Deployment      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${YELLOW}⚠️  Please run as root or with sudo${NC}"
  exit 1
fi

# Configuration
APP_DIR="/home/vehicle-wash-system"
DOMAIN="your-domain.com" # Change this
ADMIN_EMAIL="admin@your-domain.com" # Change this

echo -e "${YELLOW}📋 Starting deployment...${NC}"
echo ""

# Step 1: Update system
echo -e "${GREEN}[1/10]${NC} Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install Node.js 20
echo -e "${GREEN}[2/10]${NC} Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Step 3: Install PM2
echo -e "${GREEN}[3/10]${NC} Installing PM2..."
npm install -g pm2

# Step 4: Install Nginx
echo -e "${GREEN}[4/10]${NC} Installing Nginx..."
apt install -y nginx

# Step 5: Install PostgreSQL (optional - can use SQLite)
echo -e "${GREEN}[5/10]${NC} Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Step 6: Clone/Setup Application
echo -e "${GREEN}[6/10]${NC} Setting up application..."
if [ ! -d "$APP_DIR" ]; then
  mkdir -p $APP_DIR
  echo -e "${YELLOW}⚠️  Please upload your application files to $APP_DIR${NC}"
  echo -e "${YELLOW}   Or clone from Git:${NC}"
  echo -e "${YELLOW}   git clone https://github.com/your-repo/vehicle-wash-system.git $APP_DIR${NC}"
else
  echo -e "${GREEN}✓ Application directory exists${NC}"
fi

cd $APP_DIR

# Step 7: Install dependencies and build
echo -e "${GREEN}[7/10]${NC} Installing backend dependencies..."
cd $APP_DIR/backend
npm install --production
npx prisma generate
npx prisma migrate deploy || echo "⚠️  Run 'npx prisma migrate dev' manually after configuring DATABASE_URL"
npm run build

# Create uploads directory
mkdir -p uploads/logo uploads/payment
chmod 755 uploads

# Step 8: Setup PM2
echo -e "${GREEN}[8/10]${NC} Setting up PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Step 9: Configure Nginx
echo -e "${GREEN}[9/10]${NC} Configuring Nginx..."
cat > /etc/nginx/sites-available/vehicle-wash <<EOL
# Backend API
server {
    listen 80;
    server_name api.$DOMAIN;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # File upload size limit
    client_max_body_size 10M;
}

# Admin Panel
server {
    listen 80;
    server_name admin.$DOMAIN;

    root $APP_DIR/admin-panel/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOL

# Enable site
ln -sf /etc/nginx/sites-available/vehicle-wash /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Step 10: Install SSL with Let's Encrypt
echo -e "${GREEN}[10/10]${NC} Setting up SSL..."
apt install -y certbot python3-certbot-nginx

echo -e "${YELLOW}To enable SSL, run:${NC}"
echo -e "${YELLOW}certbot --nginx -d api.$DOMAIN -d admin.$DOMAIN --email $ADMIN_EMAIL --agree-tos --no-eff-email${NC}"

# Restart services
systemctl restart nginx
pm2 restart all

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉 Deployment Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Backend API:${NC} http://api.$DOMAIN"
echo -e "${GREEN}✓ Admin Panel:${NC} http://admin.$DOMAIN"
echo -e "${GREEN}✓ GraphQL Playground:${NC} http://api.$DOMAIN/graphql"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Configure environment variables in $APP_DIR/backend/.env"
echo "2. Run SSL setup: certbot --nginx -d api.$DOMAIN -d admin.$DOMAIN"
echo "3. Configure SMS provider API keys"
echo "4. Configure payment gateway credentials"
echo "5. Test the application"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  pm2 status              - Check PM2 processes"
echo "  pm2 logs                - View application logs"
echo "  pm2 restart all         - Restart all processes"
echo "  nginx -t                - Test Nginx configuration"
echo "  systemctl status nginx  - Check Nginx status"
echo ""
