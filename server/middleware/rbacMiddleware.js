const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const LabReport = require('../models/LabReport');
const MedicalRecord = require('../models/MedicalRecord');

// Caller identity comes from the Clerk session email header. Direct download links
// still pass ?email= so PDF links work in a new browser tab.
const getCallerEmail = (req) =>
    (req.headers['x-user-email'] || req.query.email || req.body?.email || '').toString().trim().toLowerCase();

const adminEmail = () => (process.env.ADMIN_EMAIL || 'primecare.hospital.admin@gmail.com').toLowerCase();

const isAdminCaller = async (email) => {
    if (!email) return false;
    if (email === adminEmail()) return true;
    return Boolean(await User.exists({ email, role: { $in: ['admin', 'hospital_admin'] } }));
};

const findCallerDoctor = (email) => Doctor.findOne({ email });

// Any signed-in account (patient, doctor or admin) may call these endpoints.
exports.requireAuth = (req, res, next) => {
    const caller = getCallerEmail(req);
    if (!caller || !caller.includes('@')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    req.callerEmail = caller;
    next();
};

// Only the specific patient (or an admin) may read that patient's lists.
exports.verifyPatientSelf = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const identifier = decodeURIComponent(req.params.identifier || req.params.patientId || '').trim();

        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });
        if (await isAdminCaller(caller)) return next();
        if (identifier.toLowerCase() === caller) return next();

        const user = await User.findOne({ email: caller });
        const allowedIds = new Set([caller]);
        if (user) allowedIds.add(String(user._id));

        // Appointments store both the Clerk user id and the patient's email.
        const ownAppointments = await Appointment.find({
            $or: [{ patient: caller }, { patientEmail: caller }]
        }).select('patient patientEmail');

        ownAppointments.forEach(appt => {
            if (appt.patient) allowedIds.add(String(appt.patient));
            if (appt.patientEmail) allowedIds.add(String(appt.patientEmail).toLowerCase());
        });

        if (allowedIds.has(identifier) || allowedIds.has(identifier.toLowerCase())) return next();

        return res.status(403).json({ success: false, message: 'You can only access your own records.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Only the doctor themself (or an admin) may read that doctor's dashboard data.
exports.verifyDoctorSelf = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const doctorId = req.params.doctorId;

        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });
        if (await isAdminCaller(caller)) {
            const target = await Doctor.findById(doctorId);
            if (!target) return res.status(404).json({ success: false, message: 'Doctor not found.' });
            req.doctor = target;
            return next();
        }

        const doctor = await findCallerDoctor(caller);
        if (!doctor) return res.status(401).json({ success: false, message: 'Doctor authentication required.' });
        if (String(doctor._id) !== String(doctorId)) {
            return res.status(403).json({ success: false, message: 'You can only access your own dashboard.' });
        }

        req.doctor = doctor;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Confirms the body doctorId belongs to the signed-in doctor.
exports.verifyDoctorBody = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const doctorId = req.body?.doctorId || req.params?.doctorId;

        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });

        const target = await Doctor.findById(doctorId);
        if (!target) return res.status(404).json({ success: false, message: 'Doctor not found.' });

        if (await isAdminCaller(caller)) {
            req.doctor = target;
            return next();
        }

        const doctor = await findCallerDoctor(caller);
        if (!doctor) return res.status(401).json({ success: false, message: 'Doctor authentication required.' });
        if (String(doctor._id) !== String(target._id)) {
            return res.status(403).json({ success: false, message: 'You can only act as yourself.' });
        }

        req.doctor = doctor;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Shared appointment ownership check. Example: { patient: true, doctor: true }
