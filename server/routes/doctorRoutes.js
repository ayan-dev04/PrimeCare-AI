const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware');
const ctrl = require('../controllers/doctorController');
const { requireDoctor, verifyDoctor } = require('../middleware/rbacMiddleware');

const { updateAvailability } = ctrl;

router.get('/', ctrl.getAllDoctors);
router.get('/department/:deptName', ctrl.getDoctorsByDepartment);
router.get('/smart/:deptName', ctrl.getSmartDoctorMatches);

router.put('/availability', verifyDoctor, updateAvailability);
router.put('/presence', ctrl.updatePresence);
router.get('/appointments/:doctorId', ctrl.getDoctorAppointments);

router.post('/prescriptions', ctrl.createPrescription);
router.get('/prescriptions/doctor/:doctorId', ctrl.getDoctorPrescriptions);
router.get('/prescriptions/patient/:patientId', ctrl.getPatientPrescriptions);
router.get('/prescriptions/download/:id', ctrl.downloadPrescriptionPdf);

router.post('/lab-reports', requireDoctor, ctrl.createLabReport);
router.get('/lab-reports/doctor/:doctorId', ctrl.getDoctorLabReports);
router.get('/lab-reports/download/:id', ctrl.downloadLabReport);

router.get('/files/doctor/:doctorId/patient/:patientId', ctrl.getPatientUploadedFiles);
router.get('/files/record/:recordId', ctrl.getGuardedFile);
router.post('/records/doctor-upload/:doctorId', upload.single('file'), ctrl.finalizePatientRecordUpload);

router.get('/:id', ctrl.getDoctorById);

module.exports = router;