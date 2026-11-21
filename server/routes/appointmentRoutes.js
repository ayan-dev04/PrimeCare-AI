const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware');
const {
    requireAuth,
    verifyPatientSelf,
    verifyDoctorSelf,
    verifyDoctorBody,
    verifyAppointmentAccess,
    verifyRecordAccess,
    verifyPatientBody
} = require('../middleware/rbacMiddleware');
const { verifyAdmin } = require('../middleware/authMiddleware');
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
const { verifyRole } = require('../middleware/roleMiddleware');

/* ── Smart Engine Endpoints ── */
router.get('/recommendations', getRecommendations);
router.get('/availability/:doctorId', getDoctorAvailability);

<!-- Video Consultation Room Lookup (deep-link resolution for email join buttons) -->
router.get('/room/:roomId', getAppointmentByRoom);

/* ── Booking & Patient Lifecycle ── */
router.post('/', requireAuth, verifyRole('patient'), bookAppointment);
router.post('/book', requireAuth, verifyRole('patient'), bookAppointment);
router.get('/patient/:identifier', verifyPatientSelf, getPatientAppointments);
router.put('/:id/reschedule', verifyAppointmentAccess({ patient: true, doctor: false }), verifyRole('patient'), rescheduleAppointment);
router.put('/:id/cancel', verifyAppointmentAccess({ patient: true, doctor: false }), verifyRole('patient'), cancelAppointment);

<!-- Doctor Clinical & Queue Lifecycle -->
router.get('/', requireAuth, verifyRole('doctor'), getDoctorAppointments);
router.get('/doctor/:doctorId', verifyDoctorSelf, verifyRole('doctor'), getDoctorAppointments);
router.patch('/:id/consultation', verifyAppointmentAccess({ patient: false, doctor: true }), verifyRole('doctor'), updateConsultationStatus);
router.get('/doctor/:doctorId/analytics', verifyDoctorSelf, verifyRole('doctor'), getDoctorAnalytics);

/* ── Digital E-Prescriptions (Hospital-Branded) ── */
router.post('/prescriptions', verifyDoctorBody, verifyAppointmentAccess({ patient: false, doctor: true }), verifyRole('doctor'), createPrescription);
router.get('/prescriptions/patient/:patientId', verifyPatientSelf, verifyRole('patient'), getPatientPrescriptions);

/* ── Secure Patient Health Records & Reports Hub (Multer upload support) ── */
router.post('/records', upload.single('file'), verifyPatientBody, verifyRole('patient'), uploadMedicalRecord);
router.get('/records/patient/:patientId', verifyPatientSelf, verifyRole('patient'), getPatientMedicalRecords);
router.get('/records/doctor/:doctorId', verifyDoctorSelf, verifyRole('doctor'), getDoctorPatientRecords);

/* ── Maintenance ── */
router.get('/missed', verifyAdmin, verifyRole('admin'), checkMissedAppointments);

module.exports = router;