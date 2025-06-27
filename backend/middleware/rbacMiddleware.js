const User = require('../models/User');

// Check if user has specific permission
const hasPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Account is not active' });
      }

      if (!user.permissions.includes(permission)) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: permission,
          userPermissions: user.permissions
        });
      }

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

// Check if user has any of the specified permissions
const hasAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Account is not active' });
      }

      const hasPermission = permissions.some(permission => 
        user.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: permissions,
          userPermissions: user.permissions
        });
      }

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

// Check if user has all specified permissions
const hasAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Account is not active' });
      }

      const hasAllPermissions = permissions.every(permission => 
        user.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: permissions,
          userPermissions: user.permissions
        });
      }

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

// Check if user can access base-specific data
const canAccessBase = (baseIdParam = 'baseId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Admin can access all bases
      if (user.role === 'admin') {
        return next();
      }

      const requestedBaseId = req.params[baseIdParam] || req.body.baseId || req.query.baseId;
      
      if (!requestedBaseId) {
        return res.status(400).json({ message: 'Base ID required' });
      }

      // Commander can only access their assigned base
      if (user.role === 'commander' && user.base.toString() !== requestedBaseId) {
        return res.status(403).json({ message: 'Access denied to this base' });
      }

      // Officer can only access their assigned base
      if (user.role === 'officer' && user.base.toString() !== requestedBaseId) {
        return res.status(403).json({ message: 'Access denied to this base' });
      }

      next();
    } catch (error) {
      console.error('Base Access Middleware Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

// Role-based middleware
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ message: 'Account is not active' });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ 
          message: 'Insufficient role privileges',
          required: roles,
          userRole: user.role
        });
      }

      next();
    } catch (error) {
      console.error('Role Middleware Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessBase,
  requireRole
}; 