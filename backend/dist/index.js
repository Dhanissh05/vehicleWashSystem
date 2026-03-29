"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const typeDefs_1 = require("./graphql/typeDefs");
const resolvers_1 = require("./graphql/resolvers");
const otp_1 = require("./routes/otp");
const webhooks_1 = require("./routes/webhooks");
const sms_1 = require("./routes/sms");
const upload_1 = require("./routes/upload");
const slotBooking_service_1 = require("./services/slotBooking.service");
const subscription_service_1 = require("./services/subscription.service");
const prisma_1 = __importDefault(require("./lib/prisma"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// Serve static uploaded files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Serve admin panel static files
const adminPanelPath = path_1.default.join(__dirname, '../admin-panel-dist');
app.use('/admin', express_1.default.static(adminPanelPath));
// SPA fallback — all routes under /admin return index.html
app.get('/admin/*', (_req, res) => {
    const indexPath = path_1.default.join(adminPanelPath, 'index.html');
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Admin panel not found');
    }
});
// REST Routes
app.use('/api', otp_1.otpRouter);
app.use('/api', sms_1.smsRouter);
app.use('/api/upload', upload_1.uploadRouter);
app.use('/upload', upload_1.uploadRouter); // Direct upload route
app.use('/webhook', webhooks_1.webhookRouter);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// JWT verification
const getUser = (token) => {
    try {
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            return decoded;
        }
        return null;
    }
    catch (error) {
        return null;
    }
};
// Initialize Apollo Server
const startServer = async () => {
    const apolloServer = new server_1.ApolloServer({
        typeDefs: typeDefs_1.typeDefs,
        resolvers: resolvers_1.resolvers,
    });
    await apolloServer.start();
    app.use('/graphql', (0, cors_1.default)(), express_1.default.json({ limit: '10mb' }), (0, express4_1.expressMiddleware)(apolloServer, {
        context: async ({ req }) => {
            const token = req.headers.authorization?.replace('Bearer ', '') || '';
            const user = getUser(token);
            return {
                user,
                prisma: prisma_1.default,
            };
        },
    }));
    const PORT = parseInt(process.env.PORT || '4000', 10);
    const HOST = '0.0.0.0'; // Bind to all interfaces for Railway
    const httpServer = app.listen(PORT, HOST, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
        console.log(`📝 REST API ready at http://localhost:${PORT}/api`);
        console.log(`🔑 Environment Variables:`);
        console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
        console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
        console.log(`   - FAST2SMS_API_KEY: ${process.env.FAST2SMS_API_KEY ? 'SET' : 'NOT SET'}`);
        console.log(`   - FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET'}`);
        // Initialize slot booking auto-cancel cron job
        (0, slotBooking_service_1.initSlotBookingCron)();
        (0, subscription_service_1.initSubscriptionCron)(prisma_1.default);
    });
    // Set server timeout to 60 seconds
    httpServer.timeout = 60000;
    httpServer.keepAliveTimeout = 65000;
    httpServer.headersTimeout = 66000;
};
// Start server
startServer().catch((error) => {
    console.error('Error starting server:', error);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma_1.default.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await prisma_1.default.$disconnect();
    process.exit(0);
});
//# sourceMappingURL=index.js.map