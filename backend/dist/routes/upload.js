"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.uploadRouter = router;
// Ensure uploads directory exists
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const subDir = req.body.type || 'general';
        const fullPath = path_1.default.join(uploadsDir, subDir);
        if (!fs_1.default.existsSync(fullPath)) {
            fs_1.default.mkdirSync(fullPath, { recursive: true });
        }
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueId = crypto_1.default.randomBytes(16).toString('hex');
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${Date.now()}-${uniqueId}${ext}`);
    },
});
// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
};
// Configure upload middleware
const upload = (0, multer_1.default)({
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
router.post('/logo', auth_1.authenticate, auth_1.requireAdmin, upload.single('file'), async (req, res) => {
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
    }
    catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload logo' });
    }
});
/**
 * Upload profile photo (Any authenticated user)
 * POST /upload
 * Body: multipart/form-data with 'file' field
 * Returns: { url: string }
 */
router.post('/', auth_1.authenticate, upload.single('file'), async (req, res) => {
    try {
        console.log('=== Upload Request Received ===');
        console.log('User:', req.user);
        console.log('File present:', !!req.file);
        console.log('Content-Type:', req.headers['content-type']);
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('File details:', {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
        const fileUrl = `${baseUrl}/uploads/general/${req.file.filename}`;
        console.log('Upload successful:', fileUrl);
        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            size: req.file.size,
        });
    }
    catch (error) {
        console.error('Profile photo upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload photo' });
    }
});
/**
 * Upload payment screenshot
 * POST /api/upload/payment
 * Body: multipart/form-data with 'file' field
 * Returns: { url: string }
 */
router.post('/payment', auth_1.authenticate, upload.single('file'), async (req, res) => {
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
    }
    catch (error) {
        console.error('Payment screenshot upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload screenshot' });
    }
});
/**
 * Delete uploaded file (Admin only)
 * DELETE /api/upload/:type/:filename
 */
router.delete('/:type/:filename', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { type, filename } = req.params;
        const filePath = path_1.default.join(uploadsDir, type, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Security check: ensure file is within uploads directory
        const resolvedPath = path_1.default.resolve(filePath);
        const resolvedUploadsDir = path_1.default.resolve(uploadsDir);
        if (!resolvedPath.startsWith(resolvedUploadsDir)) {
            return res.status(400).json({ error: 'Invalid file path' });
        }
        fs_1.default.unlinkSync(filePath);
        res.json({ success: true, message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete file' });
    }
});
//# sourceMappingURL=upload.js.map