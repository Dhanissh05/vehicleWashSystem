# Environment Configuration Guide

This guide explains how to configure the backend API URL for all applications in the Vehicle Wash System.

## 📁 Environment Files

Each application has its own `.env` file for configuration:

```
vehicleWashSystem/
├── backend/
│   └── .env                    # Backend configuration
├── customer-app/
│   ├── .env                    # Customer app configuration
│   └── .env.example            # Template file
├── company-app/
│   ├── .env                    # Company app configuration
│   └── .env.example            # Template file
└── admin-panel/
    ├── .env                    # Admin panel configuration
    └── .env.example            # Template file
```

## 🚀 Quick Setup

### 1. Backend (.env)
```env
# Backend is already configured in backend/.env
# No changes needed for API URL
```

### 2. Customer App (.env)
```env
EXPO_PUBLIC_API_URL=https://vehiclewash-api.sandtell.in/graphql
```

**For local development:**
```env
EXPO_PUBLIC_API_URL=http://192.168.0.5:4000/graphql
```
> Replace `192.168.0.5` with your machine's local IP address

### 3. Company App (.env)
```env
EXPO_PUBLIC_API_URL=https://vehiclewash-api.sandtell.in/graphql
EXPO_PUBLIC_API_BASE_URL=https://vehiclewash-api.sandtell.in
```

**For local development:**
```env
EXPO_PUBLIC_API_URL=http://192.168.0.5:4000/graphql
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.5:4000
```
> Replace `192.168.0.5` with your machine's local IP address

### 4. Admin Panel (.env)
```env
VITE_API_URL=http://localhost:4000/graphql
```

**For production:**
```env
VITE_API_URL=https://vehiclewash-api.sandtell.in/graphql
```

## 🔧 How to Find Your Local IP Address

### Windows:
```powershell
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

### macOS/Linux:
```bash
ifconfig
# Or
ip addr show
```

## 📝 Configuration Steps

### First Time Setup:

1. **Copy example files:**
   ```bash
   # Customer App
   cd customer-app
   cp .env.example .env
   
   # Company App
   cd ../company-app
   cp .env.example .env
   
   # Admin Panel
   cd ../admin-panel
   cp .env.example .env
   ```

2. **Edit .env files:**
   - Open each `.env` file
   - Update the API URL based on your environment (local/production)
   - Save the files

3. **Restart the applications:**
   ```bash
   # Stop all running apps (Ctrl+C)
   # Then restart them
   
   # Backend
   cd backend
   npm run dev
   
   # Customer App
   cd customer-app
   npm start
   
   # Company App
   cd company-app
   npm start
   
   # Admin Panel
   cd admin-panel
   npm run dev
   ```

## 🌍 Environment-Specific Configuration

### Local Development
- Backend: `http://localhost:4000/graphql`
- Mobile Apps: `http://YOUR_IP:4000/graphql` (use your machine's IP)
- Admin Panel: `http://localhost:4000/graphql`

### Staging/Testing
- All apps: `https://staging-api.yourdomain.com/graphql`

### Production
- All apps: `https://vehiclewash-api.sandtell.in/graphql`

## ⚠️ Important Notes

1. **Never commit `.env` files** to version control
   - `.env` files are already in `.gitignore`
   - Only commit `.env.example` files

2. **Mobile Apps Must Use IP Address**
   - Cannot use `localhost` on mobile devices
   - Must use your computer's local IP address
   - Example: `http://192.168.0.5:4000/graphql`

3. **Restart After Changes**
   - Always restart the app after changing `.env` files
   - For Expo apps, you may need to clear cache: `npm start --clear`

4. **Admin Panel Uses Vite**
   - Uses `VITE_` prefix for environment variables
   - Accessed via `import.meta.env.VITE_API_URL`

5. **React Native/Expo Apps**
   - Use `EXPO_PUBLIC_` prefix for environment variables
   - Accessed via `process.env.EXPO_PUBLIC_API_URL`

## 🔍 Troubleshooting

### "Network request failed" error:
- Check if backend is running: `http://localhost:4000/health`
- Verify the API URL in `.env` is correct
- For mobile apps, ensure you're using IP address, not localhost
- Check if firewall is blocking the port

### Changes not reflecting:
- Restart the application
- Clear Metro bundler cache: `npm start --clear`
- For admin panel: `npm run dev` (Vite will auto-reload)

### Cannot connect from mobile device:
- Ensure mobile and computer are on the same network
- Use computer's local IP address, not localhost
- Check firewall settings
- Verify backend is accessible: `http://YOUR_IP:4000/health`

## 📚 Reference

### Files Modified:
- ✅ `customer-app/src/apollo/client.ts` - Uses `process.env.EXPO_PUBLIC_API_URL`
- ✅ `company-app/App.tsx` - Uses `process.env.EXPO_PUBLIC_API_URL`
- ✅ `company-app/src/screens/UploadLogoScreen.tsx` - Uses `process.env.EXPO_PUBLIC_API_BASE_URL`
- ✅ `admin-panel/src/apollo/client.ts` - Uses `import.meta.env.VITE_API_URL`

### No Hardcoded URLs ✅
All API URLs are now configured via environment variables!
