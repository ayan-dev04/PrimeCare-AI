const express = require('express');
const router = express.Router();
const { register, verifyOTP, login, syncRole, syncClerkUser } = require('../controllers/authController');

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/sync-role', syncRole);
router.post('/sync-user', syncClerkUser);

module.exports = router;

