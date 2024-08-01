const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { User, Admin, UserAdditional, Booking, Host, Car, Brand, Pricing, Listing, CarAdditional, Tax, Device, Feature } = require('../Models');
const path = require('path');
const uuid = require('uuid');
const { sendOTP, generateOTP, authAdmin, client } = require('../Controller/adminController');
const fs = require('fs');
const router = express.Router();
const chatController = require('../Controller/chatController');
const { viewSupportTickets, replyToSupportTicket, escalateSupportTicket, resolveSupportTicket, viewSupportChats } = require('../Controller/supportController');
const {createBlog, updateBlog, deleteBlog, getAllBlogs, getBlogById} = require('../Controller/blogController')
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csv = require('csv-parser');
const multerS3 = require('multer-s3');
const s3 = require('../s3Config');

// Set up multer storage with S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'spintrip-bucket',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `brand/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  })
});
const blogImageStorage = multerS3({
  s3: s3,
  bucket: 'spintrip-bucket',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = `blogImage_${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, `blog/${fileName}`);
  }
});
const upload1 = multer({ storage: blogImageStorage });

// Initialize CSV writer
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const csvFilePath = path.join(dataDir, 'brands.csv');
const csvWriter = createCsvWriter({
  path: csvFilePath,
  header: [
    { id: 'brand', title: 'Brand' },
    { id: 'imagePath', title: 'ImagePath' }
  ],
  append: true // Append to the file instead of overwriting
});

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
    const { phone, password, securityQuestion } = req.body;
  
    try {
      const user = await User.findOne({ where: { phone } });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Update the Admin table with the user's ID and other properties
      const admin = await Admin.create({
        id: user.id, // Link to the user in the User table
        securityQuestion,
        timestamp: new Date(), // Set the current timestamp
        password: hashedPassword,
        UserId: user.id,
        role: 'Admin'
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
// Chat routes
router.get('/chat/all', chatController.getAllMessages);
router.post('/chat/flag/:messageId', chatController.flagMessage);
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

router.get('/cars/:id', authenticate, async (req, res) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.status(200).json({ car });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching car', error });
  }
});

router.put('/cars/:id', authenticate, async (req, res) => {
  try {
    const car = await Car.update(req.body, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Car updated', car });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating car', error });
  }
});

router.delete('/cars/:id', authenticate, async (req, res) => {
  try {
    await Car.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Car deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error deleting car', error });
  }
});

router.get('/users/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

router.put('/users/:id', authenticate, async (req, res) => {
  try {
    const user = await User.update(req.body, { where: { id: req.params.id } });
    res.status(200).json({ message: 'User updated', user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating user', error });
  }
});

router.delete('/users/:id', authenticate, async (req, res) => {
  try {
    await User.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error deleting user', error });
  }
});

router.get('/listings', authenticate, async (req, res) => {
  try {
    const listings = await Listing.findAll();
    res.status(200).json({ message: 'All available Listings', listings });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching listings', error });
  }
});

router.get('/listings/:id', authenticate, async (req, res) => {
  try {
    const listing = await Listing.findByPk(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    res.status(200).json({ listing });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching listing', error });
  }
});

router.put('/listings/:id', authenticate, async (req, res) => {
  try {
    const listing = await Listing.update(req.body, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Listing updated', listing });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating listing', error });
  }
});

router.delete('/listings/:id', authenticate, async (req, res) => {
  try {
    await Listing.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Listing deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error deleting listing', error });
  }
});
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

router.get('/bookings/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json({ booking });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching booking', error });
  }
});

router.put('/bookings/:id', authenticate, async (req, res) => {
  try {
    const booking = await Booking.update(req.body, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Booking updated', booking });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating booking', error });
  }
});

router.delete('/bookings/:id', authenticate, async (req, res) => {
  try {
    await Booking.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Booking deleted' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error deleting booking', error });
  }
});
//Get All Hosts
router.get('/hosts', authenticate, async (req, res) => {
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
router.get('/users', authenticate, async (req, res) => {
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
router.get('/pending-profile', authenticate, async (req, res) => {
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
          let aadharFile = files.filter(file => file.includes('aadharFile')).map(file => `${process.env.BASE_URL}/uploads/${userId}/${file}`);
          let dlFile = files.filter(file => file.includes('dlFile')).map(file => `${process.env.BASE_URL}/uploads/${userId}/${file}`);  
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
router.get('/pending-carprofile', authenticate, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    let pendingProfiles = await CarAdditional.findAll({
      where: { verification_status: 1 },    
    });
    if ( pendingProfiles.length === 0 ){
        res.status(200).json({ message: 'No car approval required'});
    }
    else{ 
      const carProfiles = await Promise.all(
      pendingProfiles.map(async (item) => {
        let id  = item.carid;
        console.log(id);
        let carid = id;
        let userFolder = path.join('./uploads/host/CarAdditional', carid );
        if (fs.existsSync(userFolder)){
          let files = fs.readdirSync(userFolder);
          if(files){
          let carImage_1 = files.filter(file => file.includes('carImage_1')).map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${carid}/${file}`);
          let carImage_2 = files.filter(file => file.includes('carImage_2')).map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${carid}/${file}`);  
          let carImage_3 = files.filter(file => file.includes('carImage_3')).map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${carid}/${file}`); 
          let carImage_4 = files.filter(file => file.includes('carImage_4')).map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${carid}/${file}`); 
          let carImage_5 = files.filter(file => file.includes('carImage_5')).map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${carid}/${file}`); 
          return { ...item.toJSON(), carImage_1: carImage_1[0], carImage_2: carImage_2[0], carImage_3: carImage_3[0],carImage_4: carImage_4[0],carImage_5: carImage_5[0] };
           }
          }
        return item.toJSON();
      }
      ));
         res.status(200).json({ carProfiles });
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
router.put('/approve-carprofile',authenticate, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    const carId = req.body.carId;
    await CarAdditional.update({ verification_status: 2 }, { where: { carid: carId } });
    res.status(200).json({ message: 'Car Profile approved successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error in approving Car profile', error });
  }
});
router.post('/new-brand', upload.single('carImage'), async (req, res) => {
  try {
    const { brand } = req.body;
    const carImage = req.file;

    if (!brand) {
      return res.status(400).json({ message: 'Brand is required' });
    }

    let imagePath;
    if (carImage) {
      imagePath = `https://spintrip-bucket.s3.amazonaws.com/${carImage.key}`;
    } else {
      imagePath = '';
    }

    let brands = [];

    if (fs.existsSync(csvFilePath)) {
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
      brands = csvContent.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const [brandField, imagePathField] = line.split(',');
          return { brand: brandField, imagePath: imagePathField };
        });
    }

    const brandIndex = brands.findIndex(b => b.brand === brand);
    if (brandIndex > -1) {
      brands[brandIndex].imagePath = imagePath;
    } else {
      brands.push({ brand, imagePath });
    }

    const csvLines = brands.map(b => `${b.brand},${b.imagePath}`).join('\n');
    fs.writeFileSync(csvFilePath, csvLines);

    res.status(200).json({ message: 'Brand added/updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error in creating/updating brand', error });
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
router.post('/tax', async (req, res) => {
  try{  
    const { GST, HostGST, TDS, Commission } = req.body;
  
    let tax = await Tax.create({
      GST: GST,
      HostGST: HostGST,
      TDS: TDS,
      Commission: Commission 
    }
    );
    res.status(200).json({ message: 'Tax Updated', tax });
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

router.post('/features', async (req, res) => {
  try{  
    const { featureName } = req.body;
    // const adminId = req.user.id;
    // const admin = await Admin.findByPk(adminId);
  
    // if (!admin) {
    //   return res.status(404).json({ message: 'Admin not found' });
    // }
    
    let id = uuid.v4();
    const past_feature = await Feature.findOne({ where: { featureName: featureName }});
    if(past_feature){
      return res.status(400).json({ message: 'Car feature already present' });
    }
    let feature = await Feature.create({
      id:id,
      featureName: featureName
    }, 
    );
    res.status(200).json({ message: 'Car feature added successfully', feature });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error adding features', error });
  }
});

router.get('/allfeatures', async (req, res) => {
  try {
    const features = await Feature.findAll();
    res.status(200).json(features);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching features', error });
  }
});

router.delete('/features/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const feature = await Feature.findOne({ where: { id: id }});
    if (!feature) {
      return res.status(404).json({ message: 'Feature not found' });
    }
    await feature.destroy();
    res.status(200).json({ message: 'Feature deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting feature', error });
  }
});

router.get('/device', async (req, res) => {
  const queryParams = req.query;
  try {
    // Create new device entry in the database
    const newDevice = await Device.create({
      deviceid: queryParams.id,
      lat: queryParams.lat,
      lng: queryParams.lng,
      speed: queryParams.speed,
      date: queryParams.date,
      time: queryParams.time,
    });

    console.log('Data saved to database successfully:', newDevice.toJSON());
    res.status(200).send('Payload saved successfully');
  } catch (error) {
    console.error('Error saving data to database:', error.message);
    res.status(500).send('Error saving data to database');
  }
});
router.get('/device/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const results = await Device.findAll({
      where: {
        deviceid: id,
      },
      order: [['createdAt', 'DESC']], 
      limit: 5,
    });

    if (results.length === 0) {
      return res.status(404).send('No data found for the provided id');
    }

    res.json(results);
  } catch (error) {
    console.error('Error retrieving data from database:', error.message);
    res.status(500).send('Error retrieving data from database');
  }
});
//Support
// View all support tickets
router.get('/support', viewSupportTickets);

// Reply to a support ticket
router.post('/support/reply', replyToSupportTicket);

// Escalate a support ticket
router.post('/support/escalate', escalateSupportTicket);

// Resolve a support ticket
router.post('/support/resolve', resolveSupportTicket);

router.post('/support/supportChat', viewSupportChats);

router.post('/createBlog', authenticate, upload1.fields([{ name: 'blogImage_1', maxCount: 1 },{ name: 'blogImage_2', maxCount: 1 }]), createBlog);

router.post('/updateBlog', authenticate, upload1.fields([{ name: 'blogImage_1', maxCount: 1 },{ name: 'blogImage_2', maxCount: 1 }]), updateBlog);

router.get('/deleteBlog/:id', authenticate, deleteBlog);
router.get('/getAllBlogs', getAllBlogs);
router.get('/getBlogById/:id', getBlogById);
module.exports = router;
