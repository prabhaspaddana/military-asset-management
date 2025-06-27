const Assignment = require('../models/Assignment');
const Asset = require('../models/Asset');
const User = require('../models/User');
const Base = require('../models/Base');
const { logCustomEvent } = require('../middleware/auditMiddleware');

// Generate unique assignment ID
const generateAssignmentId = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `AS-${timestamp}-${random}`;
};

// Create new assignment
const createAssignment = async (req, res) => {
  try {
    const {
      asset,
      assignedTo,
      expectedReturnDate,
      purpose,
      mission,
      condition,
      notes
    } = req.body;

    const user = req.user;

    // Validate asset exists and is available
    const assetDoc = await Asset.findById(asset).populate('currentBase', 'name');
    if (!assetDoc) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    if (assetDoc.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Asset is not available for assignment'
      });
    }

    // Validate base access
    if (user.role !== 'admin' && assetDoc.currentBase._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this asset'
      });
    }

    // Validate assigned user exists and is at the same base
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found'
      });
    }

    if (user.role !== 'admin' && assignedUser.base.toString() !== user.base.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign asset to user from different base'
      });
    }

    const assignment = new Assignment({
      assignmentId: generateAssignmentId(),
      asset,
      assignedTo,
      assignedBy: user.id,
      base: assetDoc.currentBase._id,
      assignmentDate: new Date(),
      expectedReturnDate,
      purpose,
      mission,
      condition: {
        assigned: condition.assigned || 'good'
      },
      notes,
      status: 'active'
    });

    await assignment.save();

    // Update asset status
    await Asset.findByIdAndUpdate(asset, {
      status: 'assigned',
      assignedTo: assignedTo
    });

    // Log the assignment
    await logCustomEvent(req, 'asset_assigned', 'assignment', assignment._id, {
      asset: assetDoc.assetId,
      assignedTo: assignedUser.name,
      base: assetDoc.currentBase.name,
      purpose
    });

    res.status(201).json({
      success: true,
      message: 'Asset assigned successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Create Assignment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating assignment',
      error: error.message
    });
  }
};

// Get all assignments with filters
const getAssignments = async (req, res) => {
  try {
    const {
      baseId,
      status,
      assignedTo,
      assetType,
      startDate,
      endDate,
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

    // Assigned to filter
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Date filter
    if (startDate && endDate) {
      query.assignmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip = (page - 1) * limit;

    const assignments = await Assignment.find(query)
      .populate('asset', 'assetId name type category')
      .populate('assignedTo', 'name rank department')
      .populate('assignedBy', 'name rank')
      .populate('base', 'name')
      .sort({ assignmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Assignment.countDocuments(query);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get Assignments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments',
      error: error.message
    });
  }
};

// Get assignment by ID
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const assignment = await Assignment.findById(id)
      .populate('asset', 'assetId name type category specifications')
      .populate('assignedTo', 'name rank department contact')
      .populate('assignedBy', 'name rank')
      .populate('base', 'name location');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check access permissions
    if (user.role !== 'admin' && assignment.base._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assignment'
      });
    }

    res.json({
      success: true,
      data: assignment
    });

  } catch (error) {
    console.error('Get Assignment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error: error.message
    });
  }
};

// Return asset
const returnAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualReturnDate, condition, notes } = req.body;
    const user = req.user;

    const assignment = await Assignment.findById(id)
      .populate('asset', 'assetId name currentBase')
      .populate('base', 'name');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && assignment.base._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assignment'
      });
    }

    if (assignment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Assignment is not active'
      });
    }

    // Update assignment
    assignment.status = 'returned';
    assignment.actualReturnDate = actualReturnDate || new Date();
    assignment.condition.returned = condition.returned || 'good';
    assignment.notes = notes || assignment.notes;

    await assignment.save();

    // Update asset status
    await Asset.findByIdAndUpdate(assignment.asset._id, {
      status: 'available',
      assignedTo: null
    });

    // Log the return
    await logCustomEvent(req, 'asset_returned', 'assignment', assignment._id, {
      asset: assignment.asset.assetId,
      base: assignment.base.name,
      condition: assignment.condition.returned
    });

    res.json({
      success: true,
      message: 'Asset returned successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Return Asset Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning asset',
      error: error.message
    });
  }
};

// Mark asset as expended
const expendAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, location, mission, witness } = req.body;
    const user = req.user;

    const assignment = await Assignment.findById(id)
      .populate('asset', 'assetId name currentBase')
      .populate('base', 'name');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && assignment.base._id.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assignment'
      });
    }

    if (assignment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Assignment is not active'
      });
    }

    // Update assignment
    assignment.status = 'expended';
    assignment.expenditure = {
      isExpended: true,
      expendedDate: new Date(),
      expendedBy: user.id,
      reason,
      location,
      mission,
      witness
    };

    await assignment.save();

    // Update asset status
    await Asset.findByIdAndUpdate(assignment.asset._id, {
      status: 'expended'
    });

    // Log the expenditure
    await logCustomEvent(req, 'asset_expended', 'assignment', assignment._id, {
      asset: assignment.asset.assetId,
      base: assignment.base.name,
      reason,
      location,
      mission
    });

    res.json({
      success: true,
      message: 'Asset marked as expended successfully',
      data: assignment
    });

  } catch (error) {
    console.error('Expend Asset Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking asset as expended',
      error: error.message
    });
  }
};

// Update assignment
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check permissions
    if (user.role !== 'admin' && assignment.base.toString() !== user.base.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assignment'
      });
    }

    // Only allow updates if assignment is active
    if (assignment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update assignment that is not active'
      });
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('asset', 'assetId name');

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: updatedAssignment
    });

  } catch (error) {
    console.error('Update Assignment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating assignment',
      error: error.message
    });
  }
};

// Get available assets for assignment
const getAvailableAssets = async (req, res) => {
  try {
    const { baseId, assetType, category } = req.query;
    const user = req.user;

    let query = {
      status: 'available'
    };

    // Base filter
    if (user.role !== 'admin') {
      query.currentBase = user.base;
    } else if (baseId) {
      query.currentBase = baseId;
    }

    // Asset type filter
    if (assetType) {
      query.type = assetType;
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    const assets = await Asset.find(query)
      .select('assetId name type category specifications')
      .populate('currentBase', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: assets
    });

  } catch (error) {
    console.error('Get Available Assets Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available assets',
      error: error.message
    });
  }
};

// Get users for assignment
const getUsersForAssignment = async (req, res) => {
  try {
    const { baseId } = req.query;
    const user = req.user;

    let query = {
      status: 'active'
    };

    // Base filter
    if (user.role !== 'admin') {
      query.base = user.base;
    } else if (baseId) {
      query.base = baseId;
    }

    const users = await User.find(query)
      .select('name rank department contact')
      .populate('base', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  returnAsset,
  expendAsset,
  updateAssignment,
  getAvailableAssets,
  getUsersForAssignment
}; 