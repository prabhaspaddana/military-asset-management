const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { hasPermission, hasAnyPermission, requireRole } = require('../middleware/rbacMiddleware');
const { logAction, logDataAccess } = require('../middleware/auditMiddleware');
const {
  createTransfer,
  getTransfers,
  getTransferById,
  approveTransfer,
  completeTransfer,
  updateTransfer,
  cancelTransfer
} = require('../controllers/transferController');

// Create new transfer
router.post('/',
  protect,
  hasPermission('create_transfers'),
  logAction('transfer_requested', 'transfer'),
  createTransfer
);

// Get all transfers
router.get('/',
  protect,
  hasPermission('view_transfers'),
  logDataAccess('transfer'),
  getTransfers
);

// Get transfer by ID
router.get('/:id',
  protect,
  hasPermission('view_transfers'),
  logDataAccess('transfer'),
  getTransferById
);

// Approve transfer
router.patch('/:id/approve',
  protect,
  hasAnyPermission(['approve_transfers']),
  requireRole(['admin', 'commander']),
  logAction('transfer_approved', 'transfer'),
  approveTransfer
);

// Complete transfer
router.patch('/:id/complete',
  protect,
  hasAnyPermission(['approve_transfers']),
  requireRole(['admin', 'commander']),
  logAction('transfer_completed', 'transfer'),
  completeTransfer
);

// Update transfer
router.put('/:id',
  protect,
  hasPermission('create_transfers'),
  logAction('update', 'transfer'),
  updateTransfer
);

// Cancel transfer
router.patch('/:id/cancel',
  protect,
  hasAnyPermission(['approve_transfers']),
  requireRole(['admin', 'commander']),
  logAction('update', 'transfer'),
  cancelTransfer
);

module.exports = router; 