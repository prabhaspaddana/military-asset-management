const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  assignmentId: {
    type: String,
    required: true,
    unique: true
  },
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },
  assignmentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedReturnDate: Date,
  actualReturnDate: Date,
  status: {
    type: String,
    enum: ['active', 'returned', 'expended', 'lost', 'damaged'],
    default: 'active'
  },
  purpose: {
    type: String,
    required: true
  },
  mission: {
    name: String,
    code: String,
    location: String
  },
  condition: {
    assigned: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      required: true
    },
    returned: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'damaged', 'destroyed']
    }
  },
  notes: String,
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  expenditure: {
    isExpended: { type: Boolean, default: false },
    expendedDate: Date,
    expendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    location: String,
    mission: String,
    witness: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  maintenance: [{
    date: Date,
    description: String,
    cost: Number,
    performedBy: String
  }]
}, { timestamps: true });

// Index for efficient queries
assignmentSchema.index({ assignmentId: 1 });
assignmentSchema.index({ asset: 1, status: 1 });
assignmentSchema.index({ assignedTo: 1, status: 1 });
assignmentSchema.index({ base: 1, assignmentDate: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema); 