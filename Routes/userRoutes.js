// userRoutes.js
const express = require('express');
const { authenticate, generateToken } = require('../Middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { User, Car, UserAdditional } = require('../Models');

const router = express.Router();
const generateOTP = () => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  return otp;
};

const sendOTP = (phone, otp) => {
  // Replace this with a code to send OTP via SMS using a free SMS service for India
  // You'll need to use an external service or library to send SMS, like Twilio
  // Here, we'll simulate sending the OTP to the console for demonstration purposes
  console.log(`Sending OTP ${otp} to phone number ${phone}`);
};
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ where: { phone } });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Generate OTP
  const otp = generateOTP();

  // Send OTP to the user's phone
  sendOTP(phone, otp);
  await user.update({otp:otp})

  // Redirect to verify OTP route
  return res.json({ message: 'OTP sent successfully', redirectTo: '/verify-otp', phone, otp });
});

router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ where: { phone } })
  const fixed_otp = user.otp;
  if (fixed_otp === otp) {
    const user = await User.findOne({ where: { phone } });
    const token = generateToken(user);
    return res.json({ message: 'OTP verified successfully', user, token });
  } else {
    return res.status(401).json({ message: 'Invalid OTP' });
  }
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
    res.json({ phone: user.phone, role: user.id , additionalinfo: additionalinfo});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/signup', async (req, res) => {
  const { phone, password, role } = req.body;

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
      user = await User.create({ phone, password: hashedPassword });
    } else if (role === 'host') {
      user = await Host.create({ phone, password: hashedPassword });
    } else if (role === 'admin') {
      user = await Admin.create({ phone, password: hashedPassword });
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
