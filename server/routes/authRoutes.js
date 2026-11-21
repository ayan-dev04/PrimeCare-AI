const express = require('express');
const router = express.Router();
const { register, verifyOTP, login, getMe, syncRole, syncClerkUser } = require('../controllers/authController');

router.get('/me', getMe);
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/sync-role', syncRole);
router.post('/sync-user', syncClerkUser);

module.exports = router;

