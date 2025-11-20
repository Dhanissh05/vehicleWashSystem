# Vehicle Wash Customer App

Customer-facing mobile application for tracking vehicle wash status and payment history.

## Features

- 🔐 OTP-based authentication
- 📍 Auto-detect location
- 🚗 View vehicle wash history
- 📊 Track wash status in real-time
- 💰 Payment history
- 🔔 Push notifications for status updates

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

Update the backend URL in `src/apollo/client.ts`:

```typescript
const httpLink = createHttpLink({
  uri: 'https://your-backend-url.com/graphql',
});
```

## Screen Flow

1. **Login Screen**: OTP verification
2. **Home Screen**: List of vehicles with status
3. **Vehicle Detail Screen**: Detailed view of vehicle wash progress
4. **Payment History**: All payment transactions

## Technologies

- React Native
- Expo
- Apollo Client
- React Navigation
- NativeWind (Tailwind for RN)
