const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Get user's own audit logs
router.get('/my-logs', auth, auditLogController.getMyAuditLogs);

// Get all audit logs (Admin only)
router.get('/all-logs', auth, authorize('ADMIN'), auditLogController.getAllAuditLogs);

// Get audit log statistics (Admin only)
router.get('/stats', auth, authorize('ADMIN'), auditLogController.getAuditLogStats);

// Verify all audit logs integrity (Admin only)
router.get('/verify', auth, authorize('ADMIN'), auditLogController.verifyAuditLogs);

// Get audit log by ID
router.get('/:id', auth, auditLogController.getAuditLogById);

module.exports = router;
