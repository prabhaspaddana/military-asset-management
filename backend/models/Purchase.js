const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  purchaseId: {
    type: String,
    required: true,
    unique: true
  },
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },
  items: [{
    assetType: {
      type: String,
      enum: ['vehicle', 'weapon', 'ammunition', 'equipment'],
      required: true
    },
    category: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    specifications: {
      model: String,
      manufacturer: String,
      year: Number,
      serialNumber: String,
      caliber: String,
      capacity: Number,
      weight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number
      }
    }
  }],
  supplier: {
    name: { type: String, required: true },
    contact: {
      email: String,
      phone: String,
      address: String
    }
  },
  purchaseOrder: {
    number: { type: String, required: true },
    date: { type: Date, required: true },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'],
    default: 'pending'
  },
  deliveryDate: Date,
  notes: String,
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Index for efficient queries
purchaseSchema.index({ purchaseId: 1 });
purchaseSchema.index({ base: 1, 'purchaseOrder.date': -1 });
purchaseSchema.index({ status: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema); 