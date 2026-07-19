const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

// Get user's own audit logs
exports.getMyAuditLogs = async (req, res) => {
  try {
    const { action, startDate, endDate, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.user.id };

    if (action) {
      query.action = action;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'username email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all audit logs (Admin only)
exports.getAllAuditLogs = async (req, res) => {
  try {
    const { userId, search, action, startDate, endDate, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (userId) {
      query.userId = userId;
    } else if (search) {
      const User = require('../models/User');
      const users = await User.find({
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      });
      const userIds = users.map(u => u._id);
      query.userId = { $in: userIds };
    }

    if (action) {
      query.action = action;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'username email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create audit log entry (Internal use)
exports.createAuditLog = async (auditData) => {
  try {
    await AuditLog.create(auditData);
  } catch (error) {
    console.error('Error creating audit log:', error.message);
  }
};

// Get audit log by ID
exports.getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('userId', 'username email');

    if (!log) {
      return res.status(404).json({ message: 'Audit log not found' });
    }

    // Check if user has permission to view this log
    if (req.user.role !== 'ADMIN' && log.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get audit log statistics (Admin only)
exports.getAuditLogStats = async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalLogs = await AuditLog.countDocuments();

    res.json({
      totalLogs,
      actionStats: stats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify all audit logs integrity (Admin only)
exports.verifyAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: 1, _id: 1 });
    
    let expectedPreviousHash = '0';
    let tamperingDetected = false;
    let tamperedLog = null;
    let details = '';

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // 1. Verify previous hash link
      if (log.previousHash !== expectedPreviousHash) {
        tamperingDetected = true;
        tamperedLog = log;
        details = `Previous hash mismatch. Expected: ${expectedPreviousHash}, Found: ${log.previousHash}`;
        break;
      }

      // 2. Recompute hash
      const timestampStr = log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString();
      const hashData =
        log.userId.toString() +
        log.action +
        (log.description || '') +
        timestampStr +
        (log.ipAddress || '') +
        (log.userAgent || '') +
        log.previousHash;

      const recomputedHash = crypto
        .createHash('sha256')
        .update(hashData)
        .digest('hex');

      // 3. Verify current hash matches recomputed hash
      if (log.hash !== recomputedHash) {
        tamperingDetected = true;
        tamperedLog = log;
        details = `Hash content mismatch. Recomputed: ${recomputedHash}, Found: ${log.hash}`;
        break;
      }

      // Update expected previous hash for next log
      expectedPreviousHash = log.hash;
    }

    if (tamperingDetected) {
      return res.status(200).json({
        verified: false,
        message: `Tampering detected at log entry! ID: ${tamperedLog._id}, User: ${tamperedLog.username}, Action: ${tamperedLog.action}`,
        details,
        tamperedLog
      });
    }

    res.json({
      verified: true,
      message: 'Audit log integrity verified successfully. All logs are valid and the chain is unbroken.',
      totalLogsVerified: logs.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during verification', error: error.message });
  }
};
