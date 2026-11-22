const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const LabReport = require('../models/LabReport');
const QueueCounter = require('../models/QueueCounter');
const sendEmail = require('../utils/sendEmail');
const { predictWaitTime, estimateWaitMinutes } = require('../utils/waitEstimator');
const { calculateDoctorScores } = require('../utils/mcdaScorer');
const { generateSlotWindows, getDayName } = require('../utils/slotGenerator');
const { buildPrescriptionPdf, buildLabReportPdf } = require('../utils/pdfUtil');

const SLOT_CLOSING_STATUSES = ['completed', 'cancelled', 'no-show', 'missed'];
const SLOT_DURATION_MINUTES = 30;

const CHECKOUT_REASONS = {
    absent: 'is currently checked out / unavailable. New bookings are disabled until they check in.',
    busy: 'is in an active consultation right now. Please choose another doctor or try a later slot.',
    'on-break': 'is currently on break and not accepting new bookings. Please try again shortly.'
};

function getBookingBlockReason(doctor) {
    return CHECKOUT_REASONS[doctor.presenceStatus] || null;
}

// A patient may be stored by Clerk id, email or Mongo id depending on the flow.
// Collect every key so old and new appointments/records are all returned.
async function getPatientKeys(identifier) {
    const value = String(identifier || '').trim();
    if (!value) return [];
    const lower = value.toLowerCase();
    const keys = new Set([value, lower]);

    const appointments = await Appointment.find({
        $or: [{ patient: value }, { patientEmail: lower }]
    }).select('patient patientEmail');

    appointments.forEach(a => {
        if (a.patient) keys.add(a.patient);
        if (a.patientEmail) keys.add(a.patientEmail.toLowerCase());
    });

    if (value.includes('@')) {
        const user = await User.findOne({ email: lower }).select('_id');
        if (user) keys.add(String(user._id));
    }

    return [...keys].filter(Boolean);
}

// Prefer the doctor's linked login email, otherwise the profile email.
async function resolveDoctorEmail(doctor) {
    if (doctor.userId) {
        const user = await User.findById(doctor.userId).select('email');
        if (user?.email) return user.email;
    }
    return doctor.email;
}

function getDoctorDaySlots(doctor, date) {
    const day = getDayName(date);
    const isWorkingDay = Boolean(day) && (doctor.days || []).includes(day);
    const windows = isWorkingDay
        ? generateSlotWindows({
            date,
            start: doctor.workingHours?.start,
            end: doctor.workingHours?.end,
            duration: SLOT_DURATION_MINUTES
        })
        : [];
    return { day, isWorkingDay, windows, slots: windows.map(window => window.slot) };
}

