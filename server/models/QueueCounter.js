const mongoose = require('mongoose');

// Daily atomic counter schema to prevent race conditions during concurrent bookings
const queueCounterSchema = new mongoose.Schema({
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    currentQueue: { type: Number, default: 0 }
}, { timestamps: true });

// Compound unique index ensuring one sequence counter per doctor per date
queueCounterSchema.index({ doctor: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('QueueCounter', queueCounterSchema);
