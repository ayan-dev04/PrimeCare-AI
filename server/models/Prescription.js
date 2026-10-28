const mongoose = require('mongoose');

// Prescription Schema (Issued by Doctor, viewable by Patient)
const prescriptionSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patientId: { type: String, required: true }, // Clerk user ID or email
    patientName: { type: String, required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    doctorName: { type: String, required: true },
    department: { type: String, required: true },
    diagnosis: { type: String, required: true },
    vitals: {
        bloodPressure: { type: String, default: '120/80 mmHg' },
        pulseRate: { type: String, default: '72 bpm' },
        temperature: { type: String, default: '98.6 °F' },
        spO2: { type: String, default: '98%' }
    },
    medicines: [{
        name: { type: String, required: true },
        dosage: { type: String, required: true }, // e.g. "500mg"
        frequency: { type: String, required: true }, // e.g. "1-0-1 (After Food)"
        duration: { type: String, required: true } // e.g. "5 Days"
    }],
    clinicalAdvice: { type: String, default: 'Maintain adequate hydration and rest.' },
    followUpDate: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
