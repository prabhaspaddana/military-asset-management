const mongoose = require('mongoose');

const assetSubSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  assetId: String,
  name: String,
  type: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const transferSchema = new mongoose.Schema({
  transferId: {
    type: String,
    required: true,
    unique: true
  },
  fromBase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },
  toBase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },
  assets: [assetSubSchema],
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'in-transit', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  transportDetails: {
    method: {
      type: String,
      enum: ['ground', 'air', 'sea'],
      required: true
    },
    carrier: String,
    trackingNumber: String,
    estimatedDeparture: Date,
    estimatedArrival: Date,
    actualDeparture: Date,
    actualArrival: Date
  },
  securityClearance: {
    required: { type: Boolean, default: false },
    level: {
      type: String,
      enum: ['confidential', 'secret', 'top-secret']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  reason: {
    type: String,
    required: true
  },
  notes: String,
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  timeline: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }]
}, { timestamps: true });

// Index for efficient queries
transferSchema.index({ transferId: 1 });
transferSchema.index({ fromBase: 1, toBase: 1 });
transferSchema.index({ status: 1, 'timeline.timestamp': -1 });
transferSchema.index({ requestedBy: 1 });

module.exports = mongoose.model('Transfer2', transferSchema, 'transfers2'); 