const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const sendEmail = require('../utils/sendEmail');
const { parseCalendarDate, parseTimeToMinutes } = require('./slotGenerator');

/**
 * Real-Time Video Consultation Reminder Cron Service
 * Runs every minute; fires exactly one reminder ~30 mins before each video consultation
 * to BOTH patient and doctor (marked reminderSent to guarantee no duplicates).
 */

// Legacy fallback for appointments saved before slotStartAt existed. Anchoring
// with Date.UTC keeps 12:00 AM on the selected date instead of the previous day.
function parseSlotTime(dateStr, slotStr) {
    const parts = parseCalendarDate(dateStr);
    const minutes = parseTimeToMinutes(String(slotStr || '').split('-')[0].trim());
    if (!parts || minutes === null) return null;
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, minutes));
}

function buildReminderEmail({ appt, docName, roomId, roomUrl }) {
    return sendEmail.createHospitalEmailCard({
        title: 'Virtual Consultation in 30 Mins',
        subtitle: `Patient: ${appt.patientName} • Specialist: ${docName}`,
        badgeText: 'Live Telehealth Reminder',
        contentHtml: `
            <p style="margin-top: 0;">This is an automated priority reminder that your <strong>Virtual Video Consultation</strong> starts in approximately <strong>30 minutes</strong>.</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 18px; border-radius: 12px; margin: 20px 0;">
                <p style="margin: 0 0 6px;"><strong>Consulting Specialist:</strong> ${docName} (${appt.department})</p>
                <p style="margin: 0 0 6px;"><strong>Scheduled Time:</strong> ${appt.date} at ${appt.timeSlot}</p>
                <p style="margin: 0 0 6px;"><strong>OPD Token:</strong> <span style="font-family: monospace; font-weight: bold; color: #4338ca;">${appt.tokenNumber}</span></p>
                <p style="margin: 0;"><strong>Encrypted Room ID:</strong> <span style="font-family: monospace; color: #059669;">${roomId}</span></p>
            </div>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${roomUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 30px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                    Join Virtual Video Call Room
                </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Please ensure your camera and microphone are tested before entering.</p>
        `,
        footerNote: 'PrimeCare Telehealth Unit • Instant Assistance: +91 (0731) 456-7890'
    });
}

function initReminderScheduler() {
    console.log('[Scheduler] PrimeCare Real-Time Video Reminder Cron Initialized (every minute).');

    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            // Query the actual reminder window instead of "today", so a 12:00 AM
            // appointment still fires at 11:30 PM on the previous calendar day.
            const windowStart = new Date(now.getTime() + 25 * 60000);
            const windowEnd = new Date(now.getTime() + 35 * 60000);
            const utcStr = now.toISOString().split('T')[0];
            const localStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const upcoming = await Appointment.find({
                consultationType: 'video',
                status: 'scheduled',
                reminderSent: { $ne: true },
                $or: [
                    { slotStartAt: { $gte: windowStart, $lte: windowEnd } },
                    // Legacy fallback for records saved before slotStartAt existed.
                    { slotStartAt: { $exists: false }, date: { $in: [utcStr, localStr] } }
                ]
            }).populate('doctor');

            for (const appt of upcoming) {
                const apptTime = appt.slotStartAt || parseSlotTime(appt.date, appt.timeSlot);
                if (!apptTime) continue;

                const diffMinutes = (apptTime.getTime() - now.getTime()) / 60000;

                // Target: ~30 minutes before start (bounded window; reminderSent prevents repeats)
                if (diffMinutes < 25 || diffMinutes > 35) continue;

                const docName = appt.doctor?.name || 'Dr. Specialist';
                const roomId = appt.videoRoomId || `primecare-room-${appt.tokenNumber.toLowerCase()}`;
                const roomUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/video-consultation?room=${roomId}&token=${appt.tokenNumber}`;
                const emailHtml = buildReminderEmail({ appt, docName, roomId, roomUrl });

                console.log(`[Scheduler] 30-min window reached for Token ${appt.tokenNumber}. Dispatching reminder emails...`);

                // Dispatch BOTH reminders in parallel; one SMTP failure never blocks the other
                const [patientRes, docRes] = await Promise.allSettled([
                    sendEmail({
                        to: appt.patientEmail,
                        subject: `[Reminder: 30 Mins] Video Consultation with ${docName} | Token: ${appt.tokenNumber}`,
                        html: emailHtml
                    }),
                    appt.doctor?.email
                        ? sendEmail({
                            to: appt.doctor.email,
                            subject: `[Upcoming Video Visit: 30 Mins] Patient: ${appt.patientName} | Token: ${appt.tokenNumber}`,
                            html: emailHtml
                        })
                        : Promise.resolve({ success: false, error: 'No doctor email on file' })
                ]);
                if (patientRes.status === 'rejected' || docRes.status === 'rejected') {
                    console.warn(`[Scheduler] Reminder dispatch issue for Token ${appt.tokenNumber}:`, patientRes.reason || docRes.reason);
                }

                appt.reminderSent = true;
                await appt.save();
            }
        } catch (err) {
            console.error('[Scheduler Error]:', err.message);
        }
    });
}

module.exports = initReminderScheduler;
