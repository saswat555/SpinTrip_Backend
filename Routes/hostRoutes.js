const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { Host, Car } = require('../Models');

const router = express.Router();

// Host Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const host = await Host.findOne({ where: { email } });

    if (!host) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, host.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: host.id, role: 'host' }, 'your_secret_key');
    res.json({ message: 'Host logged in', host, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Host Signup
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const host = await Host.create({
      email,
      password: hashedPassword,
      // Add other host properties here
    });

    const token = jwt.sign({ id: host.id, role: 'host' }, 'your_secret_key');
    res.status(201).json({ message: 'Host created', host, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating host' });
  }
});

// Host Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const hostId = req.user.id;
    const host = await Host.findByPk(hostId, {
      include: [{ model: Car }],
    });

    if (!host) {
      return res.status(404).json({ message: 'Host not found' });
    }

    res.json({ host });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
