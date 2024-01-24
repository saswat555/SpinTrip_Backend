const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { User, Admin, UserAdditional, Booking, Host, Car, Brand, Pricing } = require('../Models');
const path = require('path');
const { sendOTP, generateOTP, authAdmin, client } = require('../Controller/adminController');
const fs = require('fs');
const router = express.Router();

//Login
  
  router.post('/login', async (req, res) => {
    try {
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error logging in', error });
  }
  });

//Verify-Otp
  router.post('/verify-otp', async (req, res) => {
    try {  
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
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error });
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
router.get('/cars', authenticate, async (req, res) => {
  try {  
  const adminId = req.user.id;
  const admin = await Admin.findByPk(adminId);

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  const cars = await Car.findAll();
  res.status(200).json({ "message": "All available cars", cars });
} catch (error) {
  console.log(error);
  res.status(500).json({ message: 'Error fetching cars', error });
}  
})

//Get All Bookings
router.get('/bookings', authenticate, async (req, res) => {
  try {  
  const adminId = req.user.id;
  const admin = await Admin.findByPk(adminId);

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  const bookings = await Booking.findAll();
  res.status(200).json({ "message": "All available Bookings", bookings });
} catch (error) {
  console.log(error);
  res.status(500).json({ message: 'Error fetching bookings', error });
}
})

//Get All Hosts
router.get('/hosts', async (req, res) => {
  try {  
  const adminId = req.user.id;
  const admin = await Admin.findByPk(adminId);

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  const hosts = await Host.findAll();
  res.status(200).json({ "message": "All available Hosts", hosts });
} catch (error) {
  console.log(error);
  res.status(500).json({ message: 'Error fetching host', error });
}  
});

//Get all users
router.get('/users', async (req, res) => {
  try {  
  const adminId = req.user.id;
  const admin = await Admin.findByPk(adminId);

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  const users = await User.findAll();
  res.status(200).json({ "message": "All available Users", users })
} catch (error) {
  console.log(error);
  res.status(500).json({ message: 'Error fetching user', error });
} 
});
router.get('/pending-verfication', authenticate, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    let pendingProfiles = await UserAdditional.findAll({
      where: { verification_status: 1 },    
    });
    if ( pendingProfiles.length === 0 ){
        res.status(200).json({ message: 'No user approval required'});
    }
    else{ 
      const updatedProfiles = await Promise.all(
      pendingProfiles.map(async (item) => {
        let id  = item.id;
        console.log(id);
        let userId = id;
        let userFolder = path.join('./uploads', userId );
        if (fs.existsSync(userFolder)){
          // List all files in the user's folder
          let files = fs.readdirSync(userFolder);
          if(files){
          // Filter and create URLs for Aadhar and DL files
          let aadharFile = files.filter(file => file.includes('aadharFile')).map(file => `http://spintrip.in/uploads/${userId}/${file}`);
          let dlFile = files.filter(file => file.includes('dlFile')).map(file => `http://spintrip.in/uploads/${userId}/${file}`);  
          console.log(aadharFile[0],dlFile);
          return { ...item.toJSON(), aadharFile: aadharFile[0], dlFile: dlFile[0] };
           }
          }
        return item.toJSON();
      }
      ));
         res.status(200).json({ updatedProfiles });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching pending profiles', error });
  }
});
router.put('/approve-profile',authenticate, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    const userId = req.body.userId;
    await UserAdditional.update({ verification_status: 2 }, { where: { id: userId } });
    res.status(200).json({ message: 'Profile approved successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error approving profile', error });
  }
});
router.put('/brand', authenticate, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    const { data } = req.body;
    const createdBrands = [];
    console.log(data); 
    data.forEach(async (item) => {  
    const { type, brand, carmodel, brand_value, base_price } = item;
    console.log(item);
    let brands = await Brand.create({
      type:type,
      brand:brand,
      carmodel:carmodel,
      brand_value:brand_value,
      base_price:base_price
    });
    createdBrands.push(brands);
    }); 
    res.status(200).json({ message: 'Car Brand and Value added successfully', createdBrands });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error adding Car Brand and value', error });
  }
});
router.get('/brand', authenticate, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    const brands = await Brand.findAll();
    res.status(200).json({ "message": "All available brands", brands })
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error adding Car Brand and value', error });
  }
});
router.put('/update_brand', authenticate, async (req, res) => {
try{  
  const { id, type, brand, carmodel, brand_value, base_price } = req.body;
  const adminId = req.user.id;
  const admin = await Admin.findByPk(adminId);

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  let brands = await Brand.update({
    brand_value:brand_value,
    base_price:base_price
  },
  { where: { id:id } }
  );
  res.status(200).json({ message: 'Car Brand and Value updated successfully', brands });
} catch (error) {
  console.log(error);
  res.status(500).json({ message: 'Error adding Car Brand and value', error });
}
});

router.get('/pricing', authenticate, async (req, res) => {
  const adminId = req.user.id;
  const admin = await Admin.findByPk(adminId);

  if (!admin) {
    return res.status(404).json({ message: 'Admin not found' });
  }
  const pricing = await Pricing.findAll();
  res.status(200).json({ "message": "Car pricing asscoiated", pricing })
});
module.exports = router;
