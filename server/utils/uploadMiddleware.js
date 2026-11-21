const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure local storage directory exists for fallback / local development
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage keeps buffer in memory for instant Cloudinary streaming or local disk fallback
const storage = multer.memoryStorage();

// File filter: accept PDFs, Word documents, and medical scan images
const fileFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp'
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file format. Only PDF, DOC, DOCX, and images (JPEG/PNG) are accepted.'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
    fileFilter
});

module.exports = upload;

