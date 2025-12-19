import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    mobile: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT token and attach user to request
 * Used for REST API endpoints that require authentication
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Auth middleware - checking authentication');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth failed: No bearer token in header');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Token present, length:', token.length);

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Authentication configuration error' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: string;
      mobile: string;
      role: string;
    };
    
    console.log('Token decoded for user:', decoded.id);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, mobile: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      mobile: user.mobile,
      role: user.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Middleware to check if user has admin or worker role
 */
export const requireStaff = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'WORKER') {
    return res.status(403).json({ error: 'Staff access required' });
  }

  next();
};

/**
 * Generate JWT token with refresh token support
 */
export const generateTokens = (user: { id: string; mobile: string; role: string }) => {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

  const accessToken = jwt.sign(
    { id: user.id, mobile: user.mobile, role: user.role },
    jwtSecret,
    { expiresIn: '7d' } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    jwtRefreshSecret,
    { expiresIn: '30d' } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!
    ) as { id: string; type: string };
  } catch (error) {
    return null;
  }
};
