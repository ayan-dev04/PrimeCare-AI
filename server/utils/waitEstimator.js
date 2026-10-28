const Appointment = require('../models/Appointment');

/* ── Wait-Time Prediction Regression Engine ──
   W = (N - 1) * T_avg + remainingActiveConsultation
   T_avg = weighted moving average of the doctor's last completed service clocks.
   The active-consultation remainder keeps the estimate honest even for the
   first queued patient (N = 1), instead of returning a zero wait while a
   consultation is still running. */

const SAMPLE_WINDOW = 5;        // most recent completed visits averaged (moving window)
const BASELINE_MINUTES = 12;    // fallback until a doctor builds completion history
const MIN_SAMPLE_MINUTES = 2;   // discard sub-minute instant completions (DB noise)
const PRESENCE_FACTOR = { available: 1.0, busy: 1.35, 'on-break': 1.6, absent: 2.0 };
const MAX_WAIT_MINUTES = 240;   // sane display ceiling

// T_avg: linearly-weighted moving average of the last SAMPLE_WINDOW completed
// visits — newer visits contribute more weight since they reflect current pace.
async function getMovingAverage(doctorId) {
    const recent = await Appointment.find({ doctor: doctorId, status: 'completed' })
        .sort({ updatedAt: -1 })
        .limit(SAMPLE_WINDOW)
        .select('createdAt updatedAt')
        .lean();

    const durations = (recent || [])
        .map(s => (s.updatedAt - s.createdAt) / 60000)
        .filter(min => min >= MIN_SAMPLE_MINUTES);

    const n = durations.length;
    // WMA = Σ(d_i * w_i) / Σ(w_i) with linear weights (n, n-1, ..., 1)
    return n
        ? durations.reduce((sum, d, i) => sum + d * (n - i), 0) / ((n * (n + 1)) / 2)
        : BASELINE_MINUTES;
}

/* Core regression prediction for a patient at queue position N.
   `updatedAt` on the in-progress document marks the moment its status flipped,
   so (now - updatedAt) is the elapsed service time of the live consultation. */
async function predictWaitTime(doctorId, queuePosition, presenceStatus = 'available') {
    try {
        const [tAvg, active] = await Promise.all([
            getMovingAverage(doctorId),
            Appointment.findOne({ doctor: doctorId, status: 'in-progress' }).select('updatedAt').lean()
        ]);

        // Remaining fraction of the running consultation = T_avg - time already served
        let remainingActive = 0;
        if (active) {
            const elapsed = (Date.now() - active.updatedAt.getTime()) / 60000;
            remainingActive = Math.max(0, tAvg - elapsed);
        }

        const queueIndex = Math.max(0, (queuePosition || 1) - 1); // N-1 full service slots ahead
        const factor = PRESENCE_FACTOR[presenceStatus] ?? 1;      // doctor away-state delay
        const predicted = (queueIndex * tAvg + remainingActive) * factor;

        return Math.min(MAX_WAIT_MINUTES, Math.max(5, Math.round(predicted)));
    } catch {
        // Estimation must never break booking/queue flow — degrade to baseline math
        return Math.max(5, Math.max(0, (queuePosition || 1) - 1) * BASELINE_MINUTES);
    }
}

// Backward-compatible facade used by the booking lifecycle — same regression
// prediction, surfaced under the legacy signature so callers stay untouched.
async function estimateWaitMinutes(doctorId, queuePosition, presenceStatus = 'available') {
    return predictWaitTime(doctorId, queuePosition, presenceStatus);
}

module.exports = { predictWaitTime, estimateWaitMinutes };
