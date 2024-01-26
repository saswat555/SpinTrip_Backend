const express = require('express');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { Host, Car, User, Listing, UserAdditional, Booking, CarAdditional, Pricing, Brand } = require('../Models');
const { and, TIME } = require('sequelize');
const { sendOTP, generateOTP } = require('../Controller/hostController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');


const carImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const carId = req.body.carId; 
        const uploadPath = path.join(__dirname, '../uploads/host', 'CarAdditional', carId);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const imageNumber = file.fieldname.split('_')[1]; // Assuming fieldname like 'image-1'
        cb(null, `carImage_${imageNumber}${path.extname(file.originalname)}`);
    }
});

const uploadCarImages = multer({ storage: carImageStorage }).fields(
    Array.from({ length: 5 }, (_, i) => ({ name: `carImage_${i + 1}` }))
);
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
// Host Login
router.post('/login',authenticate, async (req, res) => {
  const { phone, password } = req.body;
  try {
    const user = await User.findOne({ where: { phone } });
    const host = await Host.findOne({where: { id: user.id }});

    if (!host) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }
    const otp = generateOTP();
    sendOTP(phone, otp);
    await user.update({otp:otp})    
    return res.json({ message: 'OTP sent successfully', redirectTo: '/verify-otp', phone, otp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Verify-Otp
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ where: { phone } })
  const fixed_otp = user.otp;
  if (fixed_otp === otp) {
    const user = await User.findOne({ where: { phone } });
    const token = jwt.sign({ id: user.id, role: 'host' }, 'your_secret_key');
    return res.json({ message: 'OTP verified successfully', user, token });
  } else {
    return res.status(401).json({ message: 'Invalid OTP' });
  }
});

