const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Register User
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if this is the first user to make them ADMIN, otherwise respect req.body.role or default to USER
    const userCount = await User.countDocuments();
    let role = 'USER';
    if (userCount === 0) {
      role = 'ADMIN';
    } else if (req.body.role && ['USER', 'ADMIN'].includes(req.body.role)) {
      role = req.body.role;
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      role,
    });

    await user.save();

    // Create audit log for the auto-login that follows registration
    await AuditLog.create({
      userId: user._id,
      username: user.username,
      action: 'LOGIN',
      description: 'User registered and logged in',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      // Create audit log for failed login attempt
      await AuditLog.create({
        userId: user._id,
        username: user.username,
        action: 'FAILED_LOGIN',
        description: 'Failed login attempt: Account suspended/deactivated',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact the administrator.' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      // Create audit log for failed login attempt
      await AuditLog.create({
        userId: user._id,
        username: user.username,
        action: 'FAILED_LOGIN',
        description: 'Failed login attempt: incorrect password',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create audit log for login
    await AuditLog.create({
      userId: user._id,
      username: user.username,
      action: 'LOGIN',
      description: 'User logged in',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Logout User
exports.logout = async (req, res) => {
  try {
    // Create audit log for logout
    await AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      action: 'LOGOUT',
      description: 'User logged out',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ message: 'User logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Forgot Password - Request Reset Token
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    // Generate random reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Log the reset token in console for development/test purposes
    console.log('\n========================================');
    console.log(`[PASSWORD RESET REQUEST] for user: ${user.username}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log('========================================\n');

    res.json({
      message: 'Password reset token generated. For development, copy it from the server console logs.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Audit Log for password update/reset
    await AuditLog.create({
      userId: user._id,
      username: user.username,
      action: 'UPDATE',
      description: 'User reset password via forgot password link',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
