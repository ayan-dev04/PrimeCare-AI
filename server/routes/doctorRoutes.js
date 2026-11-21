const express = require('express');
const router = express.Router();
const upload = require('../utils/uploadMiddleware');
const ctrl = require('../controllers/doctorController');
const {
    verifyDoctor,
    verifyDoctorSelf,
    verifyDoctorBody,
    verifyPatientSelf,
    verifyAppointmentAccess,
    verifyPrescriptionAccess,
    verifyLabReportAccess,
    verifyRecordAccess,
    verifyDoctorPatient,
    verifyDoctorUpload
} = require('../middleware/rbacMiddleware');
const { verifyRole } = require('../middleware/roleMiddleware');

router.get('/', verifyRole('doctor'), ctrl.getAllDoctors);
router.get('/department/:deptName', ctrl.getDoctorsByDepartment);
router.get('/smart/:deptName', ctrl.getSmartDoctorMatches);

router.put('/availability', verifyDoctor, verifyRole('doctor'), ctrl.updateAvailability);
router.put('/presence', verifyDoctorBody, verifyRole('doctor'), ctrl.updatePresence);
router.get('/appointments/:doctorId', verifyDoctorSelf, verifyRole('doctor'), ctrl.getDoctorAppointments);

router.post('/prescriptions', verifyDoctorBody, verifyAppointmentAccess({ patient: false, doctor: true }), verifyRole('doctor'), ctrl.createPrescription);
router.get('/prescriptions/doctor/:doctorId', verifyDoctorSelf, verifyRole('doctor'), ctrl.getDoctorPrescriptions);
router.get('/prescriptions/patient/:patientId', verifyPatientSelf, verifyRole('patient'), ctrl.getPatientPrescriptions);
router.get('/prescriptions/download/:id', verifyPrescriptionAccess, ctrl.downloadPrescriptionPdf);

router.post('/lab-reports', verifyDoctorBody, verifyAppointmentAccess({ patient: false, doctor: true }), verifyRole('doctor'), ctrl.createLabReport);
router.get('/lab-reports/doctor/:doctorId', verifyDoctorSelf, verifyRole('doctor'), ctrl.getDoctorLabReports);
router.get('/lab-reports/patient/:patientId', verifyPatientSelf, verifyRole('patient'), ctrl.getPatientLabReports);
router.get('/lab-reports/download/:id', verifyLabReportAccess, ctrl.downloadLabReport);

router.get('/files/doctor/:doctorId/patient/:patientId', verifyDoctorPatient, verifyRole('doctor'), ctrl.getPatientUploadedFiles);
router.get('/files/record/:recordId', verifyRecordAccess, verifyRole('doctor'), ctrl.getGuardedFile);
router.post('/records/doctor-upload/:doctorId', verifyDoctorUpload, upload.single('file'), verifyRole('doctor'), ctrl.finalizePatientRecordUpload);

router.get('/:id', ctrl.getDoctorById);

module.exports = router;