// Host Signup
router.post('/signup', async (req, res) => {
  var phone = req.body.phone;
  var password = req.body.password;
  try {
    const bcrypt = require("bcrypt");
    const salt = bcrypt.genSaltSync(10);
    // const hashedPassword = bcrypt.hashSync("my-password", salt);
    const hashedPassword =  await bcrypt.hash(password,salt);
    const userId = uuid.v4();
    const user = await User.create({ id: userId, phone, password: hashedPassword });
    const host = await Host.create({
      id:user.id,
      carid:null
    });

    res.status(201).json({ message: 'Host created', host});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating host' });
  }
});
// Host Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const hostId = req.user.id;
    const host = await Host.findByPk(hostId);

    if (!host) {
      return res.status(404).json({ message: 'Host not found' });
    }
    
    const cars = await Car.findAll({where:{carhostid : host.id}})
    const additionalinfo = await UserAdditional.findByPk(hostId)
    // You can include more fields as per your User model
    res.json({ hostDetails: host, cars, additionalinfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Add Car

router.post('/car',authenticate,  async (req, res) => {
    carhostid = req.user.id;
  const { carModel, 
    type,
    brand,
    chassisNo,
    rcNumber,
    engineNumber,
    registrationYear,
    bodyType,
    timeStamp } = req.body;
    
  try {
    const host = await Host.findByPk(req.user.id);
    const carhostid =  req.user.id;

    if (!host ) {
      return res.status(401).json({ message: 'No Host found' });
    }
    const carid = uuid.v4();
    const car =await Car.create({
    carModel, 
    type,
    brand,
    chassisNo,
    rcNumber,
    engineNumber,
    registrationYear,
    bodyType,
    carid,
    carhostid,
    timeStamp 
    })
    await CarAdditional.create({ carid: car.carid });
    const carAdditional = await CarAdditional.findOne({
      where: {
        carid: car.carid,
      }
    });  
    const costperhr = await pricing( car, carAdditional );
    const Price = await Pricing.findOne({ where:{ carid: car.carid }});
    let price;
    if(Price){
      price = await Pricing.update(
       { costperhr: costperhr },
       { where:{ 
          carid:car.carid
        }}
        )
    }
    else{
      price = await Pricing.create({
      costperhr: costperhr,
      carid:car.carid
      })
    }  
    const listingid = uuid.v4();
    const listing = await Listing.create({
      id: listingid,
      carid:car.carid,
      hostid:carhostid,
      details:"Null"
    })
    res.status(201).json({ message: 'Car and listing added successfully for the host', car, listing });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Adding car' });
  }
});

router.put('/carAdditional', authenticate, uploadCarImages, async (req, res) => {

  try {
    const { carId,
      horsePower,
      ac,
      musicSystem,
      autoWindow,
      sunRoof,
      touchScreen,
      sevenSeater,
      reverseCamera,
      transmission,
      airBags,
      fuelType,
      additionalInfo
      } = req.body;
    const car = await Car.findOne({ where:{carid:carId}} )
    if(!car){
      res.status(400).json({ message: 'Car not found' });
    }
    else{  

    let files = [];
    for (let i = 1; i <= 5; i++) {
        if (req.files[`carImage_${i}`]) {
            files.push(req.files[`carImage_${i}`][0]);
        }
    }
    const { carImage_1, carImage_2, carImage_3, carImage_4, carImage_5 } = req.files;
    await CarAdditional.update({
      HorsePower: horsePower,
      AC: ac,
      Musicsystem: musicSystem,
      Autowindow: autoWindow,
      Sunroof: sunRoof,
      Touchscreen: touchScreen,
      Sevenseater: sevenSeater,
      Reversecamera: reverseCamera,
      Transmission: transmission,
      Airbags: airBags,
      FuelType: fuelType,
      carimage1: carImage_1 ? carImage_1[0].destination : null,
      carimage2: carImage_2 ? carImage_2[0].destination : null,
      carimage3: carImage_3 ? carImage_3[0].destination : null,
      carimage4:  carImage_4 ? carImage_4[0].destination : null,
      carimage5: carImage_5 ? carImage_5[0].destination : null,
      verification_status: 1,
      Additionalinfo: additionalInfo
    },
    { where: { carid: carId } });

    const carAdditional = await CarAdditional.findOne({
      where: {
        carid: carId,
      }
    });  
    const costperhr = await pricing( car, carAdditional );
    const Price = await Pricing.findOne({ where:{ carid: carId }})
    let price1;
    if(Price){
      price1 = await Pricing.update(
       { costperhr: costperhr },
       { where:{ 
          carid:carId
        }}
        );
    }
    else{
      price1 = await Pricing.create({
      costperhr,
      carId,
      });
    }  
    res.status(201).json({ message: 'Car Additional added', carAdditional });
  }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Adding car Addtional Details' });
  }
});
//Listing
router.get('/listing', authenticate, async (req, res) => {
  const hostid = req.user.userid;
  const host = await Host.findOne({ where: {id:hostid}});
  if(host){
  try{
  const listing = await Listing.findAll({where: {hostid:hostid}});
  res.status(201).json({message: "Listing successfully queried", listing})
  }
  catch (error){
    console.log(error);
    res.status(500).json({ message: 'Error showing listings' });
  }
}
else{
  res.status(401).json({ message: 'Unauthorized User'});
}

});

//Delete Listing
router.delete('/listing', authenticate, async (req, res) => {
  try {
    // Get the listing ID from the request parameters
    const listingId = req.body.listingId;
    const hostid = req.user.userid;

    // Check if the authenticated user is a host
    const host = await Host.findOne({ where: { id: hostid } });
    if (!host) {
      return res.status(401).json({ message: 'Unauthorised User' });
    }

    // Find the listing
    const listing = await Listing.findOne({
      where: { id: listingId, hostid },
    });

    // If the listing doesn't exist or doesn't belong to the host, return an error
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Delete the listing
    const listing1 = await Listing.create({
      carid:carid,
      hostid:carhostid
    })    
    res.status(201).json({ message: 'Listing reset successfully' , listing1});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting listing' });
  }
});

router.post('/pricing', async (req, res) => {
  const { carId } = req.body;
  const Price = await Pricing.findOne({ where:{carid: carId}})
  res.status(201).json({ "message": "price for the car", Price })
});


//Put Listing

router.put('/listing', authenticate, async (req, res) => {
  try {
    // Get the listing ID from the request body
    const { listingId, details , startDate, startTime, endDate, endTime, pauseTimeStartDate, pauseTimeEndDate, pauseTimeEndTime, pauseTimeStartTime, hourCount } = req.body;
    const hostid = req.user.userid;
    const host = await Host.findOne({ where: { id: hostid } });
    // Check if the authenticated user is a host
    if (!host) {
      return res.status(401).json({ message: 'Unauthorized User' });
    }

    const listing = await Listing.findOne({
      where: { id: listingId, hostid: hostid},
    });

    // If the listing doesn't exist or doesn't belong to the host, return an error
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Update the listing's details
    await listing.update({ 
      details: details,
      start_date:startDate,
      start_time:startTime,
      end_date:endDate,
      end_time:endTime,
      pausetime_start_date:pauseTimeStartDate,
      pausetime_end_date:pauseTimeEndDate,
      pausetime_start_time:pauseTimeStartTime,
      pausetime_end_time:pauseTimeEndTime,
      hourcount:hourCount 
    });

    res.status(200).json({ message: 'Listing updated successfully', updatedListing: listing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating listing' });
  }
});

//Host-Bookings
router.get('/host-bookings', authenticate, async (req, res) => {
  try {
    const hostId = req.user.id;
    let bookings = await Booking.findAll({
      include: [
        {
          model: Car,
          where:  hostId ,
          attributes: [ 'carmodel', 'chassisno', 'Rcnumber', 'Enginenumber' ],
        }
      ],
    });
    const current = new Date();    
    const currentDate = current.toISOString().split('T')[0];
    const currentTime = current.toISOString().split('T')[1].split('.')[0];
    let pastBookings = [];
    let currentBookings = [];
    let futureBookings = [];
    bookings.forEach((booking) => {
      const startDate = booking.startTripDate;
      const endDate = booking.endTripDate;
      if ( endDate < currentDate ){
        pastBookings.push(booking);
      } else if ( ( startDate <= currentDate ) && ( endDate >= currentDate)) {
        currentBookings.push(booking);
      } else {
        futureBookings.push(booking);
      }
    });

    res.json({ pastBookings, currentBookings, futureBookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/rating', authenticate, async (req, res) => {
  try {
    let { bookingId , rating } = req.body;
    if (!rating) {
      rating = 5 ;
    }
    const userId = req.user.id;
    const booking = await Booking.findOne({
      where: {
        Bookingid: bookingId,
        //id: userId,
      }
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const user = await User.findOne({
      where: {
        id: booking.id,
      }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
  
    const bookingCount = await Booking.count({
      where: {
        id: booking.id,
      }
    });
    console.log(bookingCount);
    let new_rating = ( parseFloat(rating) + parseFloat(user.rating * ( bookingCount - 1 )) )/( bookingCount );
    user.update({ rating:new_rating });
    res.status(201).json( user);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/getCarAdditional', authenticate, async (req, res) => {
  const { carId } = req.body;  
  const host = await Host.findOne({ where: { id: req.user.id } });
  if (!host) {
    return res.status(401).json({ message: 'Unauthorised User' });
  }
  const carAdditional = await CarAdditional.findOne({
    where: {
      carid: carId,
    }
  });
  const userFolder = path.join('./uploads/host/CarAdditional', carId );
    if (fs.existsSync(userFolder)){
    // List all files in the car's folder
    const files = fs.readdirSync(userFolder);
    if(files){

    // Filter and create URLs for Aadhar and DL files
    let carImage_1 = files.filter(file => file.includes('carImage_1')).map(file => `http://spintrip.in/uploads/host/CarAdditional/${carId}/${file}`);
    let carImage_2 = files.filter(file => file.includes('carImage_2')).map(file => `http://spintrip.in/uploads/host/CarAdditional/${carId}/${file}`);  
    let carImage_3 = files.filter(file => file.includes('carImage_3')).map(file => `http://spintrip.in/uploads/host/CarAdditional/${carId}/${file}`); 
    let carImage_4 = files.filter(file => file.includes('carImage_4')).map(file => `http://spintrip.in/uploads/host/CarAdditional/${carId}/${file}`); 
    let carImage_5 = files.filter(file => file.includes('carImage_5')).map(file => `http://spintrip.in/uploads/host/CarAdditional/${carId}/${file}`); 

    res.json({
      carAdditional,
      carImage_1,
      carImage_2,
      carImage_3,
      carImage_4,
      carImage_5,
    });
    }
    }

  res.status(200).json({ "message": "Car Additional data", carAdditional })
});

module.exports = router;

