const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');

/**
 * Shared RBAC & Privacy Guards for clinical document access.
 * Identity is established from headers set by Clerk session (x-user-email)
 * falling back to query.email for lightweight student-project verification.
 */
const getCallerEmail = (req) =>
    (req.headers['x-user-email'] || req.query.email || req.body?.email || '').toString().toLowerCase();

// Only the specific patient who booked the appointment may view its documents
exports.protectRx = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const { id } = req.params;

        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ success: false, error: 'Consultation not found.' });

        const isBookedPatient = [appointment.patient, appointment.patientEmail]
            .filter(Boolean).some(v => v.toLowerCase() === caller);

        if (!isBookedPatient) {
            return res.status(403).json({ success: false, error: 'Access denied: only the booked patient may view this consultation record.' });
        }
        req.appointment = appointment; // pass downstream
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Doctor presence validation (used on report upload actions)
exports.requireDoctor = async (req, res, next) => {
    try {
        const doctor = await Doctor.findById(req.body.doctorId || req.params.doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found.' });
        req.doctor = doctor;
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Authenticates schedule writes for both doctors and administrators.
// The caller identity is supplied by the Clerk session header used throughout the app.
// next() is called exactly once, after an authorized doctor document has been resolved;
// every failure path ends with res.json and never touches next().
exports.verifyDoctor = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        if (!caller || !caller.includes('@')) {
            return res.status(401).json({ success: false, message: 'Doctor authentication required.' });
        }

        const adminEmail = (process.env.ADMIN_EMAIL || 'primecare.hospital.admin@gmail.com').toLowerCase();
        const isAdmin = caller === adminEmail || Boolean(await User.exists({
            email: caller,
            role: { $in: ['admin', 'hospital_admin'] }
        }));

        if (isAdmin) {
            const targetId = req.body?.doctorId || req.query?.doctorId || req.params?.doctorId;
            if (!mongoose.isValidObjectId(targetId)) {
                return res.status(400).json({ success: false, message: 'doctorId is required for administrator schedule updates.' });
            }

            const targetDoctor = await Doctor.findById(targetId);
            if (!targetDoctor) {
                return res.status(404).json({ success: false, message: 'Doctor not found.' });
            }

            req.user = targetDoctor;
            req.doctor = targetDoctor;
            return next();
        }

        const doctor = await Doctor.findOne({ email: caller });
        if (!doctor) {
            return res.status(401).json({ success: false, message: 'Doctor authentication required.' });
        }

        // A doctor may only write their own schedule, even if another id is supplied.
        const requestedId = req.body?.doctorId || req.query?.doctorId || req.params?.doctorId;
        if (requestedId && String(doctor._id) !== String(requestedId)) {
            return res.status(403).json({ success: false, message: 'You can only update your own schedule.' });
        }

        req.user = doctor;
        req.doctor = doctor;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Shared identity resolver — canonical caller email from Clerk session header
exports.getCallerEmail = (req) =>
    (req.headers['x-user-email'] || req.query.email || req.body?.email || '').toString().toLowerCase();
