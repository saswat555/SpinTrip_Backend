const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { User, Admin, UserAdditional, Booking, Host, Car } = require('../Models');
<<<<<<< HEAD

=======
const { sendOTP, generateOTP, authAdmin, client } = require('../Controller/adminController');
>>>>>>> c855601613ade90b52b20ae724a44859fd0304f9
const router = express.Router();

//Login
  
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

//Verify-Otp
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

//Get All Cars
router.get('/cars', async (req, res) => {
  const cars = await Car.findAll();
  res.status(200).json({ "message": "All available cars", cars })
})

//Get All Bookings
router.get('/bookings', async (req, res) => {
  const bookings = await Booking.findAll();
  res.status(200).json({ "message": "All available Bookings", bookings })
})

//Get All Hosts
router.get('/hosts', async (req, res) => {
  const hosts = await Host.findAll();
  res.status(200).json({ "message": "All available Hosts", hosts })
})

//Get all users
router.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.status(200).json({ "message": "All available Users", users })
})
router.get('/pending-verfication', async (req, res) => {
  try {
    let pendingProfiles = await UserAdditional.findAll({
      where: { status: 'Pending' },    
    });
    if ( pendingProfiles.length === 0 ){
        res.status(200).json({ message: 'No user approval required'});
    }
    else{  
    const elasticsearchQueries = pendingProfiles.map(profile => ({
      // index: 'profiles',
       id: profile.id.toString(), 
    }));
    const elasticsearchResults = await client.mget({ index: 'profiles', body: {
      ids: elasticsearchQueries.map(query => query.id),
    }, 
    });
    const combinedProfiles = pendingProfiles.map((profile, index) => ({
      ...profile.toJSON(),
      aadharFile: elasticsearchResults.docs[index]._source.aadharFilePath,
      dlFile: elasticsearchResults.docs[index]._source.dlFilePath,
    }));
    res.status(200).json({ combinedProfiles });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching pending profiles', error });
  }
})
router.put('/approve-profile', async (req, res) => {
  try {
    const userId = req.body.userId;
    await UserAdditional.update({ status: 'Approved' }, { where: { id: userId } });
    res.status(200).json({ message: 'Profile approved successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error approving profile', error });
  }
});

module.exports = router;
