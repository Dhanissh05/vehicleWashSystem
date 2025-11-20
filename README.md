# Vehicle Wash Management System

A complete, production-ready vehicle wash management system with GraphQL backend and three client applications for customers, company staff, and administrators.

## 🚀 Project Overview

This system manages a vehicle wash center where customers physically drop their vehicles for washing. Staff members track vehicles through various stages (Received → Washing → Ready for Pickup → Delivered) and process payments.

## 📁 Project Structure

```
vehicle-wash-system/
├── backend/                 # GraphQL API (Node.js + TypeScript + Apollo Server)
├── customer-app/            # Customer Mobile App (React Native)
├── company-app/             # Company Mobile App for Admin & Workers (React Native)
├── admin-panel/             # Admin Web Dashboard (React + Vite + Tailwind)
└── README.md
```

## 🎯 Key Features

### Backend
- **GraphQL API** with Apollo Server
- **Authentication**: JWT + OTP login
- **Payment Integration**: Razorpay, Instamojo, Manual UPI/GPay
- **Role-based Access**: Admin, Worker, Customer
- **Real-time Dashboard Metrics**
- **Push Notifications** via FCM
- **PostgreSQL** with Prisma ORM

### Customer Mobile App
- OTP-based login/registration
- Vehicle history and status tracking
- Payment history
- Real-time wash status updates
- Push notifications for ready vehicles

### Company Mobile App
- Secure login for Admin & Workers
- Add new vehicles and customer details
- Update wash status progression
- Dashboard with metrics (Admin only)
- Pricing management (Admin only)
- Worker management (Admin only)
- Payment collection

### Admin Web Panel
- Modern Dribbble-level UI
- Comprehensive dashboard with charts
- Vehicle management
- User management (Customers, Workers)
- Pricing configuration
- Manual payment verification
- Analytics and reports

## 🛠️ Tech Stack

### Backend
- Node.js 18+
- TypeScript
- Apollo Server (GraphQL)
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Express.js

### Mobile Apps
- React Native
- TypeScript
- Apollo Client
- React Navigation
- Expo
- NativeWind/Tailwind RN

### Web Admin Panel
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Apollo Client
- Recharts (Analytics)
- Framer Motion (Animations)

## 📦 Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn
- Expo CLI (for mobile apps)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend will run on `http://localhost:4000`

### Customer App Setup

```bash
cd customer-app
npm install
npm start
```

### Company App Setup

```bash
cd company-app
npm install
npm start
```

### Admin Panel Setup

```bash
cd admin-panel
npm install
npm run dev
```

Admin panel will run on `http://localhost:5173`

## 🔐 Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vehicle_wash_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
SMS_API_KEY=your-sms-api-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
INSTAMOJO_API_KEY=your-instamojo-key
FCM_SERVER_KEY=your-fcm-key
```

### Mobile Apps

Update the GraphQL endpoint in:
- `customer-app/src/apollo/client.ts`
- `company-app/src/apollo/client.ts`

### Admin Panel

Update the GraphQL endpoint in:
- `admin-panel/src/apollo/client.ts`

## 🚢 Deployment

### Backend (Hostinger VPS)

1. **Setup Server**

```bash
# Install Node.js, PostgreSQL, PM2, Nginx
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx
sudo npm install -g pm2
```

2. **Deploy Application**

```bash
git clone <your-repo>
cd vehicle-wash-system/backend
npm install
npm run build
cp .env.example .env
# Configure .env
npm run prisma:migrate
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Configure Nginx**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. **SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Admin Panel

Deploy to Vercel, Netlify, or any static hosting:

```bash
cd admin-panel
npm run build
# Deploy the 'dist' folder
```

### Mobile Apps

Build and deploy to Google Play Store and Apple App Store:

```bash
# Customer App
cd customer-app
expo build:android
expo build:ios

# Company App
cd company-app
expo build:android
expo build:ios
```

## 📱 User Flows

