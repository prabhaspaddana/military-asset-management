const mongoose = require('mongoose');

const baseSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  location: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  commander: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  capacity: {
    vehicles: { type: Number, default: 0 },
    weapons: { type: Number, default: 0 },
    ammunition: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Base', baseSchema); 