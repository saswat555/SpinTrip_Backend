const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { User, Admin } = require('../Models');

const router = express.Router();
const authAdmin = async (userId) => {
    try {
      const admin = await Admin.findOne({ where: { id: userId } });
      return admin !== null;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
  
  router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;
    
    try {
      const user = await User.findOne({ where: { email } });
    
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    
      // Authenticate the user
      req.user = user; // Attach the user to the request
  
      // Check if the authenticated user is an admin
      const isAdmin = await authAdmin(req.user.id);
      if (!isAdmin) {
        return res.status(403).json({ message: 'User is not an admin' });
      }
      console.log("lund")
      next(); // Move to the next middleware
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Other routes that require admin authentication

  
// Admin Signup
router.post('/signup', async (req, res) => {
    const { email, password, SecurityQuestion } = req.body;
  
    try {
      const user = await User.findOne({ where: { email } });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Update the Admin table with the user's ID and other properties
      const admin = await Admin.create({
        id: user.id, // Link to the user in the User table
        SecurityQuestion,
        timestamp: new Date(), // Set the current timestamp
        password: hashedPassword,
      });
  
      res.status(201).json({ message: 'Admin created', admin });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error creating admin' });
    }
  });
  
// Admin Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
