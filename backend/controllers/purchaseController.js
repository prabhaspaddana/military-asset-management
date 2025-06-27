const Purchase = require('../models/Purchase');
const Asset = require('../models/Asset');
const Base = require('../models/Base');
const { logCustomEvent } = require('../middleware/auditMiddleware');

// Generate unique purchase ID
const generatePurchaseId = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PO-${timestamp}-${random}`;
};

// Create new purchase
const createPurchase = async (req, res) => {
  try {
    const {
      base,
      items,
      supplier,
      purchaseOrder,
      notes
    } = req.body;

    // Validate base access
    if (req.user.role !== 'admin' && req.user.base.toString() !== base) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this base'
      });
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

    const purchase = new Purchase({
      purchaseId: generatePurchaseId(),
      base,
      items,
      supplier,
      purchaseOrder: {
        ...purchaseOrder,
        approvedBy: req.user.id
      },
      totalAmount,
      notes,
      status: 'pending'
    });

    await purchase.save();

    // Log the purchase creation
    await logCustomEvent(req, 'purchase_created', 'purchase', purchase._id, {
      base,
      totalAmount,
      itemCount: items.length
    });

    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: purchase
    });

  } catch (error) {
    console.error('Create Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating purchase',
      error: error.message
    });
  }
};

// Get all purchases with filters
const getPurchases = async (req, res) => {
  try {
    const {
      baseId,
      status,
      startDate,
      endDate,
      assetType,
      page = 1,
      limit = 10
    } = req.query;

    const user = req.user;
    let query = {};

    // Base filter
    if (user.role !== 'admin') {
      query.base = user.base;
    } else if (baseId) {
      query.base = baseId;
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Date filter
    if (startDate && endDate) {
      query['purchaseOrder.date'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Asset type filter
    if (assetType) {
      query['items.assetType'] = assetType;
    }

    const skip = (page - 1) * limit;

    const purchases = await Purchase.find(query)
      .populate('base', 'name location.city location.state')
      .populate('purchaseOrder.approvedBy', 'name rank')
      .sort({ 'purchaseOrder.date': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Purchase.countDocuments(query);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Purchases Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchases',
      error: error.message
    });
  }
};

// Get purchase by ID
const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const purchase = await Purchase.findById(id)
      .populate('base', 'name location.city location.state')
      .populate('purchaseOrder.approvedBy', 'name rank');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Check access permissions
    if (user.role !== 'admin' && purchase.base._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this purchase'
      });
    }

    res.json({
      success: true,
      data: purchase
    });

  } catch (error) {
    console.error('Get Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase',
      error: error.message
    });
  }
};

// Approve purchase
const approvePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = req.user;

    const purchase = await Purchase.findById(id)
      .populate('base', 'name');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Check permissions
    if (!['admin', 'commander'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to approve purchases'
      });
    }

    // Check base access
    if (user.role !== 'admin' && purchase.base._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this purchase'
      });
    }

    const oldStatus = purchase.status;
    purchase.status = status;
    purchase.notes = notes || purchase.notes;

    await purchase.save();

    // Log the approval
    await logCustomEvent(req, 'purchase_approved', 'purchase', purchase._id, {
      oldStatus,
      newStatus: status,
      base: purchase.base.name
    });

    res.json({
      success: true,
      message: 'Purchase status updated successfully',
      data: purchase
    });

  } catch (error) {
    console.error('Approve Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving purchase',
      error: error.message
    });
  }
};

// Mark purchase as received and create assets
const receivePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryDate, notes } = req.body;
    const user = req.user;

    const purchase = await Purchase.findById(id)
      .populate('base', 'name');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Check permissions
    if (!['admin', 'commander'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to receive purchases'
      });
    }

    // Check base access
    if (user.role !== 'admin' && purchase.base._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this purchase'
      });
    }

    if (purchase.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Purchase must be approved before receiving'
      });
    }

    // Update purchase status
    purchase.status = 'received';
    purchase.deliveryDate = deliveryDate || new Date();
    purchase.notes = notes || purchase.notes;

    await purchase.save();

    // Create assets for each item
    const createdAssets = [];
    for (const item of purchase.items) {
      for (let i = 0; i < item.quantity; i++) {
        const assetId = `${item.assetType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        const asset = new Asset({
          assetId,
          name: item.name,
          type: item.assetType,
          category: item.category,
          specifications: item.specifications,
          currentBase: purchase.base._id,
          status: 'available',
          purchaseInfo: {
            date: purchase.purchaseOrder.date,
            cost: item.unitCost,
            supplier: purchase.supplier.name,
            purchaseOrder: purchase.purchaseOrder.number
          }
        });

        await asset.save();
        createdAssets.push(asset);
      }
    }

    // Log the receipt
    await logCustomEvent(req, 'purchase_received', 'purchase', purchase._id, {
      base: purchase.base.name,
      assetCount: createdAssets.length,
      deliveryDate: purchase.deliveryDate
    });

    res.json({
      success: true,
      message: 'Purchase received and assets created successfully',
      data: {
        purchase,
        createdAssets: createdAssets.length
      }
    });

  } catch (error) {
    console.error('Receive Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error receiving purchase',
      error: error.message
    });
  }
};

// Update purchase
const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;

    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && purchase.base.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this purchase'
      });
    }

    // Only allow updates if purchase is pending
    if (purchase.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update purchase that is not pending'
      });
    }

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('base', 'name');

    res.json({
      success: true,
      message: 'Purchase updated successfully',
      data: updatedPurchase
    });

  } catch (error) {
    console.error('Update Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating purchase',
      error: error.message
    });
  }
};

// Delete purchase
const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const purchase = await Purchase.findById(id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Check permissions
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete purchases'
      });
    }

    // Only allow deletion if purchase is pending
    if (purchase.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete purchase that is not pending'
      });
    }

    await Purchase.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });

  } catch (error) {
    console.error('Delete Purchase Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting purchase',
      error: error.message
    });
  }
};

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseById,
  approvePurchase,
  receivePurchase,
  updatePurchase,
  deletePurchase
}; 