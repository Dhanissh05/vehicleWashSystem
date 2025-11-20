# Vehicle Wash Company App

Mobile application for Admin and Workers to manage vehicle wash operations.

## Features

### For Admin
- 📊 Dashboard with metrics (total washes, payments)
- 👥 Worker management
- 💰 Pricing management
- 🚗 Vehicle management
- ✅ Manual payment verification

### For Workers
- 🚗 View assigned vehicles
- 🔄 Update wash status
- 💳 Record payments

## Setup

```bash
npm install
npm start
```

## Build

```bash
# Android
expo build:android

# iOS
expo build:ios
```

## Configuration

Update the backend URL in Apollo client configuration.

## User Roles

### Admin
- Full access to all features
- Can manage workers
- Can set pricing
- Can view all vehicles

### Worker
- Can view assigned vehicles
- Can update wash status
- Can record payments

## Screen Flow

1. **Login Screen**: Password-based authentication
2. **Dashboard** (Admin only): Metrics and quick actions
3. **Add Vehicle Screen**: Register new vehicles
4. **Vehicles List**: View and manage vehicles
5. **Vehicle Detail**: Update status and payments

## Technologies

- React Native
- Expo
- Apollo Client
- React Navigation
- React Native Chart Kit (for dashboard)
