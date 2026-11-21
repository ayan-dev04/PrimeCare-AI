const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, verifyOTP, login, getMe, syncRole, syncClerkUser } = require('../controllers/authController');

// Rate limiter for authentication endpoints: 30 requests per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many authentication attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/me', getMe);
router.post('/register', authLimiter, register);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/login', authLimiter, login);
router.post('/sync-role', syncRole);
router.post('/sync-user', syncClerkUser);

module.exports = router;

