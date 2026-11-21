const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const LabReport = require('../models/LabReport');
const QueueCounter = require('../models/QueueCounter');
const AuditLog = require('../models/AuditLog');

const { estimateWaitMinutes } = require('../utils/waitEstimator');

// True client IP: reverse-proxy header first, then Express-resolved socket address
function resolveClientIp(req) {
    const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return fwd || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Persist critical administrative actions to MongoDB (audit trail survives restarts).
// Every entry stores the admin identity, exact server timestamp (schema timestamps)
// and the requesting client IP for forensic review.
async function logAdminEvent(req, event, details) {
    try {
        await AuditLog.create({
            event,
            user: req.headers['x-user-email'] || 'admin',
            details,
            ip: resolveClientIp(req)
        });
    } catch (err) {
        console.error('[AuditLog] Failed to persist:', err.message);
    }
}

// ── 1. Hospital Dashboard Overview Metrics (single-pass aggregations) ──
exports.getAdminDashboardMetrics = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const last7Dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Dates.push(d.toISOString().split('T')[0]);
        }

        // Counters + distribution pipelines run concurrently (no sequential round-trips)
        const [
            totalDoctors, activeDoctors, totalPatients, totalAppointments, todayAppointments,
            completedVisits, totalPrescriptions, totalRecords,
            deptDoctorAgg, deptVolumeAgg, statusAgg, trendAgg, consultAgg, completedDoctorAgg
        ] = await Promise.all([
            Doctor.countDocuments(),
            Doctor.countDocuments({ presenceStatus: { $ne: 'absent' } }),
            User.countDocuments({ role: 'patient' }),
            Appointment.countDocuments(),
            Appointment.countDocuments({ date: todayStr }),
            Appointment.countDocuments({ status: 'completed' }),
            Prescription.countDocuments(),
            MedicalRecord.countDocuments(),
            // Doctor headcount per department
            Doctor.aggregate([
                { $group: { _id: '$department', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // Real appointment volume per department
            Appointment.aggregate([
                { $group: { _id: '$department', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            // Live consultation status distribution
            Appointment.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            // 7-day visit trends (dates stored as YYYY-MM-DD strings)
            Appointment.aggregate([
                { $match: { date: { $in: last7Dates } } },
                { $group: { _id: '$date', count: { $sum: 1 } } }
            ]),
            // Consultation type split (In-Person vs Video)
            Appointment.aggregate([
                { $group: { _id: '$consultationType', count: { $sum: 1 } } }
            ]),
            // Revenue inputs: completed visits grouped per doctor (joined with fees below —
            // two simple pipelines instead of $lookup/$unwind so older MongoDB builds are supported)
            Appointment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: '$doctor', visits: { $sum: 1 } } }
            ])
        ]);

        // Merge doctor headcount + real visit volume into one department table
        const volumeMap = Object.fromEntries(deptVolumeAgg.map(d => [d._id, d.count]));
        const departmentStats = deptDoctorAgg.map(d => ({
            department: d._id,
            count: d.count,
            appointments: volumeMap[d._id] || 0
        }));

        // Trend array aligned to the fixed 7-day window (including zero days)
        const trendMap = Object.fromEntries(trendAgg.map(t => [t._id, t.count]));
        const trendStats = last7Dates.map(dateStr => {
            const count = trendMap[dateStr] || 0;
            return { date: dateStr.slice(5), count, revenue: count * 1500 };
        });

        const statusCounts = Object.fromEntries(statusAgg.map(s => [s._id, s.count]));
        const consultMap = Object.fromEntries(consultAgg.map(c => [c._id, c.count]));

        // Real ER/day occupancy: today's load ÷ daily capacity (12 slots per active doctor)
        const dailyCapacity = Math.max(activeDoctors * 12, 1);
        const occupancyPct = Math.min(100, Math.round((todayAppointments / dailyCapacity) * 100));

        // Join completed visit counts with each doctor's actual consultation fee
        const feeList = await Doctor.find().select('consultationFee').lean();
        const feeMap = Object.fromEntries(feeList.map(d => [String(d._id), d.consultationFee || 0]));
        const estimatedRevenue = completedDoctorAgg.reduce((sum, r) => sum + (feeMap[String(r._id)] || 0) * r.visits, 0);

        res.status(200).json({
            success: true,
            metrics: {
                totalDoctors,
                activeDoctors,
                totalPatients,
                totalAppointments,
                todayAppointments,
                completedVisits,
                totalPrescriptions,
                totalRecords,
                statusCounts,
                estimatedRevenue: `${Math.round(estimatedRevenue)} Rs`,
                emergencyOccupancy: `${occupancyPct}%`,
                consultationTypes: { 'In-Person': consultMap['in-person'] || 0, 'Video': consultMap['video'] || 0 }
            },
            departmentStats,
            trendStats
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── 2. Medical Staff Management (CRUD) ──
exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: doctors.length, doctors });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createDoctor = async (req, res) => {
    try {
        const { name, email, department, qualification, degree, college, age, experienceYears, consultationFee, presenceStatus, awards } = req.body;
        const existing = await Doctor.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, error: 'A doctor with this email already exists.' });
        }

        const doctor = new Doctor({
            name,
            email: email.toLowerCase(),
            department,
            qualification,
            degree: degree || qualification,
            college: college || '',
            age: Number(age) || undefined,
            awards: Array.isArray(awards) ? awards.filter(Boolean) : String(awards || '').split('\n').map(s => s.trim()).filter(Boolean),
            experienceYears: Number(experienceYears) || 5,
            consultationFee: Number(consultationFee) || 1500,
            presenceStatus: presenceStatus || 'available'
        });

        // .save() triggers the specialty pre-save hook: degree-vs-department integrity enforced
        await doctor.save();
        logAdminEvent(req, 'CREATE_DOCTOR', `Created doctor ${name} in ${doctor.department}`);
        res.status(201).json({ success: true, doctor });
    } catch (err) {
        // The pre-check above can never cover concurrent registrations — E11000 is checked at DB level
        if (err.code === 11000) {
            return res.status(409).json({ success: false, error: 'A doctor with this email already exists in the registry.' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findById(id);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        // Whitelisted field assignment, then .save() instead of findByIdAndUpdate so the
        // specialty pre-save hook cross-checks the (possibly edited) degree vs department
        ['name', 'email', 'department', 'qualification', 'degree', 'college', 'age', 'experienceYears', 'consultationFee', 'presenceStatus']
            .forEach(f => { if (req.body[f] !== undefined) doctor[f] = (f === 'age' || f === 'experienceYears') ? Number(req.body[f]) : req.body[f]; });
        if (req.body.awards !== undefined) {
            doctor.awards = Array.isArray(req.body.awards)
                ? req.body.awards.filter(Boolean)
                : String(req.body.awards).split('\n').map(s => s.trim()).filter(Boolean);
        }

        await doctor.save();
        logAdminEvent(req, 'UPDATE_DOCTOR', `Updated details for Dr. ${doctor.name} (${doctor.degree} | ${doctor.department})`);
        res.status(200).json({ success: true, doctor });
    } catch (err) {
        // Admin edits may legitimately change email — a collision is a conflicting
        // identity claim, not a server crash
        if (err.code === 11000) {
            return res.status(409).json({ success: false, error: 'That email is already registered by another specialist.' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Doctor.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, error: 'Doctor not found' });
        logAdminEvent(req, 'DELETE_DOCTOR', `Removed Dr. ${deleted.name} from hospital records`);
        res.status(200).json({ success: true, message: 'Doctor profile removed.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── 3. Patient Management & User Role Administration ──

// Resolve a management target that may live in either the User (login) or Doctor (medical staff) collection
async function resolveAdminTarget(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const user = await User.findById(id).select('-password');
    if (user) return { type: 'user', doc: user };
    const doctor = await Doctor.findById(id).select('-password');
    return doctor ? { type: 'doctor', doc: doctor } : null;
}

// GET /admin/users — returns EVERY account: login users (patient/doctor/admin) + medical-staff-only profiles
exports.getAllUsers = async (req, res) => {
    try {
        const [users, doctors] = await Promise.all([
            User.find().select('-password -otp -otpExpires').sort({ createdAt: -1 }).lean(),
            Doctor.find().select('name email department presenceStatus qualification createdAt').lean()
        ]);

        // Staff profiles created via the Medical Staff tab that have no login account yet
        const staffOnly = doctors
            .filter(d => !users.some(u => u.email?.toLowerCase() === d.email?.toLowerCase()))
            .map(d => ({ ...d, role: 'doctor', isStaffProfile: true }));

        res.status(200).json({ success: true, count: users.length + staffOnly.length, users: [...users, ...staffOnly] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Edit user details (name / email) across both account types
exports.updateUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email } = req.body;
        if (!name && !email) {
            return res.status(400).json({ success: false, error: 'No fields to update provided.' });
        }

        const target = await resolveAdminTarget(id);
        if (!target) return res.status(404).json({ success: false, error: 'User not found' });

        const update = {};
        if (name) update.name = name;
        if (email) update.email = email.toLowerCase();

        const updated = await target.type === 'user'
            ? User.findByIdAndUpdate(id, update, { new: true }).select('-password')
            : Doctor.findByIdAndUpdate(id, update, { new: true });

        logAdminEvent(req, 'EDIT_USER', `Updated details for ${updated.email}`);
        res.status(200).json({ success: true, user: updated });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, error: 'That email is already registered.' });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body; // 'patient' | 'doctor' | 'hospital_admin'
        if (!['patient', 'doctor', 'hospital_admin'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role specified.' });
        }

        const target = await resolveAdminTarget(id);
        if (!target) return res.status(404).json({ success: false, error: 'User not found' });

        if (target.type === 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'This staff member has a medical staff profile but no login account yet. Run node seedDoctors.js or edit via the Medical Staff tab.'
            });
        }

        // Never allow modifying the designated admin account from the UI
        if (process.env.ADMIN_EMAIL && target.doc.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
            return res.status(403).json({ success: false, error: 'The designated admin account cannot be modified.' });
        }

        const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
        logAdminEvent(req, 'ROLE_CHANGE', `Changed role of ${user.email} to ${role}`);
        res.status(200).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Delete user account (admin removal, protected with confirmation flow on frontend)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const target = await resolveAdminTarget(id);
        if (!target) return res.status(404).json({ success: false, error: 'User not found' });

        if (process.env.ADMIN_EMAIL && target.doc.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
            return res.status(403).json({ success: false, error: 'The designated admin account cannot be deleted.' });
        }

        if (target.type === 'doctor') {
            // Staff-only profile: remove profile and any scheduled bookings under them
            await Doctor.findByIdAndDelete(id);
            await Appointment.deleteMany({ doctor: id, status: { $in: ['scheduled', 'in-progress'] } });
            logAdminEvent(req, 'DELETE_DOCTOR_ACCOUNT', `Removed medical staff profile ${target.doc.email}`);
            return res.status(200).json({ success: true, message: `Medical staff profile ${target.doc.email} removed.` });
        }

        // Cascade: remove the user's appointments & medical records (data minimisation)
        await Appointment.deleteMany({ $or: [{ patient: target.doc.email }, { patientEmail: target.doc.email.toLowerCase() }] });
        await MedicalRecord.deleteMany({ $or: [{ patientId: target.doc.email }, { patientEmail: target.doc.email.toLowerCase() }] });

        await target.doc.deleteOne();
        logAdminEvent(req, 'DELETE_USER', `Deleted user ${target.doc.email} and associated data`);
        res.status(200).json({ success: true, message: `User ${target.doc.email} removed with associated records.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── 4. Comprehensive Appointment Monitoring & Administrative Override ──
exports.getAllAppointments = async (req, res) => {
    try {
        const { date, status, department, type } = req.query;
        const query = { deleted: { $ne: true } };
        if (date) query.date = date;
        if (status) query.status = status;
        if (department) query.department = department;
        if (type) query.consultationType = type;   // 'in-person' | 'video'

        const appointments = await Appointment.find(query).populate('doctor').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: appointments.length, appointments });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Statuses whose bookings release their OPD slot back into the bookable pool
const SLOT_CLOSING_STATUSES = ['completed', 'cancelled', 'no-show', 'missed'];
const isActiveStatus = (s) => ['scheduled', 'in-progress'].includes(s);exports.overrideAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, date, timeSlot, doctorNotes } = req.body;

        const appt = await Appointment.findById(id);
        if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });

        // Compute post-override values so the slot key always mirrors the live booking
        const finalStatus = status || appt.status;
        const finalDate = date || appt.date;
        const finalSlot = timeSlot || appt.timeSlot;

        const updateOps = { $set: {} , $unset: {} };
        if (status) updateOps.$set.status = status;
        if (date) updateOps.$set.date = date;
        if (timeSlot) updateOps.$set.timeSlot = timeSlot;
        if (doctorNotes !== undefined) updateOps.$set.doctorNotes = doctorNotes;

        if (isActiveStatus(finalStatus)) {
            // Booking stays live: re-key the reservation onto its (possibly new) date/slot
            updateOps.$set.activeSlotKey = `${finalDate}|${finalSlot}`;
        } else if (SLOT_CLOSING_STATUSES.includes(finalStatus)) {
            updateOps.$unset.activeSlotKey = '';
        }

        let updated;
        try {
            updated = await Appointment.findByIdAndUpdate(id, updateOps, { new: true });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).json({ success: false, error: 'Requested slot is already booked by another appointment.' });
            }
            throw err;
        }

        // Queue synchronization after status override (recompute statistical waits for that date)
        if (SLOT_CLOSING_STATUSES.includes(updated.status)) {
            const doctor = await Doctor.findById(updated.doctor).select('presenceStatus');
            const waiting = await Appointment.find({ doctor: updated.doctor, date: updated.date, status: 'scheduled' })
                .sort({ queueNumber: 1 });
            for (let i = 0; i < waiting.length; i++) {
                waiting[i].estimatedWaitMinutes = await estimateWaitMinutes(updated.doctor, i + 1, doctor?.presenceStatus);
                await waiting[i].save();
            }
        }

        logAdminEvent(req, 'APPOINTMENT_OVERRIDE', `Admin modified Token ${updated.tokenNumber} to ${updated.status} (${updated.date})`);
        res.status(200).json({ success: true, appointment: updated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Admin hard-delete of appointments (slot freed for future booking)
exports.deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const appt = await Appointment.findById(id);
        if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });

        await Appointment.findByIdAndDelete(id);

        // Compact remaining same-day queue numbers so tokens stay sequential,
        // then re-estimate the statistical wait for patients still waiting
        const remaining = await Appointment.find({ doctor: appt.doctor, date: appt.date })
            .sort({ queueNumber: 1 });
        const doctor = await Doctor.findById(appt.doctor).select('presenceStatus');
        let waitPos = 0;
        for (let i = 0; i < remaining.length; i++) {
            const changes = {};
            if (remaining[i].queueNumber !== i + 1) {
                remaining[i].queueNumber = i + 1;
            }
            if (remaining[i].status === 'scheduled') {
                waitPos += 1;
                const estimate = await estimateWaitMinutes(appt.doctor, waitPos, doctor?.presenceStatus);
                if (remaining[i].estimatedWaitMinutes !== estimate) remaining[i].estimatedWaitMinutes = estimate;
            }
            if (remaining[i].isModified()) await remaining[i].save();
        }

        logAdminEvent(req, 'APPOINTMENT_DELETE', `Admin deleted appointment Token ${appt.tokenNumber} (${appt.date})`);
        res.status(200).json({ success: true, message: 'Appointment permanently removed, queue re-synced.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── 5. System Security & Audit Logs (MongoDB-persisted) ──
exports.getSecurityLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── 6. Full Database Backup Utility (JSON Archive) ──
exports.triggerDatabaseBackup = async (req, res) => {
    try {
        const [doctors, users, appointments, prescriptions, records, labReports, queueCounters, auditLogs] = await Promise.all([
            Doctor.find().lean(),
            User.find().select('-password').lean(),
            Appointment.find().lean(),
            Prescription.find().lean(),
            MedicalRecord.find().lean(),
            LabReport.find().lean(),
            QueueCounter.find().lean(),
            AuditLog.find().limit(500).lean() // cap log volume in backups
        ]);

        const backupArchive = {
            hospital: 'PrimeCare Hospital & Research Center',
            exportDate: new Date().toISOString(),
            version: '2026.2.0-ENTERPRISE',            summary: {
                doctorsCount: doctors.length,
                usersCount: users.length,
                appointmentsCount: appointments.length,
                prescriptionsCount: prescriptions.length,
                recordsCount: records.length,
                labReportsCount: labReports.length
            },
            data: { doctors, users, appointments, prescriptions, records, labReports, queueCounters, auditLogs }
        };

        logAdminEvent(req, 'DATABASE_BACKUP', `Full JSON export triggered (${Object.values(backupArchive.summary).reduce((a, b) => a + b, 0)} documents)`);

        // Set response headers to prompt a downloadable JSON file
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="primecare-backup-${Date.now()}.json"`);
        res.status(200).send(JSON.stringify(backupArchive, null, 2));
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
