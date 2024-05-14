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
const { parseString } = require('xml2js');

const router = express.Router();

const carImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const carId = req.body.carId;
    const uploadPath = path.join(__dirname, '../uploads/host', 'CarAdditional', carId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Extracting the number from the fieldname (e.g., "carImage_1")
    const imageNumber = file.fieldname.split('_')[1];
    cb(null, `carImage_${imageNumber}${path.extname(file.originalname)}`);
  }
});

const uploadCarImages = multer({ storage: carImageStorage }).fields(
  Array.from({ length: 5 }, (_, i) => ({ name: `carImage_${i + 1}` }))
);
const pricing = async (car, carAdditional) => {
  try {
    const currentYear = new Date().getFullYear();
    let brand = await Brand.findOne({
      where: { carmodel: car.carmodel, type: car.type, brand: car.brand },
    });

    if (brand) {
      brand_value = brand.brand_value;
      base_price = brand.base_price;
    }
    else {
      brand_value = 10;
      base_price = 100;
    }

    let val, horsePower;

    if ((car.Registrationyear.substring(0, 4) < 2018)) {
      val = (currentYear - car.Registrationyear.substring(0, 4)) * 3;
    }
    else {
      val = (currentYear - car.Registrationyear.substring(0, 4)) * 1.5;
    }
    if ((carAdditional.HorsePower <= 80) || (!carAdditional.HorsePower)) {
      horsePower = 0;
    }
    else if ((carAdditional.HorsePower > 80 && carAdditional.HorsePower < 150)) {
      horsePower = 20;
    }
    else {
      horsePower = 30;
    }
    let Price;
    let Sevenseater;
    if (car.type === 'SUV') {
      Sevenseater = 30;
    }
    else {
      Sevenseater = 15;
    }
    if (car.type === 'Hatchback') {
      Price = brand_value + horsePower +
        3 * (carAdditional.AC ? 1 : 0) + 3 * (carAdditional.Musicsystem ? 1 : 0) + 2 * (carAdditional.Autowindow ? 1 : 0) +
        2 * (carAdditional.Sunroof ? 1 : 0) + 2 * (carAdditional.touchScreen ? 1 : 0) + 15 * (carAdditional.Sevenseater ? 1 : 0) +
        2 * (carAdditional.Reversecamera ? 1 : 0) + 3 * (carAdditional.Transmission ? 1 : 0) + 10 * (carAdditional.FuelType ? 1 : 0) +
        2 * (carAdditional.Airbags ? 1 : 0) - val + base_price;
      return Price;
    }
    else {
      Price = brand_value + horsePower +
        5 * (carAdditional.AC ? 1 : 0) + 5 * (carAdditional.Musicsystem ? 1 : 0) + 2 * (carAdditional.Autowindow ? 1 : 0) +
        2 * (carAdditional.Sunroof ? 1 : 0) + 2 * (carAdditional.touchScreen ? 1 : 0) + Sevenseater * (carAdditional.Sevenseater ? 1 : 0) +
        2 * (carAdditional.Reversecamera ? 1 : 0) + 5 * (carAdditional.Transmission ? 1 : 0) + 10 * (carAdditional.FuelType ? 1 : 0) +
        2 * (carAdditional.Airbags ? 1 : 0) - val + base_price;
      return Price;
    }

  } catch (error) {
    console.error(error);
  }
};
// Host Login
router.post('/login', authenticate, async (req, res) => {
  const { phone, password } = req.body;
  try {
    const user = await User.findOne({ where: { phone } });
    const host = await Host.findOne({ where: { id: user.id } });

    if (!host) {
      return res.status(401).json({ message: 'Invalid phone or password' });
    }
    const otp = generateOTP();
    sendOTP(phone, otp);
    await user.update({ otp: otp })
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
    return res.json({ message: 'OTP verified successfully', id: user.id, token });
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
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = uuid.v4();
    const user = await User.create({ id: userId, phone, password: hashedPassword, role: 'Host' });
    const host = await Host.create({
      id: user.id,
      carid: null
    });
    let response = {
      id: user.id,
      phone: user.phone,
      role: user.role,
    }
    res.status(201).json({ message: 'Host created', response });
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

    const cars = await Car.findAll({ where: { hostId: host.id } })
    const additionalinfo = await UserAdditional.findByPk(hostId)
    // You can include more fields as per your User model
    res.json({ hostDetails: host, cars, additionalinfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Add Car
router.post('/car', authenticate, async (req, res) => {
  const {
    carModel,
    type,
    variant,
    color,
    brand,
    chassisNo,
    rcNumber,
    engineNumber,
    registrationYear,
    bodyType,
    timeStamp } = req.body;

  try {
    const host = await Host.findByPk(req.user.id);
    const carhostid = req.user.id;

    if (!host) {
      return res.status(401).json({ message: 'No Host found' });
    }
    const carid = uuid.v4();
    const car = await Car.create({
      carmodel: carModel,
      type: type,
      brand: brand,
      variant: variant,
      color: color,
      chassisno: chassisNo,
      Rcnumber: rcNumber,
      Enginenumber: engineNumber,
      Registrationyear: registrationYear,
      bodytype: bodyType,
      carid: carid,
      hostId: carhostid,
      timestamp: timeStamp
    })
    await CarAdditional.create({ carid: car.carid });
    const carAdditional = await CarAdditional.findOne({
      where: {
        carid: car.carid,
      }
    });
    const costperhr = await pricing(car, carAdditional);
    const Price = await Pricing.findOne({ where: { carid: car.carid } });
    var price;
    if (Price) {
      price = await Pricing.update(
        { costperhr: costperhr },
        {
          where: {
            carid: car.carid
          }
        }
      )
    }
    else {
      price = await Pricing.create({
        costperhr: costperhr,
        carid: car.carid
      })
    }
    const listingid = uuid.v4();
    const listing = await Listing.create({
      id: listingid,
      carid: car.carid,
      hostid: carhostid,
    })

    let postedCar = {
      carId: car.carid,
      carModel: car.carmodel,
      type: car.type,
      brand: car.brand,
      variant: car.variant,
      color: car.color,
      chassisNo: car.chassisno,
      rcNumber: car.Rcnumber,
      bodyType: car.bodytype,
      hostId: car.hostId,
      rating: car.rating,
      listingId: listing.id,
    }
    res.status(201).json({ message: 'Car and listing added successfully for the host', postedCar });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Adding car' });
  }
});

router.post('/createListing', authenticate, async (req, res) => {
  const { carId } = req.body;
  try {
    const host = await Host.findByPk(req.user.id);
    const carhostid = req.user.id;

    if (!host) {
      return res.status(401).json({ message: 'No Host found' });
    }
    const listingid = uuid.v4();
    const listings = await Listing.create({
      id: listingid,
      carid: carId,
      hostid: carhostid,
    });

    const listing = {
      id: listings.id,
      carId: listings.carid,
      hostId: listings.hostid,
      details: listings.details,
      startDate: listings.start_date,
      startTime: listings.start_time,
      endDate: listings.end_date,
      endTime: listings.end_time,
      pauseTimeStartDate: listings.pausetime_start_date,
      pauseTimeEndDate: listings.pausetime_end_date,
      pauseTimeStartTime: listings.pausetime_start_time,
      pauseTimeEndTime: listings.pausetime_end_time,
      bookingId: listings.bookingId
    }
    res.status(200).json({ message: 'Listing created successfully', listing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Adding Listing' });
  }
});

router.put('/carAdditional', authenticate, uploadCarImages, async (req, res) => {

  try {
    const {
      carId,
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
    const car = await Car.findOne({ where: { carid: carId } })
    if (!car) {
      res.status(400).json({ message: 'Car not found' });
    }
    else {

      let files = [];
      for (let i = 1; i <= 5; i++) {
        if (req.files[`image-${i}`]) {
          files.push(req.files[`image${i}`][0]);
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
        carimage4: carImage_4 ? carImage_4[0].destination : null,
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
      const costperhr = await pricing(car, carAdditional);
      const Price = await Pricing.findOne({ where: { carid: carId } })
      let price1;
      if (Price) {
        price1 = await Pricing.update(
          { costperhr: costperhr },
          {
            where: {
              carid: carId
            }
          }
        );
      }
      else {
        price1 = await Pricing.create({
          costperhr,
          carId,
        });
      }
      let carAdditionals = {
        carId: carAdditional.carid,
        horsePower: carAdditional.HorsePower,
        ac: carAdditional.AC,
        musicSystem: carAdditional.Musicsystem,
        autoWindow: carAdditional.Autowindow,
        sunroof: carAdditional.Sunroof,
        touchScreen: carAdditional.Touchscreen,
        sevenSeater: carAdditional.Sevenseater,
        reverseCamera: carAdditional.Reversecamera,
        transmission: carAdditional.Transmission,
        airBags: carAdditional.Airbags,
        carImage1: carAdditional.carimage1,
        carImage2: carAdditional.carimage2,
        carImage3: carAdditional.carimage3,
        carImage4: carAdditional.carimage4,
        carImage5: carAdditional.carimage5,
        verificationStatus: carAdditional.verification_status,
      }
      res.status(201).json({ message: 'Car Additional added', carAdditionals });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Adding car Addtional Details' });
  }
});
//Listing
router.get('/listing', authenticate, async (req, res) => {
  const hostid = req.user.userid;
  const host = await Host.findOne({ where: { id: hostid } });
  if (host) {
    try {
      const listing = await Listing.findAll({ where: { hostid: hostid } });
      const listings = listing.map(async (lstg) => {
        const lk = {
          id: lstg.id,
          carId: lstg.carid,
          hostId: lstg.hostid,
          details: lstg.details,
          startDate: lstg.start_date,
          startTime: lstg.start_time,
          endDate: lstg.end_date,
          endTime: lstg.end_time,
          pauseTimeStartDate: lstg.pausetime_start_date,
          pauseTimeEndDate: lstg.pausetime_end_date,
          pauseTimeStartTime: lstg.pausetime_start_time,
          pauseTimeEndTime: lstg.pausetime_end_time,
          bookingId: lstg.bookingId
        }
        return { ...lk };
      });
      const hostListings = await Promise.all(listings);
      console.log(hostListings);
      res.status(201).json({ message: "Listing successfully queried", hostListings })
    }
    catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Error showing listings' });
    }
  }
  else {
    res.status(401).json({ message: 'Unauthorized User' });
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
    // const listing1 = await Listing.create({
    //   carid: listing.carid,
    //   hostid: listing.carhostid
    // })
    await listing.destroy();
    res.status(201).json({ message: 'Listing reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting listing' });
  }
});

router.post('/pricing', async (req, res) => {
  try{
  const { carId } = req.body;
  const Price = await Pricing.findOne({ where: { carid: carId } })
  if(Price){
  res.status(201).json({ "message": "price for the car", carId: Price.carid , costPerHr: Price.costperhr });
  }
  else
  {
  res.status(400).json({ "message": "pricing cannot be found" });
  }
  } catch (error) {
  console.error(error);
  res.status(500).json({ message: 'Error checking Pricing' });
  }
});


//Put Listing

router.put('/listing', authenticate, async (req, res) => {
  try {
    // Get the listing ID from the request body
    const { listingId, details, startDate, startTime, endDate, endTime, pauseTimeStartDate, pauseTimeEndDate, pauseTimeEndTime, pauseTimeStartTime, hourCount } = req.body;
    const hostid = req.user.userid;
    const host = await Host.findOne({ where: { id: hostid } });
    // Check if the authenticated user is a host
    if (!host) {
      return res.status(401).json({ message: 'Unauthorized User' });
    }

    const listing = await Listing.findOne({
      where: { id: listingId, hostid: hostid },
    });

    // If the listing doesn't exist or doesn't belong to the host, return an error
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Update the listing's details
    await listing.update({
      details: details,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      pausetime_start_date: pauseTimeStartDate,
      pausetime_end_date: pauseTimeEndDate,
      pausetime_start_time: pauseTimeStartTime,
      pausetime_end_time: pauseTimeEndTime,
      hourcount: hourCount
    });

    const listings = {
      id: listing.id,
      carId: listing.carid,
      hostId: listing.hostid,
      details: listing.details,
      startDate: listing.start_date,
      startTime: listing.start_time,
      endDate: listing.end_date,
      endTime: listing.end_time,
      pauseTimeStartDate: listing.pausetime_start_date,
      pauseTimeEndDate: listing.pausetime_end_date,
      pauseTimeStartTime: listing.pausetime_start_time,
      pauseTimeEndTime: listing.pausetime_end_time,
      bookingId: listing.bookingId
    }

    res.status(200).json({ message: 'Listing updated successfully', updatedListing: listings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating listing' });
  }
});

//Host-Bookings
router.get('/host-bookings', authenticate, async (req, res) => {
  try {
    const hostid = req.user.id;
    let bookings = await Booking.findAll({
      include: [
        {
          model: Car,
          where: { hostId: hostid },
          attributes: ['carmodel', 'chassisno', 'Rcnumber', 'Enginenumber'],
        }
      ],
    });
    if(bookings){
      const hostBooking = bookings.map(async (booking) => {
      const bk = {
        bookingId: booking.BookingId,
        carId: booking.carid,
        id: booking.id,
        status: booking.status,
        amount: booking.amount,
        transactionId: booking.Transactionid,
        startTripDate: booking.startTripDate,
        endTripDate: booking.endTripDate,
        startTripTime: booking.startTripTime,
        endTripTime: booking.endTripTime
      }
      return { ...bk };
    });
    const hostBookings  = await Promise.all(hostBooking);  
    res.status(201).json( { hostBookings: hostBookings });
  }
  else{
    res.status(400).json({ message: 'No bookings found' });
  }
} catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/rating', authenticate, async (req, res) => {
  try {
    let { bookingId, rating } = req.body;
    if (!rating) {
      rating = 5;
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
    let new_rating = (parseFloat(rating) + parseFloat(user.rating * (bookingCount - 1))) / (bookingCount);
    user.update({ rating: new_rating });
    res.status(201).json('Thank you for your response');
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/getCarAdditional', authenticate, async (req, res) => {
  const { carId } = req.body;
  const hostId = req.user.id; // Assuming the host ID is part of the authenticated user details

  try {
    // Check if the host owns the car
    const car = await Car.findOne({ where: { carid: carId, hostId: hostId } });
    if (!car) {
      return res.status(404).json({ message: 'Car not found or unauthorized access' });
    }

    const carAdditional = await CarAdditional.findOne({ where: { carid: carId } });
    if (!carAdditional) {
      return res.status(404).json({ message: 'Car additional information not found' });
    }
    let carAdditionals = {
      carId: carAdditional.carid,
      horsePower: carAdditional.HorsePower,
      ac: carAdditional.AC,
      musicSystem: carAdditional.Musicsystem,
      autoWindow: carAdditional.Autowindow,
      sunroof: carAdditional.Sunroof,
      touchScreen: carAdditional.Touchscreen,
      sevenSeater: carAdditional.Sevenseater,
      reverseCamera: carAdditional.Reversecamera,
      transmission: carAdditional.Transmission,
      airBags: carAdditional.Airbags,
      carImage1: carAdditional.carimage1,
      carImage2: carAdditional.carimage2,
      carImage3: carAdditional.carimage3,
      carImage4: carAdditional.carimage4,
      carImage5: carAdditional.carimage5,
      verificationStatus: carAdditional.verification_status,
    }
    // Path to the car's folder in the uploads directory
    const carFolder = path.join('./uploads/host/CarAdditional', carId);
    if (fs.existsSync(carFolder)) {
      // List all files in the car's folder
      const files = fs.readdirSync(carFolder);
      const carImages = files.map(file => `http://54.206.23.199:2000/uploads/host/CarAdditional/${carId}/${file}`);

      res.status(200).json({
        message: "Car Additional data",
        carAdditionals,
        carImages // Including the array of car image URLs
      });
    } else {
      // If no images found, return only the car additional data
      res.status(200).json({
        message: "Car Additional data, no images found",
        carAdditionals
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/getCarReg', async (req, res) => {
  const { RegID } = req.body;
  const soapEnvelope = `
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://regcheck.org.uk">
    <soap:Header/>
    <soap:Body>
      <web:CheckIndia>
        <web:RegistrationNumber>${RegID}</web:RegistrationNumber>
        <web:username>saswat555</web:username>
      </web:CheckIndia>
    </soap:Body>
  </soap:Envelope>
`;

  try {
    const response = await fetch('https://www.regcheck.org.uk/api/reg.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"http://regcheck.org.uk/CheckIndia"'
      },
      body: soapEnvelope
    });

    const responseBody = await response.text();

    parseString(responseBody, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        res.status(500).json({ error: 'Error parsing XML' });
        return;
      }

      // Log the parsed JSON object in the specified format
      console.log(`HTTP/1.1 200 OK`);
      console.log(`Content-Type: text/xml; charset=utf-8`);
      console.log(`Content-Length: ${responseBody.length}`);
      console.log(``);
      console.log(JSON.stringify(result, null, 2));
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});
  

module.exports = router;

