"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateTokens = exports.requireStaff = exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware to verify JWT token and attach user to request
 * Used for REST API endpoints that require authentication
 */
const authenticate = async (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    }
    catch (error) {
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
exports.authenticate = authenticate;
/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware to check if user has admin or worker role
 */
const requireStaff = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'WORKER') {
        return res.status(403).json({ error: 'Staff access required' });
    }
    next();
};
exports.requireStaff = requireStaff;
/**
 * Generate JWT token with refresh token support
 */
const generateTokens = (user) => {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, mobile: user.mobile, role: user.role }, jwtSecret, { expiresIn: '7d' });
    const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, type: 'refresh' }, jwtRefreshSecret, { expiresIn: '30d' });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=auth.js.map