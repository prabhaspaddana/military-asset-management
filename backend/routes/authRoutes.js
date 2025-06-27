const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/profile', protect, (req, res) => {
    res.status(200).json({
        _id: req.user._id,
        name: req.user.name,
        role: req.user.role
    });
});


module.exports = router;
