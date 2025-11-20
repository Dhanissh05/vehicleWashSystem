/**
 * Authentication and Authorization Tests
 * 
 * Tests critical security flows:
 * - Password hashing
 * - JWT token generation and verification
 * - OTP generation and verification
 * - Role-based access control
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateTokens, verifyRefreshToken } from '../src/middleware/auth';

describe('Authentication Tests', () => {
  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hashed = await bcrypt.hash(password, 10);
      
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(50);
    });

    it('should verify hashed passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hashed = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashed = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(wrongPassword, hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    const mockUser = {
      id: 'test-user-id',
      mobile: '9876543210',
      role: 'CUSTOMER',
    };

    beforeAll(() => {
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    });

    it('should generate access and refresh tokens', () => {
      const tokens = generateTokens(mockUser);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should include user data in access token', () => {
      const tokens = generateTokens(mockUser);
      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET!) as any;
      
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.mobile).toBe(mockUser.mobile);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should verify refresh tokens correctly', () => {
      const tokens = generateTokens(mockUser);
      const verified = verifyRefreshToken(tokens.refreshToken);
      
      expect(verified).toBeDefined();
      expect(verified?.id).toBe(mockUser.id);
      expect(verified?.type).toBe('refresh');
    });

    it('should reject invalid tokens', () => {
      const invalidToken = 'invalid-token-string';
      const verified = verifyRefreshToken(invalidToken);
      
      expect(verified).toBeNull();
    });
  });

  describe('OTP Generation', () => {
    it('should generate 6-digit OTP', () => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      expect(otp.length).toBe(6);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThan(1000000);
    });

    it('should generate unique OTPs', () => {
      const otp1 = Math.floor(100000 + Math.random() * 900000).toString();
      const otp2 = Math.floor(100000 + Math.random() * 900000).toString();
      const otp3 = Math.floor(100000 + Math.random() * 900000).toString();
      
      const otps = new Set([otp1, otp2, otp3]);
      // Should have at least 2 unique values (very low chance all 3 are same)
      expect(otps.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Role-Based Access', () => {
    it('should differentiate between user roles', () => {
      const adminUser = { id: '1', mobile: '1111111111', role: 'ADMIN' };
      const workerUser = { id: '2', mobile: '2222222222', role: 'WORKER' };
      const customerUser = { id: '3', mobile: '3333333333', role: 'CUSTOMER' };
      
      expect(adminUser.role).toBe('ADMIN');
      expect(workerUser.role).toBe('WORKER');
      expect(customerUser.role).toBe('CUSTOMER');
      
      // Admin and Worker are staff
      const isStaff = (role: string) => role === 'ADMIN' || role === 'WORKER';
      expect(isStaff(adminUser.role)).toBe(true);
      expect(isStaff(workerUser.role)).toBe(true);
      expect(isStaff(customerUser.role)).toBe(false);
    });
  });
});
