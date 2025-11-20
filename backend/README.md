# Vehicle Wash Management System - Backend

A production-ready GraphQL backend for managing vehicle wash operations built with Node.js, TypeScript, Apollo Server, Prisma, and PostgreSQL.

## Features

- 🔐 **Authentication**: JWT-based auth with OTP login
- 📊 **GraphQL API**: Complete queries and mutations for vehicle, payment, and user management
- 💳 **Payment Integration**: Razorpay, Instamojo, and manual payment support
- 👥 **Role-Based Access**: Admin, Worker, and Customer roles
- 🚗 **Vehicle Management**: Track vehicles through wash stages
- 📱 **Push Notifications**: FCM integration for customer notifications
- 🎯 **Real-time Updates**: Live dashboard metrics

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **API**: Apollo Server (GraphQL)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Payments**: Razorpay, Instamojo

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis (optional, for caching)

## Installation

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/vehicle_wash_db"
JWT_SECRET=your-super-secret-jwt-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 4. Seed Initial Data (Optional)

Create a seed script or manually add:
- Admin user
- Worker accounts
- Pricing for vehicle categories
- Wash center details

## Development

```bash
npm run dev
```

Server will start at `http://localhost:4000`

- GraphQL Playground: `http://localhost:4000/graphql`
- Health Check: `http://localhost:4000/health`

## Building for Production

```bash
npm run build
npm start
```

## Deployment on Hostinger VPS

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install nginx
```

### 2. PostgreSQL Setup

```bash
sudo -u postgres psql

CREATE DATABASE vehicle_wash_db;
CREATE USER vehiclewash WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vehicle_wash_db TO vehiclewash;
\q
```

### 3. Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd vehicle-wash-system/backend

# Install dependencies
npm install

# Build
npm run build

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Run migrations
npm run prisma:migrate

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/vehicle-wash`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/vehicle-wash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 6. Firewall Setup

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## PM2 Management

```bash
# View logs
pm2 logs vehicle-wash-backend

# Restart
pm2 restart vehicle-wash-backend

# Stop
pm2 stop vehicle-wash-backend

# Monitor
pm2 monit
```

## GraphQL Schema

### Key Queries

- `me` - Get current user
- `vehicles` - List all vehicles with filters
- `dashboardMetrics` - Get dashboard statistics
- `pricing` - Get pricing information
- `workers` - List all workers
- `customers` - List all customers

### Key Mutations

- `sendOtp` - Send OTP to mobile
- `verifyOtp` - Verify OTP and login
- `login` - Login with password
- `addVehicle` - Add new vehicle
- `updateVehicleStatus` - Update wash status
- `updatePricing` - Update pricing
- `markPayment` - Record payment
- `verifyManualPayment` - Approve/reject manual payments

## REST Endpoints

- `POST /api/send-otp` - Send OTP
- `POST /api/verify-otp` - Verify OTP
- `POST /webhook/razorpay` - Razorpay webhook
- `POST /webhook/instamojo` - Instamojo webhook

## Database Schema

### Models

- **User**: Customers, Workers, Admins
- **Vehicle**: Vehicle details and wash status
- **Payment**: Payment transactions
- **Pricing**: Vehicle category pricing
- **Center**: Wash center locations
- **OtpCode**: OTP verification

## Security

- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ Input validation
- ✅ SQL injection prevention (Prisma)
- ✅ Rate limiting (recommended: express-rate-limit)
- ✅ CORS configuration
- ✅ Helmet.js (recommended for production)

## Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check logs
pm2 logs --lines 100

# System stats
pm2 list
```

## Backup

### Database Backup

```bash
pg_dump -U vehiclewash vehicle_wash_db > backup_$(date +%Y%m%d).sql
```

### Automated Backup (Cron)

```bash
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U vehiclewash vehicle_wash_db > /path/to/backups/backup_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Port Already in Use

```bash
lsof -i :4000
kill -9 <PID>
```

### Prisma Client Issues

```bash
npm run prisma:generate
```

### Database Connection Failed

- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify DATABASE_URL in `.env`
- Check firewall rules

## Support

For issues or questions, contact: support@example.com

## License

MIT License
