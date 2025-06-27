const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { hasPermission } = require('../middleware/rbacMiddleware');
const { logAction, logDataAccess } = require('../middleware/auditMiddleware');
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  returnAsset,
  expendAsset,
  updateAssignment,
  getAvailableAssets,
  getUsersForAssignment
} = require('../controllers/assignmentController');

// Create new assignment
router.post('/',
  protect,
  hasPermission('create_assignments'),
  logAction('asset_assigned', 'assignment'),
  createAssignment
);

// Get all assignments
router.get('/',
  protect,
  hasPermission('view_assignments'),
  logDataAccess('assignment'),
  getAssignments
);

// Get available assets for assignment (MUST come before /:id routes)
router.get('/assets/available',
  protect,
  hasPermission('view_assets'),
  logDataAccess('asset'),
  getAvailableAssets
);

// Get users for assignment (MUST come before /:id routes)
router.get('/users/available',
  protect,
  hasPermission('view_users'),
  logDataAccess('user'),
  getUsersForAssignment
);

// Get assignment by ID
router.get('/:id',
  protect,
  hasPermission('view_assignments'),
  logDataAccess('assignment'),
  getAssignmentById
);

// Return asset
router.patch('/:id/return',
  protect,
  hasPermission('manage_assignments'),
  logAction('asset_returned', 'assignment'),
  returnAsset
);

// Mark asset as expended
router.patch('/:id/expend',
  protect,
  hasPermission('manage_assignments'),
  logAction('asset_expended', 'assignment'),
  expendAsset
);

// Update assignment
router.put('/:id',
  protect,
  hasPermission('create_assignments'),
  logAction('update', 'assignment'),
  updateAssignment
);

module.exports = router; 