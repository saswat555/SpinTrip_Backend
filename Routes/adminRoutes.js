const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { User, Admin, UserAdditional, Booking, Host, Car, Brand, Pricing, CarAdditional } = require('../Models');
const { sendOTP, generateOTP, authAdmin, client } = require('../Controller/adminController');
const router = express.Router();

const pricing = async ( car, carAdditional ) => {
  try {
    const currentYear = new Date().getFullYear();
    let brand = await Brand.findOne({
      where: { carmodel: car.carmodel, type: car.type, brand: car.brand },    
    });
    
    if(brand){
     brand_value = brand.brand_value;
     base_price = brand.base_price;
    }
    else{
      brand_value = 10;
      base_price = 100;
    }

    let val, horsePower;

    if( ( car.Registrationyear.substring(0, 4) < 2018) ){
      val = ( currentYear - car.Registrationyear.substring(0, 4) )* 3;
    }
    else{
      val = ( currentYear - car.Registrationyear.substring(0, 4) )* 1.5;
    }
    if( ( carAdditional.HorsePower <= 80 ) || ( !carAdditional.HorsePower ) ){
      horsePower = 0;
    }
    else if( ( carAdditional.HorsePower > 80 && carAdditional.HorsePower < 150 ) ){
      horsePower = 20;
    }
    else{
      horsePower = 30;
    }
    let Price;
    let Sevenseater;
    if(car.type === 'SUV'){
      Sevenseater = 30;
    }
    else{
      Sevenseater = 15;
    }
    if(car.type === 'Hatchback')
    {
    Price = brand_value + horsePower +
      3 * ( carAdditional.AC? 1 : 0 ) +  3 * (carAdditional.Musicsystem? 1 : 0) +  2 * (carAdditional.Autowindow? 1 : 0) +
      2 * (carAdditional.Sunroof? 1 : 0) +  2 * (carAdditional.touchScreen? 1 : 0)  +  15 * (carAdditional.Sevenseater? 1 : 0) +
      2 * (carAdditional.Reversecamera? 1 : 0) +  3 * (carAdditional.Transmission? 1 : 0) +  10 * (carAdditional.FuelType? 1 : 0) +
      2 *  (carAdditional.Airbags? 1 : 0) -  val + base_price;  
    return Price;  
    }
    else 
    {
      Price = brand_value + horsePower +
      5 * ( carAdditional.AC? 1 : 0 ) +  5 * (carAdditional.Musicsystem? 1 : 0) +  2 * (carAdditional.Autowindow? 1 : 0) +
      2 * (carAdditional.Sunroof? 1 : 0) +  2 * (carAdditional.touchScreen? 1 : 0)  +  Sevenseater * (carAdditional.Sevenseater? 1 : 0) +
      2 * (carAdditional.Reversecamera? 1 : 0) +  5 * (carAdditional.Transmission? 1 : 0) +  10 * (carAdditional.FuelType? 1 : 0) +
      2 *  (carAdditional.Airbags? 1 : 0) -  val + base_price;  
    return Price; 
    }
  } catch (error) {
    console.error(error);
  }
};
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
router.put('/brand', async (req, res) => {
  try {
    const { data } = req.body;
    const createdBrands = [];
    console.log(data); 
    data.forEach(async (item) => {  
    const { type, brand, carmodel, brand_value, base_price } = item;
    let brands = await Brand.create({
      type:type,
      brand:brand,
      carmodel:carmodel,
      brand_value:brand_value,
      base_price:base_price
    });
    let cars = await Car.findAll({
      where: {
        type: brands.type,
        brand: brands.brand,
        carmodel: brands.carmodel,
      },
    });
    cars.forEach(async (car) => {
      const carAdditional = await CarAdditional.findOne({ where: { carid: car.carid } });
      const costperhr = await pricing(car, carAdditional);
      console.log(costperhr);
      console.log(car);
      console.log(carAdditional);
      await Pricing.update(
        { costperhr: costperhr },
        { where: { carid:car.carid } }
      );
    });  
    createdBrands.push(brands);
    }); 
    res.status(200).json({ message: 'Car Brand and Value added successfully', createdBrands });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error adding Car Brand and value', error });
  }
});
router.get('/brand', async (req, res) => {
  try {
    const brands = await Brand.findAll();
    res.status(200).json({ "message": "All available brands", brands })
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error adding Car Brand and value', error });
  }
});
router.put('/update_brand', async (req, res) => {
try{  
  const { id, brand_value, base_price } = req.body;
  await Brand.update({
    brand_value:brand_value,
    base_price:base_price
  },
  { where: { id:id } }
  );
  let brands = await Brand.findOne({ where: { id: id } });
  let cars = await Car.findAll({
    where: {
      type: brands.type,
      brand: brands.brand,
      carmodel: brands.carmodel,
    },
  });
  cars.forEach(async (car) => {
    const carAdditional = await CarAdditional.findOne({ where: { carid: car.carid } });
    const costperhr = await pricing(car, carAdditional);
    await Pricing.update(
      { costperhr: costperhr },
      { where: { carid:car.carid } }
    );
  });
  res.status(200).json({ message: 'Car Brand and Value updated successfully', brands });
} catch (error) {
  console.log(error);
  res.status(500).json({ message: 'Error adding Car Brand and value', error });
}
});

router.get('/pricing', async (req, res) => {
  const pricing = await Pricing.findAll();
  res.status(200).json({ "message": "Car pricing asscoiated", pricing })
});
module.exports = router;
