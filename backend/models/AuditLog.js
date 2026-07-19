const mongoose = require('mongoose');
const crypto = require('crypto');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'FAILED_LOGIN'],
    },
    description: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    hash: {
      type: String,
    },
    previousHash: {
      type: String,
    },
  },
  {
    timestamps: false, // We only use the immutable timestamp field
  }
);

// Pre-save hook to calculate hash chaining
auditLogSchema.pre('save', async function (next) {
  try {
    const AuditLog = mongoose.model('AuditLog');
    
    // Lock the timestamp value to prevent any date mismatch
    if (!this.timestamp) {
      this.timestamp = new Date();
    }
    
    // Find the latest audit log entry (by timestamp and ID)
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1, _id: -1 });
    
    this.previousHash = lastLog ? lastLog.hash : '0';
    
    const timestampStr = this.timestamp.toISOString();
    
    // Create data string to hash
    const hashData = 
      this.userId.toString() +
      this.action +
      (this.description || '') +
      timestampStr +
      (this.ipAddress || '') +
      (this.userAgent || '') +
      this.previousHash;
      
    this.hash = crypto.createHash('sha256').update(hashData).digest('hex');
    next();
  } catch (error) {
    next(error);
  }
});

// Prevent updates (making logs immutable at application level)
auditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('Audit logs cannot be modified'));
});

auditLogSchema.pre('updateOne', function (next) {
  next(new Error('Audit logs cannot be modified'));
});

auditLogSchema.pre('updateMany', function (next) {
  next(new Error('Audit logs cannot be modified'));
});

auditLogSchema.pre('replaceOne', function (next) {
  next(new Error('Audit logs cannot be modified'));
});

// Prevent deletion
auditLogSchema.pre('findOneAndDelete', function (next) {
  next(new Error('Audit logs cannot be deleted'));
});

auditLogSchema.pre('deleteOne', { document: true, query: true }, function (next) {
  next(new Error('Audit logs cannot be deleted'));
});

auditLogSchema.pre('deleteMany', function (next) {
  next(new Error('Audit logs cannot be deleted'));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

