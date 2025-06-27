const express = require('express');
const router = express.Router();
const { createBase, getBases } = require('../controllers/baseController');
const { protect } = require('../middleware/authMiddleware');

// Create a base (admin only, but you can relax this for now)
router.post('/', protect, createBase);

// Get all bases
router.get('/', protect, getBases);

module.exports = router;