exports.getRecommendations = async (req, res) => {
    try {
        const { department } = req.query;
        const query = { presenceStatus: { $ne: 'absent' } };
        if (department && department !== 'All') query.department = department;

        const doctors = await Doctor.find(query);
        const ranked = await calculateDoctorScores(department, doctors);

        const recommendations = await Promise.all(ranked.map(async (r) => ({
            ...r,
            estimatedWaitMinutes: await predictWaitTime(r.doctor._id, r.activeQueue + 1, r.doctor.presenceStatus),
            recommendedScore: r.suitabilityScore
        })));

        res.status(200).json({ success: true, recommendations });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDoctorAvailability = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

        const { day, isWorkingDay, windows } = getDoctorDaySlots(doctor, targetDate);
        if (!day) return res.status(400).json({ success: false, error: 'A valid appointment date is required.' });

        const bookedAppointments = await Appointment.find({
            doctor: doctorId,
            date: targetDate,
            status: { $in: ['scheduled', 'in-progress'] }
        }).select('timeSlot queueNumber');

        const bookedSlotSet = new Set(bookedAppointments.map(a => a.timeSlot));
        const checkoutReason = getBookingBlockReason(doctor);
        const dayOffReason = isWorkingDay ? null : `Dr. ${doctor.name} does not hold OPD on ${day}.`;

        const slots = windows.map(({ slot, startAt, endAt, dayOffset }) => ({
            slot,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            dayOffset,
            available: !checkoutReason && !bookedSlotSet.has(slot),
            reason: checkoutReason ? `Doctor ${checkoutReason}` : (bookedSlotSet.has(slot) ? 'Booked' : 'Available')
        }));

        const SLOT_DURATION_MIN = SLOT_DURATION_MINUTES; // already 30 at module level
        res.status(200).json({
            success: true,
            doctor: { id: doctor._id, name: doctor.name, presenceStatus: doctor.presenceStatus, department: doctor.department },
            date: targetDate,
            day,
            isWorkingDay,
            dayOffReason: isWorkingDay ? null : `Dr. ${doctor.name} does not hold OPD on ${day}. Please choose a working day.`,
            bookingBlockedReason: checkoutReason ? `Doctor ${checkoutReason}` : null,
            canBook: !checkoutReason && isWorkingDay,
            workingHours: { start: doctor.workingHours?.start || '09:00 AM', end: doctor.workingHours?.end || '05:00 PM' },
            slotDurationMinutes: SLOT_DURATION_MIN,
            slots
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

async function dispatchBookingEmails({ appointment, doctor, queueNumber, tokenNumber, estimatedWaitMinutes, videoRoomId, isVideo }) {
    const consultTypeLabel = isVideo ? 'Virtual Video Consultation' : 'In-Person Hospital Visit';
    const emailCard = sendEmail.createHospitalEmailCard;
    const roomUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/video-consultation?room=${videoRoomId}&token=${tokenNumber}`;
    const joinButton = `
        <div style="text-align: center; margin: 22px 0 4px;">
            <a href="${roomUrl}" style="background-color: #059669; color: #ffffff; padding: 13px 28px; font-size: 13px; font-weight: bold; text-decoration: none; border-radius: 14px; display: inline-block;">
                Join Virtual Video Call Room
            </a>
        </div>`;
    const tasks = [];

    if (appointment.patientEmail && !appointment.patientEmailSent) {
        tasks.push({
            type: 'patient',
            promise: sendEmail({
                to: appointment.patientEmail,
                subject: `[${consultTypeLabel}] Confirmed - Token: ${tokenNumber} | PrimeCare Hospital`,
                html: emailCard({
                    title: 'Consultation Confirmed',
                    subtitle: `Official Hospital Token: ${tokenNumber}`,
                    badgeText: consultTypeLabel,
                    contentHtml: `
                        <p>Dear <strong>${appointment.patientName}</strong>,</p>
                        <p>Your appointment with <strong>${doctor.name}</strong> (${doctor.department}) has been successfully scheduled.</p>
                        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 18px; border-radius: 12px; margin: 20px 0;">
                            <p><strong>Token:</strong> ${tokenNumber} (Queue #${queueNumber})</p>
                            <p><strong>Date & Time:</strong> ${appointment.date} at ${appointment.timeSlot}</p>
                            ${isVideo ? joinButton : ''}
                        </div>
                    `,
                    footerNote: 'Encrypted EHR transaction verified by PrimeCare'
                })
            })
        });
    }

    const doctorEmail = doctor ? await resolveDoctorEmail(doctor) : '';
    if (doctorEmail && !appointment.doctorEmailSent) {
        tasks.push({
            type: 'doctor',
            promise: sendEmail({
                to: doctorEmail,
                subject: `[New Booking] ${consultTypeLabel} - Token: ${tokenNumber} | PrimeCare Hospital`,
                html: emailCard({
                    title: 'New Appointment Assigned',
                    subtitle: `Official Hospital Token: ${tokenNumber}`,
                    badgeText: consultTypeLabel,
                    contentHtml: `
                        <p>Dear <strong>${doctor.name}</strong>,</p>
                        <p>A new ${consultTypeLabel.toLowerCase()} has been booked with you by <strong>${appointment.patientName}</strong> (${appointment.patientEmail}).</p>
                        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 18px; border-radius: 12px; margin: 20px 0;">
                            <p><strong>Patient:</strong> ${appointment.patientName} (${appointment.patientEmail})</p>
                            <p><strong>Token:</strong> ${tokenNumber} (Queue #${queueNumber})</p>
                            <p><strong>Date & Time:</strong> ${appointment.date} at ${appointment.timeSlot}</p>
                            <p><strong>Reason:</strong> ${appointment.reason || 'General Consultation'}</p>
                            ${isVideo ? joinButton : ''}
                        </div>
                    `,
                    footerNote: 'Encrypted EHR transaction verified by PrimeCare'
                })
            })
        });
    }

    const settled = await Promise.allSettled(tasks.map(task => task.promise));
    const result = { patientSent: false, doctorSent: false, errors: [] };

    settled.forEach((outcome, index) => {
        const type = tasks[index].type;
        const value = outcome.status === 'fulfilled' ? outcome.value : null;
        if (value?.success) {
            if (type === 'patient') result.patientSent = true;
            if (type === 'doctor') result.doctorSent = true;
            return;
        }
        const reason = outcome.status === 'rejected' ? outcome.reason?.message : value?.error;
        result.errors.push(`${type}: ${reason || 'delivery failed'}`);
    });

    return result;
}

exports.bookAppointment = async (req, res) => {
    try {
        const { patientId, patientName, patientEmail, patientPhone, doctorId, date, timeSlot, department, reason, consultationType } = req.body;
        const callerEmail = (req.headers['x-user-email'] || patientEmail || '').toString().trim().toLowerCase();
        if (!doctorId || !date || !timeSlot || !callerEmail) {
            return res.status(400).json({ success: false, error: 'Missing required booking fields.' });
        }
        if (patientEmail && patientEmail.trim().toLowerCase() !== callerEmail) {
            return res.status(403).json({ success: false, error: 'You can only book an appointment for your own account.' });
        }

        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found.' });

        const blockReason = getBookingBlockReason(doctor);
        if (blockReason) return res.status(409).json({ success: false, error: `Dr. ${doctor.name} ${blockReason}` });

        const { day, isWorkingDay, windows } = getDoctorDaySlots(doctor, date);
        const selectedWindow = windows.find(window => window.slot === timeSlot);
        if (!day || !isWorkingDay || !selectedWindow) {
            return res.status(400).json({ success: false, error: 'Selected slot is outside OPD schedule.' });
        }

        const existingBooking = await Appointment.findOne({
            doctor: doctorId,
            date,
            timeSlot,
            status: { $in: ['scheduled', 'in-progress'] }
        }).select('_id');
        if (existingBooking) {
            return res.status(409).json({
                success: false,
                error: 'This appointment slot has just been booked. Please choose another available time.'
            });
        }

        const counter = await QueueCounter.findOneAndUpdate(
            { doctor: doctorId, date },
            { $inc: { currentQueue: 1 } },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        );

        const queueNumber = counter.currentQueue;
        const tokenNumber = `PC-${Math.floor(1000 + Math.random() * 9000)}`;
        const estimatedWaitMinutes = await estimateWaitMinutes(doctorId, queueNumber, doctor.presenceStatus);
        const isVideo = consultationType === 'video';
        const videoRoomId = isVideo ? `primecare-room-${tokenNumber.toLowerCase()}-${Date.now().toString().slice(-4)}` : '';

        const appointment = new Appointment({
            patient: patientId || callerEmail,
            patientName: patientName || 'Patient',
            patientEmail: callerEmail,
            patientPhone: patientPhone || '',
            doctor: doctor._id,
            department: department || doctor.department,
            date,
            timeSlot,
            slotStartAt: selectedWindow.startAt,
            slotEndAt: selectedWindow.endAt,
            activeSlotKey: `${date}|${timeSlot}`,
            queueNumber,
            tokenNumber,
            reason: reason || 'General Consultation',
            consultationType: isVideo ? 'video' : 'in-person',
            videoRoomId,
            estimatedWaitMinutes,
            status: 'scheduled'
        });

        await appointment.save();

        await appointment.populate('doctor', 'name department degree qualification').catch(() => {});

        // Email delivery must never block the booking response. Render free services
        // block outbound SMTP, so dispatching in the background keeps booking fast.
        if (!appointment.confirmationEmailSent) {
            const appointmentId = appointment._id;
            setImmediate(() => {
                dispatchBookingEmails({ appointment, doctor, queueNumber, tokenNumber, estimatedWaitMinutes, videoRoomId, isVideo })
                    .then(async (result) => {
                        await Appointment.updateOne(
                            { _id: appointmentId },
                            {
                                patientEmailSent: result.patientSent,
                                doctorEmailSent: result.doctorSent,
                                confirmationEmailSent: result.patientSent && result.doctorSent,
                                emailDeliveryError: result.errors.join(' | ')
                            }
                        );
                    })
                    .catch(async (emailErr) => {
                        console.error('[Booking Email Dispatch Warning] Failed to send email notices:', emailErr.message);
                        await Appointment.updateOne(
                            { _id: appointmentId },
                            { $inc: { emailRetryCount: 1 }, emailDeliveryError: emailErr.message }
                        ).catch(() => {});
                    });
            });
        }

        res.status(201).json({ success: true, appointment });
    } catch (err) {
        if (err?.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'This appointment slot was just booked by another patient. Please choose a different time.'
            });
        }
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAppointmentByRoom = async (req, res) => {
    try {
        const appt = await Appointment.findOne({ videoRoomId: req.params.roomId }).populate('doctor');
        if (!appt) return res.status(404).json({ success: false, error: 'Room not found.' });
        res.status(200).json({ success: true, appointment: appt });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getPatientAppointments = async (req, res) => {
    try {
        const { identifier } = req.params;
        const keys = await getPatientKeys(identifier);
        const appointments = await Appointment.find({
            $or: keys.flatMap(key => [
                { patient: key },
                { patientEmail: String(key).toLowerCase() }
            ])
        }).populate('doctor').sort({ date: -1, createdAt: -1 });

        res.status(200).json({ success: true, count: appointments.length, appointments });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.rescheduleAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, timeSlot } = req.body;
        const appt = await Appointment.findById(id);
        if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });

        const doctor = await Doctor.findById(appt.doctor);
        const { day, isWorkingDay, windows } = getDoctorDaySlots(doctor || {}, date);
        const selectedWindow = windows.find(window => window.slot === timeSlot);
        if (!doctor || !day || !isWorkingDay || !selectedWindow) {
            return res.status(400).json({ success: false, error: 'Invalid schedule slot.' });
        }

        appt.date = date;
        appt.timeSlot = timeSlot;
        appt.slotStartAt = selectedWindow.startAt;
        appt.slotEndAt = selectedWindow.endAt;
        appt.status = 'scheduled';
        appt.activeSlotKey = `${date}|${timeSlot}`;
        await appt.save();

        res.status(200).json({ success: true, appointment: appt });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const appt = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled', $unset: { activeSlotKey: '' } }, { new: true });
        if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });
        res.status(200).json({ success: true, message: 'Appointment cancelled.', appointment: appt });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDoctorAppointments = async (req, res) => {
    try {
        const { doctorId } = req.params;
        // Listing without a doctor is only allowed for admins; doctors are scoped
        // to their own queue by the route middleware.
        if (!doctorId) {
            return res.status(400).json({ success: false, error: 'doctorId is required.' });
        }
        const appointments = await Appointment.find({ doctor: doctorId }).populate('doctor').sort({ queueNumber: 1, createdAt: 1 });
        res.status(200).json({ success: true, count: appointments.length, appointments });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateConsultationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, doctorNotes } = req.body;
        const updateData = {};
        if (status) updateData.status = status;
        if (doctorNotes !== undefined) updateData.doctorNotes = doctorNotes;

        const bookUpdate = SLOT_CLOSING_STATUSES.includes(status)
            ? { $set: updateData, $unset: { activeSlotKey: '' } }
            : { $set: updateData };

        const appointment = await Appointment.findByIdAndUpdate(id, bookUpdate, { new: true });
        if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });

        res.status(200).json({ success: true, appointment });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDoctorAnalytics = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const query = doctorId ? { doctor: doctorId } : {};
        const totalAppointments = await Appointment.countDocuments(query);
        const completed = await Appointment.countDocuments({ ...query, status: 'completed' });
        res.status(200).json({ success: true, summary: { totalAppointments, completed } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createPrescription = async (req, res) => {
    try {
        const { appointmentId, medicines, ...rest } = req.body;
        const appt = await Appointment.findById(appointmentId);
        if (!appt) return res.status(404).json({ success: false, error: 'Consultation not found.' });

        let prescription = await Prescription.findOne({ appointmentId });

        if (prescription) {
            prescription.diagnosis = rest.diagnosis;
            prescription.vitals = rest.vitals || prescription.vitals;
            prescription.medicines = medicines;
            prescription.clinicalAdvice = rest.clinicalAdvice;
            prescription.followUpDate = rest.followUpDate;
            await prescription.save();
        } else {
            prescription = await Prescription.create({
                ...rest,
                appointmentId,
                patientId: appt.patient || appt.patientEmail,
                patientName: appt.patientName,
                medicines
            });
        }

        await Appointment.findByIdAndUpdate(appointmentId, { status: 'completed' });

        await MedicalRecord.findOneAndUpdate(
            { appointmentId, category: 'Prescription' },
            {
                patientId: appt.patient || appt.patientEmail,
                patientEmail: (appt.patientEmail || '').toLowerCase(),
                patientName: appt.patientName,
                title: `Prescription: ${rest.diagnosis || 'General Consultation'}`,
                category: 'Prescription',
                recordDate: new Date().toISOString().split('T')[0],
                doctorName: rest.doctorName,
                department: rest.department,
                fileUrl: `/api/doctors/prescriptions/download/${prescription._id}`,
                notes: rest.clinicalAdvice || '',
                uploadedBy: 'doctor',
                appointmentId
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ success: true, prescription });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getPatientPrescriptions = async (req, res) => {
    try {
        const { patientId } = req.params;
        const keys = await getPatientKeys(patientId);
        const prescriptions = await Prescription.find({ patientId: { $in: keys } }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, prescriptions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.downloadPrescriptionPdf = async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ success: false, error: 'Prescription not found.' });

        const pdfBuffer = await buildPrescriptionPdf(prescription);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Prescription-${prescription._id}.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.downloadLabReportPdf = async (req, res) => {
    try {
        const labReport = await LabReport.findById(req.params.id);
        if (!labReport) return res.status(404).json({ success: false, error: 'Lab report not found.' });

        const pdfBuffer = await buildLabReportPdf(labReport);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="LabReport-${labReport._id}.pdf"`);
        res.send(pdfBuffer);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const { uploadToCloudinary } = require('../utils/cloudinary');
const fs = require('fs');
const path = require('path');
const UPLOAD_DIR = path.resolve(__dirname, '../uploads');

exports.uploadMedicalRecord = async (req, res) => {
    try {
        const { patientId, patientName, title, category, recordDate, doctorName, department, notes, uploadedBy, fileUrl } = req.body;
        let finalUrl = fileUrl || '/uploads/default-medical-report.pdf';
        let fileName = 'Document';
        let fileSize = 0;
        let fileType = 'application/pdf';

        if (req.file) {
            fileName = req.file.originalname;
            fileSize = req.file.size;
            fileType = req.file.mimetype;

            // Attempt Cloudinary upload first if configured
            let cloudUploaded = null;
            try {
                cloudUploaded = await uploadToCloudinary(req.file, { folder: 'primecare/patient_records' });
            } catch (cloudErr) {
                console.error('[Upload] Cloudinary upload failed, falling back to local disk:', cloudErr.message);
            }

            if (cloudUploaded && cloudUploaded.secure_url) {
                finalUrl = cloudUploaded.secure_url;
            } else {
                // Local disk storage fallback for development / offline
                const cleanName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const diskFilename = `${Date.now()}-${cleanName}`;
                const diskPath = path.resolve(UPLOAD_DIR, diskFilename);
                fs.writeFileSync(diskPath, req.file.buffer);
                finalUrl = `/uploads/${diskFilename}`;
            }
        }

        const record = new MedicalRecord({
            patientId,
            patientEmail: (req.body.patientEmail || (patientId.includes('@') ? patientId : '')).toLowerCase(),
            patientName: patientName || 'Patient',
            title: title || fileName,
            category: category || 'Lab Report',
            recordDate: recordDate || new Date().toISOString().split('T')[0],
            doctorName: doctorName || 'Specialist',
            department: department || 'General',
            fileName,
            fileUrl: finalUrl,
            fileType,
            fileSize,
            notes: notes || '',
            uploadedBy: uploadedBy || 'patient'
        });

        await record.save();
        res.status(201).json({ success: true, record });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getPatientMedicalRecords = async (req, res) => {
    try {
        const { patientId } = req.params;
        const keys = await getPatientKeys(patientId);
        const records = await MedicalRecord.find({
            $or: [
                { patientId: { $in: keys } },
                { patientEmail: { $in: keys.map(k => String(k).toLowerCase()) } }
            ]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: records.length, records });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDoctorPatientRecords = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found.' });

        const appts = await Appointment.find({ doctor: doctorId }).select('patient patientEmail');
        const ids = [...new Set(appts.flatMap(a => [a.patient, a.patientEmail].filter(Boolean)))];
        const emails = [...new Set(appts.map(a => a.patientEmail).filter(Boolean).map(e => e.toLowerCase()))];

        const records = await MedicalRecord.find({
            $or: [{ patientId: { $in: ids } }, { patientEmail: { $in: emails } }]
        }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, records });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.checkMissedAppointments = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        await Appointment.updateMany({ date: { $lt: today }, status: 'scheduled' }, { status: 'missed', $unset: { activeSlotKey: '' } });
        res.status(200).json({ success: true, message: 'Processed missed appointments.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};