### Customer Flow
1. Login with mobile + OTP
2. Drop vehicle at wash center
3. Staff adds vehicle details in Company App
4. Customer receives notification when wash status changes
5. Customer picks up vehicle after "Ready for Pickup" notification
6. Payment is recorded

### Worker Flow
1. Login with mobile + password
2. View assigned vehicles
3. Update wash status (Received → Washing → Ready → Delivered)
4. Record payment collection

### Admin Flow
1. Login with credentials
2. View dashboard metrics
3. Manage workers and customers
4. Set pricing for vehicle categories
5. Verify manual payments
6. Assign vehicles to workers

## 🗄️ Database Schema

### Key Models

- **User**: Stores customers, workers, and admins
- **Vehicle**: Vehicle details and wash status
- **Payment**: Payment transactions
- **Pricing**: Pricing for vehicle categories
- **Center**: Wash center locations
- **OtpCode**: OTP verification codes

## 🔑 Default Credentials

### Admin (for testing)
- Mobile: 9999999999
- Password: admin123

### Create Admin User

```sql
INSERT INTO "User" (id, mobile, password, role, name) 
VALUES (
  gen_random_uuid(), 
  '9999999999', 
  '$2a$10$hashed_password', 
  'ADMIN', 
  'Admin User'
);
```

## 📊 API Documentation

### GraphQL Endpoint

`POST http://localhost:4000/graphql`

### Example Queries

```graphql
# Get Dashboard Metrics
query {
  dashboardMetrics {
    totalWashesToday
    totalPaymentsReceived
    carWashesCount
    twoWheelerWashesCount
  }
}

# Get All Vehicles
query {
  vehicles(limit: 10) {
    id
    vehicleNumber
    status
    customer {
      name
      mobile
    }
  }
}
```

### Example Mutations

```graphql
# Login
mutation {
  login(mobile: "9999999999", password: "admin123") {
    token
    user {
      id
      name
      role
    }
  }
}

# Add Vehicle
mutation {
  addVehicle(input: {
    vehicleNumber: "MH12AB1234"
    vehicleType: CAR
    carCategory: SEDAN
    customerMobile: "9876543210"
    customerName: "John Doe"
    centerId: "center-id"
  }) {
    id
    vehicleNumber
    status
  }
}
```

## 🎨 UI/UX Features

- **Clean, Modern Design**: Dribbble-inspired interfaces
- **Gradient Headers**: Eye-catching gradient colors
- **Rounded Cards**: Smooth, rounded UI elements
- **Shadows & Depth**: Subtle shadows for depth
- **Typography**: Inter/Poppins fonts
- **Animations**: Framer Motion (web), Lottie (mobile)
- **Skeleton Loaders**: Loading states
- **Form Validation**: Client-side validation
- **Toast Notifications**: Success/error messages
- **Responsive**: Works on all screen sizes

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Run specific tests
npm test -- vehicles.test.ts
```

## 📈 Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs vehicle-wash-backend

# Check status
pm2 status
```

## 🔄 Updates & Maintenance

```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
npm install
npm run build
pm2 restart vehicle-wash-backend

# Frontend
cd admin-panel
npm install
npm run build
# Deploy new build
```

## 🐛 Troubleshooting

### Backend not starting
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Check port 4000 is not in use

### Mobile app connection issues
- Verify backend URL in apollo client
- Check network connectivity
- Ensure backend is accessible from mobile device

### Database migration issues
```bash
npm run prisma:generate
npm run prisma:migrate
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 📞 Support

For questions or support:
- Email: support@example.com
- GitHub Issues: [Create an issue](https://github.com/yourusername/vehicle-wash-system/issues)

## 🎉 Acknowledgments

- Apollo Server for GraphQL
- Prisma for database management
- Expo for React Native development
- Tailwind CSS for styling
- Recharts for data visualization

---

**Built with ❤️ for efficient vehicle wash management**
