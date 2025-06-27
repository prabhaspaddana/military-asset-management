const Transfer = require('../models/Transfer');
const Asset = require('../models/Asset');
const Base = require('../models/Base');
const { logCustomEvent } = require('../middleware/auditMiddleware');

// Generate unique transfer ID
const generateTransferId = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `TR-${timestamp}-${random}`;
};

// Create new transfer request
const createTransfer = async (req, res) => {
  try {
    const {
      fromBase,
      toBase,
      assets,
      transportDetails,
      securityClearance,
      reason,
      priority,
      notes
    } = req.body;

    const user = req.user;

    // Validate base access
    if (user.role !== 'admin' && user.base.toString() !== fromBase) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this base'
      });
    }

    // Validate assets exist and are available
    const assetIds = assets.map(asset => asset.asset);
    const existingAssets = await Asset.find({
      _id: { $in: assetIds },
      currentBase: fromBase,
      status: 'available'
    });

    if (existingAssets.length !== assetIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some assets are not available for transfer'
      });
    }

    // Add asset details to transfer
    const transferAssets = assets.map(asset => {
      const existingAsset = existingAssets.find(a => a._id.toString() === asset.asset);
      return {
        ...asset,
        assetId: existingAsset.assetId,
        name: existingAsset.name,
        type: existingAsset.type
      };
    });

    const transfer = new Transfer({
      transferId: generateTransferId(),
      fromBase,
      toBase,
      assets: transferAssets,
      requestedBy: user.id,
      transportDetails,
      securityClearance,
      reason,
      priority: priority || 'medium',
      notes,
      status: 'pending',
      timeline: [{
        action: 'Transfer requested',
        timestamp: new Date(),
        user: user.id,
        notes: 'Transfer request created'
      }]
    });

    await transfer.save();

    // Log the transfer request
    await logCustomEvent(req, 'transfer_requested', 'transfer', transfer._id, {
      fromBase,
      toBase,
      assetCount: assets.length,
      reason
    });

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: transfer
    });

  } catch (error) {
    console.error('Create Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating transfer request',
      error: error.message
    });
  }
};

// Get all transfers with filters
const getTransfers = async (req, res) => {
  try {
    const {
      baseId,
      status,
      startDate,
      endDate,
      priority,
      page = 1,
      limit = 10
    } = req.query;

    const user = req.user;
    let query = {};

    // Base filter based on user role
    if (user.role !== 'admin') {
      query.$or = [
        { fromBase: user.base },
        { toBase: user.base }
      ];
    } else if (baseId) {
      query.$or = [
        { fromBase: baseId },
        { toBase: baseId }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Date filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Priority filter
    if (priority) {
      query.priority = priority;
    }

    const skip = (page - 1) * limit;

    const transfers = await Transfer.find(query)
      .populate('fromBase toBase', 'name location.city location.state')
      .populate('requestedBy approvedBy', 'name rank')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transfer.countDocuments(query);

    res.json({
      success: true,
      data: transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Transfers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transfers',
      error: error.message
    });
  }
};

// Get transfer by ID
const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const transfer = await Transfer.findById(id)
      .populate('fromBase toBase', 'name location.city location.state')
      .populate('requestedBy approvedBy', 'name rank')
      .populate('assets.asset', 'assetId name type specifications');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    // Check access permissions
    if (user.role !== 'admin' && 
        transfer.fromBase._id.toString() !== user.base.toString() &&
        transfer.toBase._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this transfer'
      });
    }

    res.json({
      success: true,
      data: transfer
    });

  } catch (error) {
    console.error('Get Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transfer',
      error: error.message
    });
  }
};

