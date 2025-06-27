const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'commander', 'officer'],
    default: 'officer',
  },
  rank: {
    type: String,
    required: true
  },
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base'
  },
  department: {
    type: String,
    required: true
  },
  contact: {
    phone: String,
    extension: String
  },
  permissions: [{
    type: String,
    enum: [
      'view_dashboard', 'view_purchases', 'create_purchases', 'approve_purchases',
      'view_transfers', 'create_transfers', 'approve_transfers',
      'view_assignments', 'create_assignments', 'manage_assignments',
      'view_assets', 'create_assets', 'update_assets', 'delete_assets',
      'view_users', 'create_users', 'update_users', 'delete_users',
      'view_bases', 'create_bases', 'update_bases', 'delete_bases',
      'view_reports', 'export_data', 'system_admin'
    ]
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role') || this.isNew) {
    switch (this.role) {
      case 'admin':
        this.permissions = [
          'view_dashboard', 'view_purchases', 'create_purchases', 'approve_purchases',
          'view_transfers', 'create_transfers', 'approve_transfers',
          'view_assignments', 'create_assignments', 'manage_assignments',
          'view_assets', 'create_assets', 'update_assets', 'delete_assets',
          'view_users', 'create_users', 'update_users', 'delete_users',
          'view_bases', 'create_bases', 'update_bases', 'delete_bases',
          'view_reports', 'export_data', 'system_admin'
        ];
        break;
      case 'commander':
        this.permissions = [
          'view_dashboard', 'view_purchases', 'create_purchases', 'approve_purchases',
          'view_transfers', 'create_transfers', 'approve_transfers',
          'view_assignments', 'create_assignments', 'manage_assignments',
          'view_assets', 'create_assets', 'update_assets',
          'view_users', 'view_bases', 'view_reports', 'export_data'
        ];
        break;
      case 'officer':
        this.permissions = [
          'view_dashboard', 'view_purchases', 'create_purchases',
          'view_transfers', 'create_transfers',
          'view_assignments', 'create_assignments',
          'view_assets', 'view_reports'
        ];
        break;
    }
  }
  next();
});

userSchema.plugin(uniqueValidator, { message: '{PATH} must be unique.' });

module.exports = mongoose.model('User', userSchema);
