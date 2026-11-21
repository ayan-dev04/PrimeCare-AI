const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiController');

// POST /api/ai/chat – accepts { query: string }
router.post('/chat', chat);

module.exports = router;