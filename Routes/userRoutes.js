// userRoutes.js
const express = require('express');
const { authenticate, generateToken } = require('../Middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { User } = require('../Models');

const router = express.Router();

router.post('/login', authenticate, (req, res) => {
    const { user } = req;
    const token = generateToken(user);
    return res.json({ user, token });
  });
router.get('/profile', (req, res) => {
  // Access user information from req.user and respond accordingly
  res.json({ message: 'User profile' });
});
router.post('/signup', async (req, res) => {
    const { email, password, role } = req.body;
  
    try {
      // Check if the provided role is valid
      if (!['user', 'host', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      let user;
  
      // Create user based on the role
      if (role === 'user') {
        user = await User.create({ email, password: hashedPassword });
      } else if (role === 'host') {
        user = await Host.create({ email, password: hashedPassword });
      } else if (role === 'admin') {
        user = await Admin.create({ email, password: hashedPassword });
      }
  
      // Generate JWT token
      const token = generateToken(user);
  
      // Respond with success message
      res.status(201).json({ message: 'User created', user, token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating user' });
    }
  });
module.exports = router;
