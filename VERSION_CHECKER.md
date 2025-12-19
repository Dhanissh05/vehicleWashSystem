# App Version Checker

Automatic update notification system for direct APK distribution (without Play Store).

## Overview

The version checker compares the app's current version with the latest version configured on the backend. When a newer version is available, it shows an update dialog to users with download links.

## Features

- ✅ Automatic version check on app startup
- ✅ Force update capability (blocks app usage until updated)
- ✅ Optional updates (users can skip)
- ✅ Custom update messages and release notes
- ✅ Direct APK download links
- ✅ Separate version management for customer and company apps

## Architecture

### Backend (GraphQL API)

**GraphQL Schema:**
```graphql
type AppVersion {
  companyApp: String!
  customerApp: String!
  companyAppDownloadUrl: String
  customerAppDownloadUrl: String
  forceUpdate: Boolean!
  updateMessage: String
  releaseNotes: String
}

type Query {
  appVersion: AppVersion
}
```

**Database (SystemConfig):**
- `COMPANY_APP_VERSION` - Current version of company app (e.g., "1.0.0")
- `CUSTOMER_APP_VERSION` - Current version of customer app (e.g., "1.0.0")
- `COMPANY_APP_DOWNLOAD_URL` - Direct link to company app APK
- `CUSTOMER_APP_DOWNLOAD_URL` - Direct link to customer app APK
- `FORCE_UPDATE` - "true" or "false" (blocks app if update required)
- `UPDATE_MESSAGE` - Custom message shown in dialog
- `RELEASE_NOTES` - Details about new version features

### Mobile Apps (React Native)

**Components:**
- `useVersionChecker.ts` - Hook that checks version on app start
- `APP_VERSION_NUMBER` constant in hook - Must be updated with each release

**Flow:**
1. App starts → `useVersionChecker()` runs
2. Queries backend for latest version
3. Compares with `APP_VERSION_NUMBER`
4. Shows dialog if newer version available

## Usage

### 1. Build New APK

```bash
# Customer app
cd customer-app
eas build -p android --profile production

# Company app
cd company-app
eas build -p android --profile production
```

### 2. Upload APK