exports.verifyAppointmentAccess = (options = { patient: true, doctor: true }) => async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const appointmentId = req.params.id || req.body?.appointmentId;
        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });
        if (!mongoose.isValidObjectId(appointmentId)) {
            return res.status(400).json({ success: false, message: 'Valid appointment id required.' });
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found.' });

        if (await isAdminCaller(caller)) {
            req.appointment = appointment;
            return next();
        }

        if (options.patient && appointment.patientEmail?.toLowerCase() === caller) {
            req.appointment = appointment;
            return next();
        }

        if (options.doctor) {
            const doctor = await findCallerDoctor(caller);
            if (doctor && String(appointment.doctor) === String(doctor._id)) {
                req.appointment = appointment;
                req.doctor = doctor;
                return next();
            }
        }

        return res.status(403).json({ success: false, message: 'You are not allowed to modify this appointment.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const patientOwnsAppointment = (appointment, caller) =>
    Boolean(appointment) && (
        appointment.patientEmail?.toLowerCase() === caller ||
        appointment.patient === caller
    );

// Prescription PDFs: patient owner, issuing doctor, or admin.
exports.verifyPrescriptionAccess = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });

        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found.' });

        if (await isAdminCaller(caller)) return next();

        const appointment = await Appointment.findById(prescription.appointmentId);
        if (patientOwnsAppointment(appointment, caller)) return next();

        const doctor = await findCallerDoctor(caller);
        if (doctor && String(prescription.doctorId) === String(doctor._id)) return next();

        return res.status(403).json({ success: false, message: 'You cannot download this prescription.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Lab report PDFs: patient owner, issuing doctor, or admin.
exports.verifyLabReportAccess = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });

        const labReport = await LabReport.findById(req.params.id);
        if (!labReport) return res.status(404).json({ success: false, message: 'Lab report not found.' });

        if (await isAdminCaller(caller)) return next();

        const appointment = await Appointment.findById(labReport.appointmentId);
        if (patientOwnsAppointment(appointment, caller)) return next();

        const doctor = await findCallerDoctor(caller);
        if (doctor && String(labReport.doctorId) === String(doctor._id)) return next();

        return res.status(403).json({ success: false, message: 'You cannot download this lab report.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Medical record files: patient owner, treating doctor, or admin.
exports.verifyRecordAccess = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });

        const record = await MedicalRecord.findById(req.params.recordId);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });

        if (await isAdminCaller(caller)) {
            req.record = record;
            return next();
        }

        if ((record.patientEmail || '').toLowerCase() === caller ||
            String(record.patientId).toLowerCase() === caller) {
            req.record = record;
            return next();
        }

        const appointment = record.appointmentId
            ? await Appointment.findById(record.appointmentId)
            : null;
        if (patientOwnsAppointment(appointment, caller)) {
            req.record = record;
            return next();
        }

        const doctor = await findCallerDoctor(caller);
        if (doctor) {
            const treatedPatient = await Appointment.exists({
                doctor: doctor._id,
                $or: [{ patient: record.patientId }, { patientEmail: String(record.patientId).toLowerCase() }]
            });
            if (treatedPatient) {
                req.record = record;
                return next();
            }
        }

        return res.status(403).json({ success: false, message: 'You cannot access this medical record.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Doctor viewing a patient's uploaded files (must be their own patient).
exports.verifyDoctorPatient = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const { doctorId, patientId } = req.params;
        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });

        const target = await Doctor.findById(doctorId);
        if (!target) return res.status(404).json({ success: false, message: 'Doctor not found.' });

        if (!(await isAdminCaller(caller))) {
            const doctor = await findCallerDoctor(caller);
            if (!doctor || String(doctor._id) !== String(target._id)) {
                return res.status(403).json({ success: false, message: 'You can only view your own patients.' });
            }
        }

        const hasAppointment = await Appointment.exists({
            doctor: target._id,
            $or: [{ patient: patientId }, { patientEmail: patientId.toLowerCase() }]
        });
        if (!hasAppointment) {
            return res.status(403).json({ success: false, message: 'This patient is not assigned to you.' });
        }

        req.doctor = target;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Doctor uploading a document for one of their own patients.
exports.verifyDoctorUpload = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const { doctorId } = req.params;
        const patientId = req.body?.patientId || '';

        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });

        const target = await Doctor.findById(doctorId);
        if (!target) return res.status(404).json({ success: false, message: 'Doctor not found.' });

        if (!(await isAdminCaller(caller))) {
            const doctor = await findCallerDoctor(caller);
            if (!doctor || String(doctor._id) !== String(target._id)) {
                return res.status(403).json({ success: false, message: 'You can only upload for your own patients.' });
            }
        }

        const hasAppointment = await Appointment.exists({
            doctor: target._id,
            $or: [{ patient: patientId }, { patientEmail: patientId.toLowerCase() }]
        });
        if (!hasAppointment) {
            return res.status(403).json({ success: false, message: 'This patient is not assigned to you.' });
        }

        req.doctor = target;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Patient uploading a personal record (body must belong to them).
exports.verifyPatientBody = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const targetEmail = (req.body?.patientEmail || '').toLowerCase();
        const targetId = req.body?.patientId || '';

        if (!caller) return res.status(401).json({ success: false, message: 'Authentication required.' });
        if (await isAdminCaller(caller)) return next();
        if (!targetEmail && !targetId) return res.status(400).json({ success: false, message: 'Patient identity is required.' });

        const user = await User.findOne({ email: caller });
        const allowedIds = new Set([caller]);
        if (user) allowedIds.add(String(user._id));

        const ownAppointments = await Appointment.find({
            $or: [{ patient: caller }, { patientEmail: caller }]
        }).select('patient patientEmail');

        ownAppointments.forEach(appt => {
            if (appt.patient) allowedIds.add(String(appt.patient));
            if (appt.patientEmail) allowedIds.add(String(appt.patientEmail).toLowerCase());
        });

        if (targetId && !allowedIds.has(targetId)) {
            return res.status(403).json({ success: false, message: 'You can only upload records to your own profile.' });
        }
        if (targetEmail && !allowedIds.has(targetEmail)) {
            return res.status(403).json({ success: false, message: 'You can only upload records to your own profile.' });
        }

        return next();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Old name kept for existing imports.
exports.protectRx = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ success: false, error: 'Consultation not found.' });
        if (appointment.patientEmail?.toLowerCase() !== caller && appointment.patient !== caller) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }
        req.appointment = appointment;
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

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
exports.verifyDoctor = async (req, res, next) => {
    try {
        const caller = getCallerEmail(req);
        if (!caller || !caller.includes('@')) {
            return res.status(401).json({ success: false, message: 'Doctor authentication required.' });
        }

        if (await isAdminCaller(caller)) {
            const targetId = req.body?.doctorId || req.query?.doctorId || req.params?.doctorId;
            if (!mongoose.isValidObjectId(targetId)) {
                return res.status(400).json({ success: false, message: 'doctorId is required for administrator schedule updates.' });
            }
            const targetDoctor = await Doctor.findById(targetId);
            if (!targetDoctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
            req.user = targetDoctor;
            req.doctor = targetDoctor;
            return next();
        }

        const doctor = await findCallerDoctor(caller);
        if (!doctor) return res.status(401).json({ success: false, message: 'Doctor authentication required.' });

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

exports.getCallerEmail = getCallerEmail;
