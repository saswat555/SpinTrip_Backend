// userRoutes.js
const express = require('express');
const { authenticate, generateToken } = require('../Middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { User, Car, UserAdditional } = require('../Models');

const router = express.Router();

router.post('/login', authenticate, async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  const token = generateToken(user);
  return res.json({ user, token });
});
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const additionalinfo = await UserAdditional.findByPk(userId)
    // You can include more fields as per your User model
    res.json({ email: user.email, role: user.id , additionalinfo: additionalinfo});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/signup', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Check if the provided role is valid
    if (!['user', 'host', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user;

    // Create user based on the role
    if (role === 'user') {
      user = await User.create({ email, password: hashedPassword });
    } else if (role === 'host') {
      user = await Host.create({ email, password: hashedPassword });
    } else if (role === 'admin') {
      user = await Admin.create({ email, password: hashedPassword });
    }

    UserAdditional.create({id:user.id});

    // Generate JWT token
    const token = generateToken(user.id);

    // Respond with success message
    res.status(201).json({ message: 'User created', user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.get('/cars', async (req, res) => {
  const cars = await Car.findAll();
  res.status(200).json({ "message": "All available cars", cars })
})
module.exports = router;
