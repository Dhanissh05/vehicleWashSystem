import { Request, Response, NextFunction } from 'express';
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
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Middleware to check if user has admin role
 */
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware to check if user has admin or worker role
 */
export declare const requireStaff: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Generate JWT token with refresh token support
 */
export declare const generateTokens: (user: {
    id: string;
    mobile: string;
    role: string;
}) => {
    accessToken: string;
    refreshToken: string;
};
/**
 * Verify refresh token
 */
export declare const verifyRefreshToken: (token: string) => {
    id: string;
    type: string;
} | null;
//# sourceMappingURL=auth.d.ts.map