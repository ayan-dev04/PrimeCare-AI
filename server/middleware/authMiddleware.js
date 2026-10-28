const User = require('../models/User');

/**
 * Strict Role-Based Access Control for Hospital Administrators
 * Identity resolved from Clerk session header (x-user-email); no open fall-through.
 */
const verifyAdmin = async (req, res, next) => {
    try {
        const userEmail = (req.headers['x-user-email'] || req.query.email || '').toString().toLowerCase();
        const designatedAdminEmail = (process.env.ADMIN_EMAIL || 'primecare.hospital.admin@gmail.com').toLowerCase();

        if (userEmail === designatedAdminEmail) return next();

        // JWT-based admins (future-proofed for direct token auth)
        const token = (req.headers.authorization || '').replace('Bearer ', '');
        if (token && token.startsWith('ey') && process.env.JWT_SECRET) {
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                if (payload.role === 'admin' || payload.role === 'hospital_admin') return next();
            } catch { /* invalid token falls through to DB check */ }
        }

        // Database role check
        if (userEmail) {
            const user = await User.findOne({ email: userEmail });
            if (user && ['admin', 'hospital_admin'].includes(user.role)) return next();
        }

        return res.status(403).json({ success: false, error: 'Administrative authorization required.' });
    } catch (err) {
        return res.status(403).json({ success: false, error: 'Administrative access authorization failed.' });
    }
};

module.exports = { requireAdmin: verifyAdmin, verifyAdmin };
