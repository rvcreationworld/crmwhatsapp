const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.mp4'];

// Create directories if they don't exist
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isVideo = file.mimetype.startsWith('video/');
        const baseDir = path.join(__dirname, '..', 'uploads', 'whatsapp', 'templates');
        const uploadDir = path.join(baseDir, isVideo ? 'videos' : 'images');
        
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Remove special chars and spaces from original name
        const ext = path.extname(file.originalname).toLowerCase();
        let baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        
        if (!baseName) baseName = "media";

        const uuid = crypto.randomUUID().split('-')[0]; // Use first block for brevity
        const timestamp = Date.now();
        
        // Output format: baseName_uuid_timestamp.ext
        const uniqueName = `${baseName}_${uuid}_${timestamp}${ext}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Check multiple extensions (Double Extension Attack prevention)
    const parts = file.originalname.split('.');
    if (parts.length > 2) {
        return cb(new Error("Double extensions are not allowed for security reasons"), false);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error(`Extension not allowed: ${ext}`), false);
    }

    if (IMAGE_TYPES.includes(file.mimetype) || VIDEO_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Mime type not supported: ${file.mimetype}`), false);
    }
};

const uploadLimits = {
    fileSize: 25 * 1024 * 1024 // 25 MB max overall limit
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: uploadLimits
});

const handleMediaUpload = (req, res, next) => {
    const uploader = upload.single('mediaFile');

    uploader(req, res, function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded or file is empty' });
        }

        // Apply strict size rules per type
        const isVideo = req.file.mimetype.startsWith('video/');
        const maxLimit = isVideo ? (25 * 1024 * 1024) : (10 * 1024 * 1024);

        if (req.file.size > maxLimit) {
            // Rollback (delete file)
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                success: false, 
                message: `File exceeds maximum allowed size for its type (${isVideo ? '25MB' : '10MB'})` 
            });
        }

        next();
    });
};

module.exports = { handleMediaUpload };
