const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle user active status (Admin only)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Do not allow deactivating yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Admins cannot deactivate their own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    // Create Audit Log
    const statusText = user.isActive ? 'activated' : 'suspended';
    await AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      action: 'UPDATE',
      description: `Admin ${req.user.username} ${statusText} user account: ${user.username}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: `User status updated to ${statusText}`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user role (Admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Do not allow changing own role to prevent self-lockout
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Admins cannot demote or change their own role' });
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user.id,
      username: req.user.username,
      action: 'UPDATE',
      description: `Admin ${req.user.username} changed role of user ${user.username} from ${oldRole} to ${role}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: `User role updated to ${role}`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
