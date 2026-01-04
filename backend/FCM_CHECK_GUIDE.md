# How to Check FCM Tokens and Get Admin Token in Production

This guide shows you how to check FCM tokens and get admin authentication token for GraphQL queries in Railway production.

## 🎯 Quick Answer

### Option 1: Check FCM using Script (Easiest)
```bash
cd backend
node check-fcm-production.js
```

### Option 2: Get Admin Token for GraphQL
```bash
cd backend
node get-admin-token.js
```

---

## 📋 Detailed Instructions

### Method 1: Using Database Script (Recommended)

**Step 1: Check your .env file**
```bash
cd backend
```

Make sure your `.env` has the production DATABASE_URL:
```env
DATABASE_URL="postgresql://username:password@host:port/database"
JWT_SECRET="your-jwt-secret"
```

**Step 2: Run the FCM check script**
```bash
node check-fcm-production.js
```

This will show:
- Total customers
- How many have FCM tokens
- How many don't have FCM tokens
- Percentage coverage

---

### Method 2: Using GraphQL (Needs Admin Token)

**Step 1: Get Admin Token**
```bash
cd backend
node get-admin-token.js
```

This will:
- Verify admin credentials
- Generate a JWT token
- Show you how to use it

**Step 2: Use the Token in GraphQL Playground**

1. Open your Railway GraphQL endpoint:
   ```
   https://your-app.railway.app/graphql
   ```

2. Click **"HTTP HEADERS"** at the bottom

3. Add this header (replace TOKEN with the one from step 1):
   ```json
   {
     "Authorization": "Bearer YOUR_TOKEN_HERE"
   }
   ```

4. Run this query:
   ```graphql
   query CheckFCMTokens {
     users(where: { role: { equals: CUSTOMER } }) {
       id
       name
       mobile
       fcmToken
     }
   }
   ```

---

## 🔐 Default Admin Credentials

- **Mobile:** `9999999999`
- **Password:** `admin123`

If these don't work, reset the password:
```bash
cd backend
node reset-admin-password.js
```

---

## 🚨 Troubleshooting

### Problem: "Admin not found"
**Solution:**
1. Check your database for existing admin users
2. Look for a user with role = "ADMIN"
3. Update the mobile number in `get-admin-token.js` if different

### Problem: "Invalid credentials"
**Solution:**
```bash
node reset-admin-password.js
```

### Problem: "Cannot connect to database"
**Solution:**
1. Check DATABASE_URL in `.env`
2. Make sure Railway database allows connections from your IP
3. For Railway: Database should be accessible publicly or via Railway proxy

### Problem: "GraphQL says 'Not authenticated'"
**Solution:**
1. Make sure you copied the FULL token (it's very long)
2. Include "Bearer " before the token
3. Check token hasn't expired (default: 7 days)

---

## 💡 Tips

### Check FCM Coverage Percentage
```bash
node check-fcm-production.js
```
Look for the "Coverage: XX%" line

### Get a Fresh Token
Tokens expire after 7 days. Just run:
```bash
node get-admin-token.js
```

### Using cURL to Check FCM
```bash
curl -X POST https://your-app.railway.app/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"{ users(where: { role: { equals: CUSTOMER } }) { id name mobile fcmToken } }"}'
```

---

## 📊 Understanding the Results

When you run `check-fcm-production.js`, you'll see:

```
📊 Total customers: 150

✅ Customers WITH FCM tokens: 120 (80%)
❌ Customers WITHOUT FCM tokens: 30 (20%)
```

**Good Coverage:** 80%+ of customers have FCM tokens
**Needs Improvement:** Less than 80%

**Why customers might not have tokens:**
1. Haven't updated to latest app version
2. Denied notification permissions
3. Haven't opened the app since FCM was added
4. App was uninstalled and reinstalled
5. Using older device that doesn't support FCM

---

## 🔄 Alternative: Using Railway Console

If you have Railway CLI installed:

```bash
# Connect to Railway
railway login

# Link to your project
railway link

# Run the check script directly on Railway
railway run node check-fcm-production.js

# Or get admin token
railway run node get-admin-token.js
```

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Check FCM tokens | `node check-fcm-production.js` |
| Get admin token | `node get-admin-token.js` |
| Reset admin password | `node reset-admin-password.js` |
| Use GraphQL | Add header: `Authorization: Bearer TOKEN` |

---

## 🎓 Example GraphQL Queries

### Count customers with FCM
```graphql
query CountFCM {
  users(where: { 
    role: { equals: CUSTOMER }
    fcmToken: { not: null }
  }) {
    id
  }
}
```

### Get customers without FCM
```graphql
query CustomersWithoutFCM {
  users(where: { 
    role: { equals: CUSTOMER }
    fcmToken: null
  }) {
    id
    name
    mobile
    createdAt
  }
}
```

### Test sending a notification
```graphql
mutation TestNotification {
  sendCustomNotification(
    userId: "user_id_here"
    title: "Test"
    body: "Testing FCM"
  ) {
    success
    message
  }
}
```
