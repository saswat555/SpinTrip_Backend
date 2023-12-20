const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { User, Admin, UserAdditional, Booking, Host } = require('../Models');

const router = express.Router();
const generateOTP = () => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  return otp;
};
const sendOTP = (phone, otp) => {
  console.log(`Sending OTP ${otp} to phone number ${phone}`);
};
const authAdmin = async (userId) => {
    try {
      const admin = await Admin.findOne({ where: { id: userId } });
      return admin !== null;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
  
  router.post('/login', async (req, res) => {
    const { phone } = req.body;
    const user = await User.findOne({ where: { phone } });
    const admin = await Admin.findOne({ where: { id: user.id } });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid phone number' });
    }
    const otp = generateOTP();
    sendOTP(phone, otp);
    await user.update({otp:otp})    
    return res.json({ message: 'OTP sent successfully', redirectTo: '/verify-otp', phone, otp });
  });
  router.post('/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    const user = await User.findOne({ where: { phone } })
    const fixed_otp = user.otp;
    if (fixed_otp === otp) {
      const user = await User.findOne({ where: { phone } });
      const token = jwt.sign({ id: user.id, role: 'admin' }, 'your_secret_key');
      return res.json({ message: 'OTP verified successfully', user, token });
    } else {
      return res.status(401).json({ message: 'Invalid OTP' });
    }
  });

// Admin Signup
router.post('/signup', async (req, res) => {
    const { phone, password, SecurityQuestion } = req.body;
  
    try {
      const user = await User.findOne({ where: { phone } });
  
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
        UserId: user.id
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

    res.json({ phone: admin.phone, securityQuestion: admin.SecurityQuestion, additionalinfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error });
  }
});
router.get('/cars', async (req, res) => {
  const cars = await Car.findAll();
  res.status(200).json({ "message": "All available cars", cars })
})
router.get('/bookings', async (req, res) => {
  const bookings = await Booking.findAll();
  res.status(200).json({ "message": "All available Bookings", bookings })
})
router.get('/hosts', async (req, res) => {
  const hosts = await Host.findAll();
  res.status(200).json({ "message": "All available Hosts", hosts })
})
router.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.status(200).json({ "message": "All available Users", users })
})


module.exports = router;
