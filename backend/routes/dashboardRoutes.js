const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { hasPermission } = require('../middleware/rbacMiddleware');
const { logDataAccess } = require('../middleware/auditMiddleware');
const {
  getDashboardMetrics,
  getMovementBreakdown,
  getBaseList
} = require('../controllers/dashboardController');

// Get dashboard metrics
router.get('/metrics',
  protect,
  hasPermission('view_dashboard'),
  logDataAccess('dashboard'),
  getDashboardMetrics
);

// Get movement breakdown
router.get('/movement-breakdown',
  protect,
  hasPermission('view_dashboard'),
  logDataAccess('dashboard'),
  getMovementBreakdown
);

// Get base list for filters
router.get('/bases',
  protect,
  hasPermission('view_dashboard'),
  logDataAccess('base'),
  getBaseList
);

module.exports = router; 