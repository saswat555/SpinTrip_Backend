const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { User, Admin, UserAdditional } = require('../Models');

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
  
  router.post('/login', authenticate, async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    const token = jwt.sign({ id: user.id, role: 'admin' }, 'your_secret_key');
    return res.json({ user, token });
  });
  
  
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
    const additionalinfo = await UserAdditional.findByPk(adminId)

    res.json({ email: admin.email, securityQuestion: admin.SecurityQuestion, additionalinfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error });
  }
});


module.exports = router;
