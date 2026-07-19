const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// Register route
router.post(
  '/register',
  [
    body('username', 'Username is required').trim().isLength({ min: 3 }),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  authController.register
);

// Login route
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  authController.login
);

// Logout route
router.post('/logout', auth, authController.logout);

// Get current user
router.get('/me', auth, authController.getCurrentUser);

// Forgot password route
router.post(
  '/forgot-password',
  [body('email', 'Please include a valid email').isEmail()],
  authController.forgotPassword
);

// Reset password route
router.post(
  '/reset-password/:token',
  [body('password', 'Password must be at least 6 characters').isLength({ min: 6 })],
  authController.resetPassword
);

module.exports = router;
