const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'create', 'read', 'update', 'delete',
      'purchase_created', 'purchase_approved', 'purchase_received',
      'transfer_requested', 'transfer_approved', 'transfer_completed',
      'asset_assigned', 'asset_returned', 'asset_expended',
      'base_created', 'base_updated', 'user_created', 'user_updated'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: ['user', 'base', 'asset', 'purchase', 'transfer', 'assignment', 'system', 'dashboard']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    changes: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  notes: String
}, { timestamps: true });

// Index for efficient queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ base: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema); 