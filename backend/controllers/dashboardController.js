const Asset = require('../models/Asset');
const Purchase = require('../models/Purchase');
const Transfer = require('../models/Transfer');
const Transfer2 = require('../models/Transfer');
const Assignment = require('../models/Assignment');
const Base = require('../models/Base');

// Get dashboard metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const { baseId, startDate, endDate, assetType } = req.query;
    const user = req.user;

    // Build filter based on user role and permissions
    let baseFilter = {};
    if (user.role !== 'admin') {
      baseFilter = { currentBase: user.base };
    } else if (baseId) {
      baseFilter = { currentBase: baseId };
    }

    // Date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Asset type filter
    let assetTypeFilter = {};
    if (assetType) {
      assetTypeFilter = { type: assetType };
    }

    // Get current assets (closing balance)
    const closingBalance = await Asset.countDocuments({
      ...baseFilter,
      ...assetTypeFilter,
      status: { $nin: ['decommissioned', 'expended'] }
    });

    // Get opening balance (assets created before start date)
    let openingBalance = 0;
    if (startDate) {
      openingBalance = await Asset.countDocuments({
        ...baseFilter,
        ...assetTypeFilter,
        status: { $nin: ['decommissioned', 'expended'] },
        createdAt: { $lt: new Date(startDate) }
      });
    } else {
      // If no start date, opening balance is same as closing balance
      openingBalance = closingBalance;
    }

    // Get purchases in date range
    const purchases = await Purchase.aggregate([
      {
        $match: {
          ...dateFilter,
          ...(baseId ? { base: baseId } : {}),
          ...(user.role !== 'admin' ? { base: user.base } : {}),
          status: { $in: ['received', 'approved'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          ...(assetType ? { 'items.assetType': assetType } : {})
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.quantity' },
          totalCost: { $sum: '$items.totalCost' }
        }
      }
    ]);

    const purchaseQuantity = purchases.length > 0 ? purchases[0].totalQuantity : 0;
    const purchaseCost = purchases.length > 0 ? purchases[0].totalCost : 0;

    // Get transfers in
    const transfersIn = await Transfer.aggregate([
      {
        $match: {
          ...dateFilter,
          toBase: baseId || user.base,
          status: 'completed'
        }
      },
      {
        $unwind: '$assets'
      },
      {
        $match: {
          ...(assetType ? { 'assets.type': assetType } : {})
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$assets.quantity' }
        }
      }
    ]);

    const transferInQuantity = transfersIn.length > 0 ? transfersIn[0].totalQuantity : 0;

    // Get transfers out
    const transfersOut = await Transfer.aggregate([
      {
        $match: {
          ...dateFilter,
          fromBase: baseId || user.base,
          status: 'completed'
        }
      },
      {
        $unwind: '$assets'
      },
      {
        $match: {
          ...(assetType ? { 'assets.type': assetType } : {})
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$assets.quantity' }
        }
      }
    ]);

    const transferOutQuantity = transfersOut.length > 0 ? transfersOut[0].totalQuantity : 0;

    // Get assigned assets
    const assignedAssets = await Assignment.countDocuments({
      ...(baseId ? { base: baseId } : {}),
      ...(user.role !== 'admin' ? { base: user.base } : {}),
      status: 'active',
      ...dateFilter
    });

    // Get expended assets
    const expendedAssets = await Assignment.countDocuments({
      ...(baseId ? { base: baseId } : {}),
      ...(user.role !== 'admin' ? { base: user.base } : {}),
      'expenditure.isExpended': true,
      ...dateFilter
    });

    // Calculate net movement
    const netMovement = purchaseQuantity + transferInQuantity - transferOutQuantity;

    // Get asset distribution by type
    const assetDistribution = await Asset.aggregate([
      {
        $match: {
          ...baseFilter,
          status: { $nin: ['decommissioned', 'expended'] }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activities
    const recentActivities = await Assignment.find({
      ...(baseId ? { base: baseId } : {}),
      ...(user.role !== 'admin' ? { base: user.base } : {})
    })
    .populate('asset', 'name type')
    .populate('assignedTo', 'name rank')
    .sort({ createdAt: -1 })
    .limit(10);

    const metrics = {
      openingBalance,
      closingBalance,
      netMovement,
      purchases: {
        quantity: purchaseQuantity,
        cost: purchaseCost
      },
      transfersIn: transferInQuantity,
      transfersOut: transferOutQuantity,
      assignedAssets,
      expendedAssets,
      assetDistribution,
      recentActivities
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Dashboard Metrics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard metrics',
      error: error.message
    });
  }
};

// Get detailed movement breakdown
const getMovementBreakdown = async (req, res) => {
  try {
    const { baseId, startDate, endDate, assetType, movementType } = req.query;
    const user = req.user;

    let query = {};
    let baseFilter = {};

    if (user.role !== 'admin') {
      baseFilter = { base: user.base };
    } else if (baseId) {
      baseFilter = { base: baseId };
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let result = {};

    if (movementType === 'purchases' || !movementType) {
      const purchases = await Purchase.find({
        ...query,
        ...baseFilter,
        status: { $in: ['received', 'approved'] }
      })
      .populate('base', 'name')
      .populate('purchaseOrder.approvedBy', 'name rank')
      .sort({ 'purchaseOrder.date': -1 });

      result.purchases = purchases;
    }

    if (movementType === 'transfersIn' || !movementType) {
      const transfersIn = await Transfer.find({
        ...query,
        toBase: baseId || user.base,
        status: 'completed'
      })
      .populate('fromBase toBase', 'name')
      .populate('requestedBy approvedBy', 'name rank')
      .sort({ createdAt: -1 });

      result.transfersIn = transfersIn;
    }

    if (movementType === 'transfersOut' || !movementType) {
      const transfersOut = await Transfer.find({
        ...query,
        fromBase: baseId || user.base,
        status: 'completed'
      })
      .populate('fromBase toBase', 'name')
      .populate('requestedBy approvedBy', 'name rank')
      .sort({ createdAt: -1 });

      result.transfersOut = transfersOut;
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Movement Breakdown Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movement breakdown',
      error: error.message
    });
  }
};

// Get base list for filters
const getBaseList = async (req, res) => {
  try {
    const user = req.user;
    let bases;

    if (user.role === 'admin') {
      bases = await Base.find({ status: 'active' })
        .select('name location.city location.state')
        .sort({ name: 1 });
    } else {
      bases = await Base.findById(user.base)
        .select('name location.city location.state');
      bases = bases ? [bases] : [];
    }

    res.json({
      success: true,
      data: bases
    });

  } catch (error) {
    console.error('Base List Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching base list',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardMetrics,
  getMovementBreakdown,
  getBaseList
}; 