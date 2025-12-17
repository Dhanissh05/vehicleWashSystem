# Railway Deployment Guide for Vehicle Wash System

## Prerequisites
- Railway account (sign up at https://railway.app)
- GitHub account
- Your code pushed to a GitHub repository

## Step-by-Step Deployment

### 1. Prepare Your Repository

Push your code to GitHub:
```bash
cd E:\Dhanissh_Repo\vehicleWashSystem
git add .
git commit -m "Prepare for Railway deployment"
git push origin master
```

### 2. Deploy Backend to Railway

#### A. Create New Project
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your `vehicleWashSystem` repository
4. Railway will detect the backend automatically

#### B. Add PostgreSQL Database
1. In your Railway project dashboard, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` environment variable will be automatically added

#### C. Configure Environment Variables
1. Click on your backend service
2. Go to "Variables" tab
3. Add the following environment variables:

```env
# Node Environment
NODE_ENV=production
PORT=4000

# Database (already set by Railway)
# DATABASE_URL=postgresql://...

# Base URL (update after deployment)
BASE_URL=https://your-app.railway.app

# JWT
JWT_SECRET=your-super-secret-jwt-key-CHANGE-THIS-IN-PRODUCTION-12345
JWT_EXPIRES_IN=7d

# SMS API (Optional - configure your provider)
SMS_API_KEY=your-sms-api-key
SMS_API_URL=https://api.sms-provider.com/send

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Application URLs (update after deployment)
PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.vehiclewash.customer
COMPANY_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.vehiclewash.company

# CORS Origins (update with your domains)
CUSTOMER_APP_URL=exp://192.168.0.9:8081
COMPANY_APP_URL=exp://192.168.0.9:8082
ADMIN_PANEL_URL=https://your-admin-panel.railway.app

# Firebase Cloud Messaging (Optional)
FCM_SERVER_KEY=your-fcm-server-key
FIREBASE_PROJECT_ID=your-firebase-project-id

# File Upload (Optional - for production use cloud storage)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

#### D. Configure Build Settings (if needed)
1. Go to "Settings" tab
2. Under "Build", set:
   - **Build Command**: `npm run railway:build`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend`

#### E. Deploy
1. Click "Deploy" or push changes to trigger deployment
2. Wait for build to complete
3. Railway will provide a public URL (e.g., `https://your-app.railway.app`)

### 3. Update BASE_URL After Deployment

After deployment, update the `BASE_URL` environment variable:
1. Copy your Railway app URL
2. Go to "Variables" tab
3. Update `BASE_URL=https://your-actual-app.railway.app`
4. Redeploy

### 4. Deploy Admin Panel (Optional)

#### A. Create Another Service
1. In the same Railway project, click "New"
2. Select "GitHub Repo"
3. Choose the same repository
4. Set root directory to `admin-panel`

#### B. Configure Admin Panel
Add environment variables:
```env
VITE_API_URL=https://your-backend.railway.app/graphql
```

Build settings:
- **Build Command**: `npm run build`
- **Start Command**: `npm run preview` or use static hosting
- **Root Directory**: `admin-panel`

### 5. Update Mobile Apps

Update the API URLs in your mobile apps:

**company-app/App.tsx**:
```typescript
const httpLink = createHttpLink({
  uri: 'https://your-backend.railway.app/graphql',
});
```

**company-app/src/screens/WorkerProfileScreen.tsx**:
```typescript
const response = await fetch('https://your-backend.railway.app/upload', {
```

**customer-app/src/apollo/client.ts**:
```typescript
uri: 'https://your-backend.railway.app/graphql',
```

### 6. Database Migration

Railway automatically runs `prisma migrate deploy` during build (configured in `railway:build` script).

To manually run migrations or seed data:
1. Go to your backend service
2. Open "Settings" → "Deployments"
3. Click on latest deployment
4. Use the "Shell" feature to run:
```bash
npx prisma migrate deploy
npx ts-node prisma/seed.ts
```

### 7. Monitor Your Application

- **Logs**: Click on your service → "Deployments" → "View Logs"
- **Metrics**: Check CPU, Memory, and Network usage in dashboard
- **Database**: Access PostgreSQL using the "Connect" button

## Important Notes

### Database Backup
Railway provides automatic backups for PostgreSQL. Configure backup retention:
1. Go to PostgreSQL service
2. Settings → Backups
3. Configure retention period

### File Uploads
For production, use cloud storage instead of local uploads:
- **Cloudinary**: Easy image hosting with CDN
- **AWS S3**: Scalable object storage
- **DigitalOcean Spaces**: S3-compatible storage

Update the upload routes to use cloud storage APIs.

### Custom Domain (Optional)
1. Go to your backend service
2. Settings → Domains
3. Click "Generate Domain" or add custom domain
4. Update DNS records as instructed

### Environment Variables Security
- Never commit `.env` files to git
- Use Railway's environment variables for all secrets
- Rotate JWT secrets and API keys regularly

## Troubleshooting

### Build Fails
- Check logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Prisma schema is valid for PostgreSQL

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check if migrations ran successfully
- Ensure PostgreSQL service is running

### CORS Errors
- Update CORS configuration in `backend/src/index.ts`
- Add your Railway URLs to allowed origins

### File Upload Not Working
- Railway's ephemeral filesystem may clear uploaded files
- Implement cloud storage (Cloudinary, S3) for production

## Cost Estimation

Railway Free Tier includes:
- $5 free credits per month
- Up to 500 hours of usage
- 1GB RAM per service

For production:
- Backend: ~$5-10/month
- PostgreSQL: ~$5-10/month
- Admin Panel: Free (static hosting)

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Configure environment variables
3. ✅ Run database migrations
4. ✅ Update mobile app URLs
5. ✅ Test all endpoints
6. ⚠️ Implement cloud storage for uploads
7. ⚠️ Configure SMS gateway
8. ⚠️ Set up payment gateway (Razorpay)
9. ⚠️ Add monitoring and logging
10. ⚠️ Configure custom domain

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Prisma Docs: https://www.prisma.io/docs

---

**Note**: After deploying to Railway, your SQLite database will be migrated to PostgreSQL. The schema has been updated to use PostgreSQL. Make sure to test thoroughly after deployment.