// Approve transfer
const approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const user = req.user;

    const transfer = await Transfer.findById(id)
      .populate('fromBase toBase', 'name');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    // Check permissions
    if (!['admin', 'commander'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to approve transfers'
      });
    }

    // Check base access
    if (user.role !== 'admin' && 
        transfer.fromBase._id.toString() !== user.base.toString() &&
        transfer.toBase._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this transfer'
      });
    }

    const oldStatus = transfer.status;
    transfer.status = status;
    transfer.approvedBy = user.id;
    transfer.notes = notes || transfer.notes;

    // Add to timeline
    transfer.timeline.push({
      action: `Transfer ${status}`,
      timestamp: new Date(),
      user: user.id,
      notes: notes || `Transfer ${status} by ${user.name}`
    });

    await transfer.save();

    // Log the approval
    await logCustomEvent(req, 'transfer_approved', 'transfer', transfer._id, {
      oldStatus,
      newStatus: status,
      fromBase: transfer.fromBase.name,
      toBase: transfer.toBase.name
    });

    res.json({
      success: true,
      message: 'Transfer status updated successfully',
      data: transfer
    });

  } catch (error) {
    console.error('Approve Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving transfer',
      error: error.message
    });
  }
};

// Complete transfer and move assets
const completeTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualArrival, notes } = req.body;
    const user = req.user;

    const transfer = await Transfer.findById(id)
      .populate('fromBase toBase', 'name');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    // Check permissions
    if (!['admin', 'commander'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to complete transfers'
      });
    }

    // Check base access
    if (user.role !== 'admin' && 
        transfer.toBase._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this transfer'
      });
    }

    if (transfer.status !== 'in-transit') {
      return res.status(400).json({
        success: false,
        message: 'Transfer must be in-transit to complete'
      });
    }

    // Update transfer status
    transfer.status = 'completed';
    transfer.transportDetails.actualArrival = actualArrival || new Date();
    transfer.notes = notes || transfer.notes;

    // Add to timeline
    transfer.timeline.push({
      action: 'Transfer completed',
      timestamp: new Date(),
      user: user.id,
      notes: notes || 'Transfer completed and assets received'
    });

    await transfer.save();

    // Move assets to destination base
    const assetIds = transfer.assets.map(asset => asset.asset);
    await Asset.updateMany(
      { _id: { $in: assetIds } },
      { 
        currentBase: transfer.toBase._id,
        status: 'available'
      }
    );

    // Log the completion
    await logCustomEvent(req, 'transfer_completed', 'transfer', transfer._id, {
      fromBase: transfer.fromBase.name,
      toBase: transfer.toBase.name,
      assetCount: transfer.assets.length,
      actualArrival: transfer.transportDetails.actualArrival
    });

    res.json({
      success: true,
      message: 'Transfer completed successfully',
      data: transfer
    });

  } catch (error) {
    console.error('Complete Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing transfer',
      error: error.message
    });
  }
};

// Update transfer
const updateTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;

    const transfer = await Transfer.findById(id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && 
        transfer.fromBase.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this transfer'
      });
    }

    // Only allow updates if transfer is pending
    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update transfer that is not pending'
      });
    }

    const updatedTransfer = await Transfer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('fromBase toBase', 'name');

    res.json({
      success: true,
      message: 'Transfer updated successfully',
      data: updatedTransfer
    });

  } catch (error) {
    console.error('Update Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transfer',
      error: error.message
    });
  }
};

// Cancel transfer
const cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    const transfer = await Transfer.findById(id)
      .populate('fromBase toBase', 'name');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    // Check permissions
    if (!['admin', 'commander'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to cancel transfers'
      });
    }

    // Check base access
    if (user.role !== 'admin' && 
        transfer.fromBase._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this transfer'
      });
    }

    if (!['pending', 'approved'].includes(transfer.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel transfer that is in progress or completed'
      });
    }

    transfer.status = 'cancelled';
    transfer.notes = reason || transfer.notes;

    // Add to timeline
    transfer.timeline.push({
      action: 'Transfer cancelled',
      timestamp: new Date(),
      user: user.id,
      notes: reason || 'Transfer cancelled'
    });

    await transfer.save();

    res.json({
      success: true,
      message: 'Transfer cancelled successfully',
      data: transfer
    });

  } catch (error) {
    console.error('Cancel Transfer Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling transfer',
      error: error.message
    });
  }
};

module.exports = {
  createTransfer,
  getTransfers,
  getTransferById,
  approveTransfer,
  completeTransfer,
  updateTransfer,
  cancelTransfer
}; 