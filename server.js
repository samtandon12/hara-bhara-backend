const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  address: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'out-for-delivery', 'delivered'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// POST /save-user - Create or update user
app.post('/save-user', async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      // Update existing user
      existingUser.name = name;
      existingUser.address = address;
      await existingUser.save();
      return res.json({ message: 'User updated successfully', user: existingUser });
    }

    // Create new user
    const newUser = new User({ name, phone, address });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /get-user/:phone - Get user by phone
app.get('/get-user/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /create-order - Create new order
app.post('/create-order', async (req, res) => {
  try {
    const { name, phone, address, items, total } = req.body;

    if (!name || !phone || !address || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = new Order({
      name,
      phone,
      address,
      items,
      total
    });

    await order.save();
    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /orders - Get all orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /order/:id/status - Update order status
app.put('/order/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /order/:id - Delete order
app.delete('/order/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from public folder (must be after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all other routes (SPA fallback)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
