const mongoose = require('mongoose');

// Smart Hospital Appointment Schema with Live Queue Lifecycle, Video Call support, and Reminder tracking
const appointmentSchema = new mongoose.Schema({
    patient: { type: String, default: 'clerk_patient' }, // Clerk user ID or email
    patientName: { type: String, default: 'Patient' },
    patientEmail: { type: String, required: true },
    patientPhone: { type: String, default: '' },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    department: { type: String },
    date: { type: String, required: true }, // Format: YYYY-MM-DD (authoritative selected calendar day)
    timeSlot: { type: String, required: true }, // e.g. "10:00 AM" or "10:00 AM - 10:30 AM"
    slotStartAt: { type: Date }, // UTC instant for the slot; 12:00 AM remains on `date`
    slotEndAt: { type: Date },
    activeSlotKey: { type: String }, // "date|timeSlot" while booking is live; unset frees the slot (atomic race guard)
    queueNumber: { type: Number, required: true },
    tokenNumber: { type: String, required: true },
    reason: { type: String, default: 'General Consultation' },
    consultationType: { type: String, enum: ['in-person', 'video'], default: 'in-person' },
    videoRoomId: { type: String, default: '' },
    urgencyScore: { type: Number, default: 1 },
    urgencyLevel: { type: String, enum: ['Routine', 'Moderate Priority', 'High Priority Urgent'], default: 'Routine' },
    estimatedWaitMinutes: { type: Number, default: 15 },
    optimizedSlot: { type: String },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show', 'missed'],
        default: 'scheduled'
    },
    doctorNotes: { type: String, default: '' },
    // Real-time automated reminder tracking (prevents duplicate reminder emails)
    reminderSent: { type: Boolean, default: false }
}, { timestamps: true });

// Double-booking shield: two LIVE bookings for the same doctor/date/slot cannot coexist.
// The database enforces uniqueness at write time, so simultaneous requests can never both win.
// Sparse = completed/cancelled documents (no key) are excluded, releasing the slot cleanly.
appointmentSchema.index({ doctor: 1, date: 1, activeSlotKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
