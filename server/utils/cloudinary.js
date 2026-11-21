const cloudinary = require('cloudinary').v2;

const isConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

/**
 * Uploads a file buffer or local file path to Cloudinary.
 * If Cloudinary credentials are not configured, returns null to allow fallback.
 */
const uploadToCloudinary = async (file, options = {}) => {
    if (!isConfigured) return null;

    return new Promise((resolve, reject) => {
        const uploadOptions = {
            folder: options.folder || 'primecare/records',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
            ...options
        };

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary Upload Error]', error);
                    return reject(error);
                }
                resolve(result);
            }
        );

        if (file.buffer) {
            uploadStream.end(file.buffer);
        } else if (file.path) {
            const fs = require('fs');
            fs.createReadStream(file.path).pipe(uploadStream);
        } else {
            resolve(null);
        }
    });
};

module.exports = {
    cloudinary,
    isConfigured,
    uploadToCloudinary
};
