const mongoose = require('mongoose');

// Persistent Security Audit Log — survives server restarts (was in-memory before)
const auditLogSchema = new mongoose.Schema({
    event: { type: String, required: true, uppercase: true },   // e.g. DELETE_USER, APPOINTMENT_OVERRIDE, DATABASE_BACKUP
    user: { type: String, default: 'system' },                  // admin performing the action
    details: { type: String, default: '' },
    ip: { type: String, default: '127.0.0.1' }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
