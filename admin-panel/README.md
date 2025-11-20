# Vehicle Wash Admin Panel

Modern web-based admin dashboard for managing the entire vehicle wash system.

## Features

- 📊 **Interactive Dashboard**: Real-time metrics and charts
- 🚗 **Vehicle Management**: Track all vehicles through wash stages
- 👥 **User Management**: Manage customers, workers, and admins
- 💰 **Payment Management**: Verify manual payments, view transaction history
- 💵 **Pricing Configuration**: Set prices for different vehicle categories
- 📈 **Analytics**: Recharts-powered visualizations
- 🎨 **Modern UI**: Tailwind CSS with Framer Motion animations

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Deploy

### Vercel

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload 'dist' folder to Netlify
```

### Nginx (VPS)

```bash
npm run build
# Copy dist/ to /var/www/html/
```

## Configuration

Update the backend URL in `src/apollo/client.ts`:

```typescript
const httpLink = createHttpLink({
  uri: 'https://your-backend-url.com/graphql',
});
```

## Features Breakdown

### Dashboard
- Total washes today
- Revenue collected
- Active workers count
- Pending payments
- Vehicle type distribution (Pie chart)
- Wash status overview (Bar chart)
- Recent vehicles table

### Vehicle Management
- List all vehicles
- Filter by status
- Update wash status
- Assign to workers
- View payment details

### User Management
- View customers
- Manage workers
- Create new workers
- Deactivate users

### Payment Management
- View all payments
- Filter by status/method
- Verify manual payments
- Approve/reject transactions

### Pricing Configuration
- Set prices for cars (Sedan, SUV, Hatchback, Hybrid)
- Set prices for two-wheelers
- Activate/deactivate pricing

## Technologies

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Apollo Client
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## UI Components

All components follow a modern, clean design with:
- Gradient colors
- Rounded corners
- Smooth shadows
- Responsive layouts
- Hover animations
- Loading states
- Form validations

## Default Login

For testing:
- Mobile: 9999999999
- Password: admin123

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
