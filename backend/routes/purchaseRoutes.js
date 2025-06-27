const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { hasPermission, hasAnyPermission, requireRole } = require('../middleware/rbacMiddleware');
const { logAction, logDataAccess } = require('../middleware/auditMiddleware');
const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  approvePurchase,
  receivePurchase,
  updatePurchase,
  deletePurchase
} = require('../controllers/purchaseController');

// Create new purchase
router.post('/',
  protect,
  hasPermission('create_purchases'),
  logAction('purchase_created', 'purchase'),
  createPurchase
);

// Get all purchases
router.get('/',
  protect,
  hasPermission('view_purchases'),
  logDataAccess('purchase'),
  getPurchases
);

// Get purchase by ID
router.get('/:id',
  protect,
  hasPermission('view_purchases'),
  logDataAccess('purchase'),
  getPurchaseById
);

// Approve purchase
router.patch('/:id/approve',
  protect,
  hasAnyPermission(['approve_purchases']),
  requireRole(['admin', 'commander']),
  logAction('purchase_approved', 'purchase'),
  approvePurchase
);

// Receive purchase
router.patch('/:id/receive',
  protect,
  hasAnyPermission(['approve_purchases']),
  requireRole(['admin', 'commander']),
  logAction('purchase_received', 'purchase'),
  receivePurchase
);

// Update purchase
router.put('/:id',
  protect,
  hasPermission('create_purchases'),
  logAction('update', 'purchase'),
  updatePurchase
);

// Delete purchase
router.delete('/:id',
  protect,
  hasPermission('system_admin'),
  requireRole(['admin']),
  logAction('delete', 'purchase'),
  deletePurchase
);

module.exports = router; 