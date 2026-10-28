const mongoose = require('mongoose');

// Lab Report Schema — structured clinical test panels (1mg/PharmEasy style) issued by doctor
const labReportSchema = new mongoose.Schema({
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    doctorName: { type: String, required: true },
    department: { type: String, required: true },
    panelName: { type: String, required: true },             // e.g. "Full Body Checkup", "Lipid + Thyroid"
    selectedCategories: [{ type: String, default: [] }],     // quick-reference panel keys
    // Structured test rows rendered as table on branded PDF
    tests: [{
        name: { type: String, required: true },
        result: { type: String, default: '' },
        unit: { type: String, default: '' },
        referenceRange: { type: String, default: 'Normal Range' },
        flag: { type: String, enum: ['normal', 'high', 'low', 'abnormal'], default: 'normal' }
    }],
    summaryImpression: { type: String, default: '' }         // doctor's interpretation
}, { timestamps: true });

module.exports = mongoose.model('LabReport', labReportSchema);
