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
import { initSlotBookingCron } from './services/slotBooking.service';

dotenv.config();

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// REST Routes
app.use('/api', otpRouter);
app.use('/api', smsRouter);
app.use('/api/upload', uploadRouter);
app.use('/upload', uploadRouter); // Direct upload route
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
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
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

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`📝 REST API ready at http://localhost:${PORT}/api`);
    
    // Initialize slot booking auto-cancel cron job
    initSlotBookingCron();
  });
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
