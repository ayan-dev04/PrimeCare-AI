const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const MedicalRecord = require('../models/MedicalRecord');
const LabReport = require('../models/LabReport');
const sendEmail = require('../utils/sendEmail');
const upload = require('../utils/uploadMiddleware');
const { buildPrescriptionPdf, buildLabReportPdf } = require('../utils/pdfUtil');
const { getCallerEmail } = require('../middleware/rbacMiddleware');
const { calculateDoctorScores } = require('../utils/mcdaScorer');
const { DEPT_PROFILES, COLLEGES, GENERAL_AWARDS } = require('../utils/doctorRegistry');
const { parseTimeToMinutes, formatMinutes, getShiftDurationMinutes } = require('../utils/slotGenerator');
const path = require('path');

const UPLOAD_DIR = path.resolve(__dirname, '../uploads');
const badReq = (res, msg) => res.status(400).json({ success: false, error: msg });
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const normalizeTime = (value) => {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text === '24:00') return null;
    const minutes = parseTimeToMinutes(text);
    return minutes === null ? null : formatMinutes(minutes);
};

const generateDoctorEmail = (doctorName, baseEmail = process.env.EMAIL_USER || "primecare.hospital@gmail.com") => {
    const cleanName = doctorName.toLowerCase().replace(/dr\./g, '').replace(/\(hod\)/g, '').trim().replace(/[^a-z0-9]/g, '');
    const [username, domain] = baseEmail.split('@');
    return `${username}+${cleanName}@${domain}`;
};

const uniqueDoctorEmail = (name, usedEmails) => {
    let email = generateDoctorEmail(name);
    for (let n = 2; usedEmails.has(email); n++) {
        email = generateDoctorEmail(`${name} ${n}`);
    }
    usedEmails.add(email);
    return email;
};

