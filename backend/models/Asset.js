const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['vehicle', 'weapon', 'ammunition', 'equipment'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  specifications: {
    model: String,
    manufacturer: String,
    year: Number,
    serialNumber: String,
    caliber: String, // for weapons/ammunition
    capacity: Number, // for vehicles/equipment
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },
  currentBase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'assigned', 'maintenance', 'decommissioned', 'expended'],
    default: 'available'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  purchaseInfo: {
    date: Date,
    cost: Number,
    supplier: String,
    purchaseOrder: String
  },
  maintenanceHistory: [{
    date: Date,
    description: String,
    cost: Number,
    technician: String
  }],
  location: {
    building: String,
    room: String,
    rack: String
  }
}, { timestamps: true });

// Index for efficient queries
assetSchema.index({ assetId: 1 });
assetSchema.index({ type: 1, currentBase: 1 });
assetSchema.index({ status: 1 });

module.exports = mongoose.model('Asset', assetSchema); 