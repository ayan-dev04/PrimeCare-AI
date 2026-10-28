require('dotenv').config();
// Ensure @google/genai uses the project GEMINI_API_KEY and avoids stale system environment keys
if (process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const { clerkMiddleware } = require('@clerk/express');
const initReminderScheduler = require('./utils/reminderScheduler');

const app = express();
const server = http.createServer(app);


// ── Middleware Configuration ──
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // x-user-email MUST be whitelisted — it is the Clerk identity header for all admin RBAC calls
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-email']
}));
app.use(express.json());
app.use(clerkMiddleware());

// ── Static uploads folder for medical records & lab reports ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health Check Route ──
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'PrimeCare Hospital Backend' });
});

// ── API Routes Mounting ──
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));


// ── Server & Database Initialization ──
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas successfully.');

        // Start automated 30-minute video consultation reminder cron
        initReminderScheduler();

        server.listen(PORT)
            .on('listening', () => console.log(`PrimeCare Backend running on port ${PORT}`))
            .on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`\n[STARTUP BLOCKED] Port ${PORT} is occupied by a stale node process (old code).\nFix: kill all node processes first.\n  Git Bash:  taskkill //F //IM node.exe\n  PowerShell: Stop-Process -Name node -Force\n  Windows cmd: taskkill /F /IM node.exe\nThen restart the server.\n`);
                    process.exit(1);
                }
                throw err;
            });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
    });