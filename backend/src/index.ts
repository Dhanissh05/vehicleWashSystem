import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { otpRouter } from './routes/otp';
import { webhookRouter } from './routes/webhooks';
import { smsRouter } from './routes/sms';
import { uploadRouter } from './routes/upload';
import estimationRouter from './routes/estimation.routes';
import { initSlotBookingCron } from './services/slotBooking.service';
import prisma from './lib/prisma';

dotenv.config();

const app = express();

// Middleware
app.use(cors() as any);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve test connectivity page
app.use(express.static(path.join(__dirname, '..')));

// REST Routes
app.use('/api', otpRouter);
app.use('/api', smsRouter);
app.use('/api/upload', uploadRouter);
app.use('/upload', uploadRouter); // Direct upload route
app.use('/api/estimations', estimationRouter);
app.use('/webhook', webhookRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GraphQL Context
interface Context {
  user?: {
    id: string;
    mobile: string;
    role: string;
    name?: string;
    centerId?: string; // Required for estimation creation and filtering
  };
  prisma: PrismaClient;
}

// JWT verification
const getUser = (token: string) => {
  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Initialize Apollo Server
const startServer = async () => {
  const apolloServer = new ApolloServer<Context>({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();

  app.use(
    '/graphql',
    cors() as any,
    express.json({ limit: '10mb' }),
    expressMiddleware(apolloServer, {
      context: async ({ req }): Promise<Context> => {
        const token = req.headers.authorization?.replace('Bearer ', '') || '';
        const user = getUser(token);

        return {
          user,
          prisma,
        };
      },
    })
  );

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
    initSlotBookingCron();
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
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