const getInitials = (doctorName) => {
    if (!doctorName) return 'DR';
    const cleanName = doctorName.replace(/dr\./gi, '').replace(/\(hod\)/gi, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return cleanName.substring(0, 2).toUpperCase();
};

exports.getAllDoctors = async (req, res) => {
    try {
        if ((await Doctor.estimatedDocumentCount()) === 0) {
            const fees = [1200, 1500, 1800, 2000];
            const maleFirstNames = ["Aarav", "Vivaan", "Aditya", "Arjun", "Kabir", "Rohan", "Amit", "Rahul", "Manish", "Karan", "Varun", "Nikhil", "Sameer", "Harsh"];
            const femaleFirstNames = ["Ananya", "Diya", "Saanvi", "Riya", "Meera", "Pooja", "Neha", "Priya", "Sneha", "Kavita", "Tanvi", "Shruti", "Divya", "Swati", "Sunita"];
            const lastNames = ["Sharma", "Verma", "Gupta", "Malhotra", "Mehta", "Patel", "Reddy", "Iyer", "Nair", "Bose", "Sen", "Joshi", "Kulkarni", "Kapoor"];
            const lastIdx = lastNames.length - 1;

            let staffList = [];
            let maleIdx = 0, femaleIdx = 0;
            const usedEmails = new Set();

            Object.entries(DEPT_PROFILES).forEach(([dept, profile]) => {
                for (let i = 1; i <= 10; i++) {
                    const isHOD = i === 1;
                    const docName = isHOD ? profile.hod.name
                        : i % 2 === 0
                            ? `Dr. ${maleFirstNames[maleIdx++ % maleFirstNames.length]} ${lastNames[Math.floor(Math.random() * lastIdx)]}`
                            : `Dr. ${femaleFirstNames[femaleIdx++ % femaleFirstNames.length]} ${lastNames[Math.floor(Math.random() * lastIdx)]}`;

                    const degree = isHOD ? profile.hod.degree : pick(profile.degrees);
                    const experience = isHOD ? Math.floor(Math.random() * 4) + 25 : Math.floor(Math.random() * 10) + 5;
                    const awards = [pick(profile.awards)];
                    if (Math.random() > 0.5) awards.push(pick(GENERAL_AWARDS));

                    staffList.push({
                        name: docName,
                        email: uniqueDoctorEmail(docName, usedEmails),
                        password: 'PrimeCare@2026',
                        roleType: isHOD ? 'specialist' : 'doctor',
                        department: dept,
                        qualification: degree,
                        degree,
                        college: pick(COLLEGES),
                        age: experience + (isHOD ? 25 : 24),
                        awards,
                        experienceYears: experience,
                        consultationFee: isHOD ? 2000 : pick(fees),
                        rating: isHOD ? 4.95 : Number((4.70 + Math.random() * 0.2).toFixed(2)),
                        presenceStatus: 'available',
                        avatar: getInitials(docName)
                    });
                }
            });
            await Doctor.insertMany(staffList);
        }

        const doctors = await Doctor.find({ presenceStatus: { $ne: 'absent' } }).sort({ roleType: -1, experienceYears: -1 });
        res.status(200).json(doctors);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getDoctorsByDepartment = async (req, res) => {
    try {
        const { deptName } = req.params;
        if (!deptName) return badReq(res, 'Department name required.');
        const doctors = await Doctor.find({
            department: { $regex: new RegExp(`^${deptName}$`, 'i') },
            presenceStatus: { $ne: 'absent' }
        }).sort({ roleType: -1, experienceYears: -1 });
        res.status(200).json({ success: true, count: doctors.length, doctors });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getSmartDoctorMatches = async (req, res) => {
    try {
        const { deptName } = req.params;
        if (!deptName) return badReq(res, 'Department name required.');
        const doctors = await Doctor.find({
            department: { $regex: new RegExp(`^${deptName}$`, 'i') },
            presenceStatus: { $ne: 'absent' }
        });
        const ranked = await calculateDoctorScores(deptName, doctors);
        res.status(200).json({ success: true, count: ranked.length, doctors: ranked });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });
        res.status(200).json(doctor);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateAvailability = async (req, res) => {
    try {
        const { workingHours, days } = req.body || {};
        const doctorId = req.user?._id || req.user?.id;
        if (!doctorId) return res.status(401).json({ success: false, message: 'Doctor authentication required.' });

        const dayLookup = Object.fromEntries(DAY_NAMES.map(day => [day.toLowerCase(), day]));
        const validDays = [...new Set((Array.isArray(days) ? days : []).map(d => dayLookup[String(d).trim().toLowerCase()]).filter(Boolean))];
        const start = normalizeTime(workingHours?.start);
        const end = normalizeTime(workingHours?.end);

        if (!validDays.length) return res.status(400).json({ success: false, message: 'Select valid working days.' });
        if (!start || !end) return res.status(400).json({ success: false, message: 'Valid start and end times required.' });

        const shiftDurationMinutes = getShiftDurationMinutes(start, end);
        if (shiftDurationMinutes === 0) return res.status(400).json({ success: false, message: 'Shift start and end must differ.' });

        const doctor = await Doctor.findOneAndUpdate(
            { _id: doctorId },
            { $set: { workingHours: { start, end }, days: validDays } },
            { new: true, runValidators: true }
        );

        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });
        res.status(200).json({ success: true, message: 'Schedule updated', shiftDurationMinutes, data: doctor });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updatePresence = async (req, res) => {
    try {
        const { doctorId, presenceStatus } = req.body;
        if (!doctorId || !presenceStatus) return badReq(res, 'Missing fields');
        const doctor = await Doctor.findByIdAndUpdate(doctorId, { presenceStatus }, { new: true });
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found.' });
        res.status(200).json({ success: true, doctor, message: `Presence updated to ${presenceStatus}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDoctorAppointments = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const appointments = await Appointment.find({ doctor: doctorId }).sort({ date: -1, queueNumber: 1 });
        const ids = [...new Set(appointments.flatMap(a => [a.patient, a.patientEmail.toLowerCase()]))];
        const patientFiles = await MedicalRecord.find({ $or: [{ patientId: { $in: ids } }, { patientEmail: { $in: ids } }] }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, appointments, patientFiles });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Create or update prescription and synchronize with MedicalRecords
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
            prescription.doctorId = rest.doctorId || prescription.doctorId;
            prescription.doctorName = rest.doctorName || prescription.doctorName;
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

// Fetch prescriptions issued by a specific doctor ID
exports.getDoctorPrescriptions = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const prescriptions = await Prescription.find({ doctorId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, prescriptions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getPatientPrescriptions = async (req, res) => {
    try {
        const { patientId } = req.params;
        if (patientId === 'all') {
            const prescriptions = await Prescription.find().sort({ createdAt: -1 });
            return res.status(200).json({ success: true, prescriptions });
        }
        const prescriptions = await Prescription.find({ patientId }).sort({ createdAt: -1 });
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

exports.getGuardedFile = async (req, res) => {
    try {
        const caller = getCallerEmail(req);
        if (!caller) return res.status(401).json({ success: false, error: 'Auth required.' });
        const record = await MedicalRecord.findById(req.params.recordId);
        if (!record) return res.status(404).json({ success: false, error: 'Record not found.' });
        const safePath = path.resolve(UPLOAD_DIR, path.basename(record.fileUrl));
        res.sendFile(safePath, { headers: { 'Content-Type': record.fileType || 'application/pdf' } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createLabReport = async (req, res) => {
    try {
        const { appointmentId, selectedCategories, tests, ...rest } = req.body;
        const appt = await Appointment.findById(appointmentId);
        if (!appt) return res.status(404).json({ success: false, error: 'Consultation not found.' });

        const labReport = await LabReport.create({
            ...rest, appointmentId,
            selectedCategories: selectedCategories || [],
            patientId: appt.patient || appt.patientEmail,
            patientName: appt.patientName,
            tests
        });

        await MedicalRecord.create({
            patientId: appt.patient || appt.patientEmail,
            patientName: appt.patientName,
            title: `Lab Report: ${rest.panelName}`,
            category: 'Lab Report',
            recordDate: new Date().toISOString().split('T')[0],
            doctorName: rest.doctorName,
            department: rest.department,
            fileUrl: `/api/doctors/lab-reports/download/${labReport._id}`,
            notes: rest.summaryImpression || '',
            uploadedBy: 'doctor',
            appointmentId
        });

        res.status(201).json({ success: true, labReport });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDoctorLabReports = async (req, res) => {
    try {
        const labReports = await LabReport.find({ doctorId: req.params.doctorId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, labReports });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.downloadLabReport = async (req, res) => {
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

exports.getPatientUploadedFiles = async (req, res) => {
    try {
        const { doctorId, patientId } = req.params;
        const files = await MedicalRecord.find({ $or: [{ patientId }, { patientEmail: patientId }] }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.uploadPatientRecord = upload.single('file');

exports.finalizePatientRecordUpload = async (req, res) => {
    try {
        const { patientId, patientName, title, category, notes } = req.body;
        const doctor = await Doctor.findById(req.params.doctorId);
        if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found.' });
        if (!req.file) return badReq(res, 'No file provided.');

        const record = await MedicalRecord.create({
            patientId, patientName, title, category,
            recordDate: new Date().toISOString().split('T')[0],
            doctorName: doctor.name, department: doctor.department,
            fileName: req.file.originalname,
            fileUrl: `/uploads/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            notes, uploadedBy: 'doctor'
        });

        res.status(201).json({ success: true, record });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};