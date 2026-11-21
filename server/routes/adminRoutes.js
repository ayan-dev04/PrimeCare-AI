const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/adminController');

// All administrative endpoints protected by strict Admin RBAC middleware
router.use(verifyAdmin);

// Dashboard overview & analytics
router.get('/metrics', ctrl.getAdminDashboardMetrics);

// Doctors management (CRUD)
router.get('/doctors', ctrl.getAllDoctors);
router.post('/doctors', ctrl.createDoctor);
router.put('/doctors/:id', ctrl.updateDoctor);
router.delete('/doctors/:id', ctrl.deleteDoctor);

// User & Role management (view, edit details, role change, secure delete)
router.get('/users', ctrl.getAllUsers);
router.patch('/users/:id/details', ctrl.updateUserDetails);
router.patch('/users/:id/role', ctrl.updateUserRole);
router.delete('/users/:id', ctrl.deleteUser);

// Appointment management & override
router.get('/appointments', ctrl.getAllAppointments);
router.patch('/appointments/:id/override', ctrl.overrideAppointment);
router.delete('/appointments/:id', ctrl.deleteAppointment);

// System security audit trail & full JSON backup
router.get('/security-logs', ctrl.getSecurityLogs);
router.get('/backup', ctrl.triggerDatabaseBackup);

module.exports = router;
