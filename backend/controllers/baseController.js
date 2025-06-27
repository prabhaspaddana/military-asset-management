const Base = require('../models/Base');

exports.createBase = async (req, res) => {
  try {
    const base = await Base.create(req.body);
    res.status(201).json({ success: true, data: base });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getBases = async (req, res) => {
  try {
    const bases = await Base.find();
    res.json({ success: true, data: bases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
