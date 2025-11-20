import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = req.body.type || 'general';
    const fullPath = path.join(uploadsDir, subDir);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueId}${ext}`);
  },
});

// File filter for images
const imageFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
};

// Configure upload middleware
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

/**
 * Upload logo image (Admin only)
 * POST /api/upload/logo
 * Body: multipart/form-data with 'file' field
 * Returns: { url: string }
 * 
 * TODO: For production, integrate with cloud storage:
 * - AWS S3: Use aws-sdk to upload to S3 bucket
 * - Cloudinary: Use cloudinary SDK for optimized image delivery
 * - DigitalOcean Spaces: Similar to S3 with simpler pricing
 */
router.post(
  '/logo',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Construct URL for the uploaded file
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
      const fileUrl = `${baseUrl}/uploads/logo/${req.file.filename}`;

      res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload logo' });
    }
  }
);

/**
 * Upload payment screenshot
 * POST /api/upload/payment
 * Body: multipart/form-data with 'file' field
 * Returns: { url: string }
 */
router.post(
  '/payment',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
      const fileUrl = `${baseUrl}/uploads/payment/${req.file.filename}`;

      res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size,
      });
    } catch (error: any) {
      console.error('Payment screenshot upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload screenshot' });
    }
  }
);

/**
 * Delete uploaded file (Admin only)
 * DELETE /api/upload/:type/:filename
 */
router.delete(
  '/:type/:filename',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { type, filename } = req.params;
      const filePath = path.join(uploadsDir, type, filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Security check: ensure file is within uploads directory
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadsDir = path.resolve(uploadsDir);
      
      if (!resolvedPath.startsWith(resolvedUploadsDir)) {
        return res.status(400).json({ error: 'Invalid file path' });
      }

      fs.unlinkSync(filePath);

      res.json({ success: true, message: 'File deleted successfully' });
    } catch (error: any) {
      console.error('File deletion error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete file' });
    }
  }
);

export { router as uploadRouter };