Upload the built APK to a hosting service:
- Google Drive (with public share link)
- Dropbox (with direct download link)
- Your own server (e.g., https://vehiclewash-api.sandtell.in/downloads/customer-app-v1.1.0.apk)
- Firebase Storage
- GitHub Releases

### 3. Update Backend Configuration

Using Prisma Studio or SQL:

```typescript
// Update version and download URL
await prisma.systemConfig.update({
  where: { key: 'CUSTOMER_APP_VERSION' },
  data: { value: '1.1.0' }
});

await prisma.systemConfig.update({
  where: { key: 'CUSTOMER_APP_DOWNLOAD_URL' },
  data: { value: 'https://your-storage.com/customer-app-v1.1.0.apk' }
});

// Optional: Force update
await prisma.systemConfig.update({
  where: { key: 'FORCE_UPDATE' },
  data: { value: 'true' }
});

// Optional: Custom message
await prisma.systemConfig.update({
  where: { key: 'UPDATE_MESSAGE' },
  data: { value: 'New features and bug fixes available!' }
});

// Optional: Release notes
await prisma.systemConfig.update({
  where: { key: 'RELEASE_NOTES' },
  data: { value: '- Added dark mode\n- Fixed payment issues\n- Improved performance' }
});
```

Or using SQL directly:
```sql
UPDATE "SystemConfig" SET value = '1.1.0' WHERE key = 'CUSTOMER_APP_VERSION';
UPDATE "SystemConfig" SET value = 'https://storage.com/app.apk' WHERE key = 'CUSTOMER_APP_DOWNLOAD_URL';
UPDATE "SystemConfig" SET value = 'true' WHERE key = 'FORCE_UPDATE';
```

### 4. Update App Version Number

**Before building the next version**, update the version in both places:

**In app code:**
```typescript
// customer-app/src/hooks/useVersionChecker.ts
const APP_VERSION_NUMBER = '1.1.0'; // Update this!

// company-app/src/hooks/useVersionChecker.ts
const APP_VERSION_NUMBER = '1.1.0'; // Update this!
```

**In app.json:**
```json
{
  "expo": {
    "version": "1.1.0",
    "android": {
      "versionCode": 2
    }
  }
}
```

## Version Comparison Logic

Uses semantic versioning (x.y.z):
- Major.Minor.Patch format
- Compares each segment numerically
- Example: 1.2.0 > 1.1.9

```typescript
compareVersions('1.0.0', '1.1.0') // Returns -1 (current < latest)
compareVersions('1.1.0', '1.1.0') // Returns 0 (equal)
compareVersions('1.2.0', '1.1.0') // Returns 1 (current > latest)
```

## Update Dialog Behavior

### Optional Update (forceUpdate = false)
```
🎉 Update Available
A new version is available

Version 1.1.0 is now available.

- Added dark mode
- Fixed payment issues

[Later]  [Update]
```

### Force Update (forceUpdate = true)
```
🚨 Update Required
A new version is available

Version 1.1.0 is now available.

- Critical security fixes
- Database improvements

[Update Now]
```

## Testing

1. **Test optional update:**
   - Set backend version to 1.1.0
   - Keep app version at 1.0.0
   - Set `FORCE_UPDATE` to "false"
   - Launch app → Dialog appears with "Later" and "Update" buttons

2. **Test force update:**
   - Set `FORCE_UPDATE` to "true"
   - Launch app → Dialog appears with only "Update Now" button
   - Dialog cannot be dismissed

3. **Test no update:**
   - Set backend and app versions to same value
   - Launch app → No dialog appears

## Deployment Workflow

```
1. Develop features
2. Update APP_VERSION_NUMBER in code (e.g., 1.1.0)
3. Update app.json version and versionCode
4. Build APK: eas build -p android --profile production
5. Upload APK to hosting
6. Update backend SystemConfig:
   - Set new version (1.1.0)
   - Set download URL
   - Set forceUpdate if needed
   - Add release notes
7. Deploy backend to Railway
8. Users open app → See update dialog
```

## Best Practices

1. **Semantic Versioning:**
   - Major: Breaking changes (2.0.0)
   - Minor: New features (1.1.0)
   - Patch: Bug fixes (1.0.1)

2. **Force Update When:**
   - Critical security vulnerabilities
   - Breaking API changes
   - Database schema changes
   - Major bug fixes

3. **Release Notes:**
   - Keep concise (3-5 bullet points)
   - Focus on user-facing changes
   - Avoid technical jargon

4. **Download URLs:**
   - Use HTTPS
   - Ensure public access
   - Test download before deploying
   - Consider CDN for better performance

5. **Version Management:**
   - Always increment version before building
   - Keep build logs with version numbers
   - Tag git commits with version numbers
   - Document changes in changelog

## Troubleshooting

### Dialog not appearing
- Check backend is returning correct version
- Verify app version number in code
- Check GraphQL query is working
- Check Apollo Client network logs

### Download link not working
- Verify URL is publicly accessible
- Test URL in browser
- Check HTTPS certificate
- Ensure file permissions are correct

### Force update not working
- Check `FORCE_UPDATE` value is "true" (string)
- Verify dialog cancelable prop is false
- Check Alert.alert options

## Future Enhancements

- [ ] In-app update using Android APK installation API
- [ ] Automatic download and install
- [ ] Update history/changelog screen
- [ ] Rollback mechanism
- [ ] A/B testing for updates
- [ ] Analytics for update adoption
- [ ] Scheduled update windows
- [ ] Delta updates (only changed files)

## Related Files

**Backend:**
- `backend/src/graphql/typeDefs.ts` - AppVersion schema
- `backend/src/graphql/resolvers.ts` - appVersion resolver
- `backend/prisma/seed.ts` - Initial SystemConfig entries
- `backend/prisma/schema.prisma` - SystemConfig model

**Customer App:**
- `customer-app/src/hooks/useVersionChecker.ts` - Version check logic
- `customer-app/src/apollo/versionQueries.ts` - GraphQL query
- `customer-app/App.tsx` - Integration point

**Company App:**
- `company-app/src/hooks/useVersionChecker.ts` - Version check logic
- `company-app/src/apollo/versionQueries.ts` - GraphQL query
- `company-app/App.tsx` - Integration point
