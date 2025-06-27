const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test server working!' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 5000;

// Connect to DB first
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Test server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
}); 