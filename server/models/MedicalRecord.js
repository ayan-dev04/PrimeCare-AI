const mongoose = require('mongoose');

// Secure Medical Record & Lab Report Schema (PharmEasy & 1mg standard document model)
const medicalRecordSchema = new mongoose.Schema({
    patientId: { type: String, required: true }, // Clerk user ID or email
    patientName: { type: String, required: true },
    title: { type: String, required: true }, // e.g. "Complete Blood Count (CBC)", "Chest X-Ray"
    category: { 
        type: String, 
        enum: ['Lab Report', 'Prescription', 'Discharge Summary', 'Imaging/Scan', 'Diagnostic Report', 'Other'], 
        default: 'Lab Report' 
    },
    recordDate: { type: String, required: true },
    doctorName: { type: String, default: 'Consulting Specialist' },
    department: { type: String, default: 'General Medicine' },
    fileName: { type: String, default: '' },
    fileUrl: { type: String, required: true }, // Static accessible path e.g. "/uploads/..."
    fileType: { type: String, default: 'application/pdf' },
    fileSize: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    uploadedBy: { type: String, enum: ['patient', 'doctor', 'lab'], default: 'patient' }
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
