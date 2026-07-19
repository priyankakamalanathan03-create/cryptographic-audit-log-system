const express = require('express');
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// All user management routes require admin role
router.get('/', auth, authorize('ADMIN'), userController.getAllUsers);
router.patch('/:id/status', auth, authorize('ADMIN'), userController.toggleUserStatus);
router.patch('/:id/role', auth, authorize('ADMIN'), userController.updateUserRole);

module.exports = router;
