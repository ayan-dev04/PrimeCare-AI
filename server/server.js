require('dotenv').config();
// Cleanly normalize Google GenAI key to prevent dual-key conflict warnings
if (process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
} else if (process.env.GOOGLE_API_KEY) {
    process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
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

// ── Real-time Socket.IO Setup ──
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    socket.on('join_doctor', (doctorId) => {
        if (doctorId) socket.join(`doctor_${doctorId}`);
    });
    socket.on('join_patient', (patientEmail) => {
        if (patientEmail) socket.join(`patient_${patientEmail.toLowerCase()}`);
    });
});

app.set('io', io);
app.set('notifyQueueUpdate', (data = {}) => {
    try {
        io.emit('queue_updated', data);
        if (data.doctorId) io.to(`doctor_${data.doctorId}`).emit('doctor_queue_updated', data);
        if (data.patientEmail) io.to(`patient_${data.patientEmail.toLowerCase()}`).emit('patient_queue_updated', data);
    } catch (e) {
        console.warn('[Socket.IO Emit Warning]', e.message);
    }
});


// ── CORS & Security Configuration ──
// Support comma-separated origins from CLIENT_URL in addition to local development ports
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim().replace(/\/+$/, '')) : [])
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching allowed list
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
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
    res.status(200).json({
        status: 'ok',
        service: 'PrimeCare Hospital Backend',
        environment: process.env.NODE_ENV || 'development',
        dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ── API Routes Mounting ──
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ── Centralized Production Error Handling Middleware ──
app.use((err, req, res, next) => {
    console.error('[Unhandled Error]:', err.stack || err.message);
    const isProd = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        success: false,
        error: isProd ? 'An unexpected server error occurred.' : (err.message || 'Internal Server Error')
    });
});



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