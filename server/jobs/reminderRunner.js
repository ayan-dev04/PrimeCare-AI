require('dotenv').config();
const mongoose = require('mongoose');
const { checkAndSendReminders } = require('./utils/reminderScheduler');

async function runStandaloneReminderJob() {
    console.log('[Render Cron Job] Starting PrimeCare automated video consultation reminder runner...');
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.error('[Render Cron Job Error] MONGO_URI is missing in environment variables.');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('[Render Cron Job] Connected to MongoDB.');

        const result = await checkAndSendReminders();
        console.log(`[Render Cron Job] Completed. Reminders dispatched/processed: ${result.processed || 0}`);
        
        await mongoose.disconnect();
        console.log('[Render Cron Job] Database disconnected. Exiting cleanly.');
        process.exit(0);
    } catch (err) {
        console.error('[Render Cron Job Fatal Error]:', err.message);
        process.exit(1);
    }
}

runStandaloneReminderJob();
