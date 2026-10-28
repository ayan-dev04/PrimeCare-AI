const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware');
const {
    bookAppointment,
    getRecommendations,
    getDoctorAvailability,
    getAppointmentByRoom,
    getPatientAppointments,
    rescheduleAppointment,
    cancelAppointment,
    getDoctorAppointments,
    updateConsultationStatus,
    getDoctorAnalytics,
    createPrescription,
    getPatientPrescriptions,
    uploadMedicalRecord,
    getPatientMedicalRecords,
    getDoctorPatientRecords,
    checkMissedAppointments
} = require('../controllers/appointmentController');

// ── Smart Engine Endpoints ──
router.get('/recommendations', getRecommendations);
router.get('/availability/:doctorId', getDoctorAvailability);

// ── Video Consultation Room Lookup (deep-link resolution for email join buttons) ──
router.get('/room/:roomId', getAppointmentByRoom);

// ── Booking & Patient Lifecycle ──
router.post('/', bookAppointment);
router.post('/book', bookAppointment);
router.get('/patient/:identifier', getPatientAppointments);
router.put('/:id/reschedule', rescheduleAppointment);
router.put('/:id/cancel', cancelAppointment);

// ── Doctor Clinical & Queue Lifecycle ──
router.get('/', getDoctorAppointments);
router.get('/doctor/:doctorId', getDoctorAppointments);
router.patch('/:id/consultation', updateConsultationStatus);
router.get('/doctor/:doctorId/analytics', getDoctorAnalytics);

// ── Digital E-Prescriptions (Hospital-Branded) ──
router.post('/prescriptions', createPrescription);
router.get('/prescriptions/patient/:patientId', getPatientPrescriptions);

// ── Secure Patient Health Records & Reports Hub (Multer upload support) ──
router.post('/records', upload.single('file'), uploadMedicalRecord);
router.get('/records/patient/:patientId', getPatientMedicalRecords);
router.get('/records/doctor/:doctorId', getDoctorPatientRecords);

// ── Maintenance ──
router.get('/missed', checkMissedAppointments);

module.exports = router;