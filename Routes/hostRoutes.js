const express = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');
const uuid = require('uuid');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { Sequelize, Op } = require('sequelize');
const { fn, col, sum, count } = require('sequelize');
const { Host, Car, User, Listing, UserAdditional, Booking, CarAdditional, Pricing, Brand, Feedback, carFeature, Feature, Blog } = require('../Models');
const { and, TIME } = require('sequelize');
const { sendOTP, generateOTP } = require('../Controller/hostController');
const { getAllBlogs } = require('../Controller/blogController');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('../s3Config');
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');
const sharp = require('sharp');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const router = express.Router();
const chatController = require('../Controller/chatController');
const { createSupportTicket, addSupportMessage, viewSupportChats, viewUserSupportTickets } = require('../Controller/supportController');
const csv = require('csv-parser');
const carImageStorage = multerS3({
  s3: s3,
  bucket: 'spintrip-bucket',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const carId = req.body.carId;
    const imageNumber = file.fieldname.split('_')[1];
    const fileName = `carImage_${imageNumber}${path.extname(file.originalname)}`;
    cb(null, `CarAdditional/${carId}/${fileName}`);
  }
});
const uploadCarImages = multer({ storage: carImageStorage }).fields(
  Array.from({ length: 5 }, (_, i) => ({ name: `carImage_${i + 1}` }))
);
const profileImageStorage = multerS3({
  s3: s3,
  bucket: 'spintrip-bucket',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    const userId = req.user.id;
    const fileName = `${file.fieldname}${path.extname(file.originalname)}`;
    const filePath = `${userId}/${fileName}`;
    cb(null, filePath);
  }
});

async function deleteFromS3(key) {
  try {
    const params = {
      Bucket: 'spintrip-bucket',
      Key: key,
    };

    await s3.send(new DeleteObjectCommand(params));
    console.log(`Successfully deleted ${key}`);
  } catch (error) {
    console.error(`Error deleting ${key}`, error);
  }
}
async function resizeImage(filePath) {
  try {
    await sharp(filePath)
      .resize(800, 600) // Example dimensions
      .toFile(`${filePath}-resized.jpg`);
    fs.unlinkSync(filePath); // Remove the original file
    fs.renameSync(`${filePath}-resized.jpg`, filePath); // Rename resized file to original file name
  } catch (error) {
    console.error('Error resizing image:', error);
  }
}

const upload = multer({ storage: profileImageStorage });

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
  if (!user) {
    return res.status(401).json({ message: 'Invalid Phone' });
  }
  const fixed_otp = user.otp;
  if (fixed_otp === otp) {
    const user = await User.findOne({ where: { phone } });
    const token = jwt.sign({ id: user.id, role: 'host' }, 'your_secret_key');
    return res.json({ message: 'OTP verified successfully', id: user.id, token });
  } else {
    return res.status(401).json({ message: 'Invalid OTP' });
  }
});

router.get('/get-brand', async (req, res) => {
  try {
    const brands = [];
    const csvFilePath = path.join(__dirname, '..', 'data', 'brands.csv');

    // Check if the file exists
    if (!fs.existsSync(csvFilePath)) {
      console.log(`File not found: ${csvFilePath}`);
      return res.status(404).json({ message: 'No brands found' });
    }
    console.log(`Reading file: ${csvFilePath}`);
    let brand;
    fs.createReadStream(csvFilePath)
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        if (row[1]) {
          brand = {
            brand_name: row[0],
            logo_path:  row[1]
          };
        }
        else {
          brand = {
            brand_name: row[0],
            logo_path: null
          };

        }
        console.log(`Read row: ${JSON.stringify(brand)}`);
        brands.push(brand);
      })
      .on('end', () => {
        res.status(200).json({ brands });
      })
      .on('error', (error) => {
        console.error(`Error reading file: ${error}`);
        res.status(500).json({ message: 'Error reading CSV file', error });
      });
  } catch (error) {
    console.error(`Error in try-catch: ${error}`);
    res.status(500).json({ message: 'Error fetching brands', error });
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
    UserAdditional.create({ id: user.id });
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
    const user = await User.findOne({ where: { id: hostId } });
    const cars = await Car.findAll({ where: { hostId: host.id } })
    let additionalInfo = await UserAdditional.findByPk(hostId);
    console.log(additionalInfo);
    let profile = {
      id: additionalInfo.id,
      dlNumber: additionalInfo.Dlverification,
      fullName: additionalInfo.FullName,
      email: additionalInfo.Email,
      aadharNumber: additionalInfo.AadharVfid,
      address: additionalInfo.Address,
      verificationStatus: additionalInfo.verification_status,
      phone: user.phone,
      profilePic: additionalInfo.profilepic
    }


    // You can include more fields as per your User model
    res.json({ hostDetails: host, cars, profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Add Car
router.put('/verify', authenticate, upload.fields([{ name: 'profilePic', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let files = [];
    if (req.files) {
      if (req.files['profilePic']) files.push(req.files['profilePic'][0]);
    }
    const { profilePic } = req.files;
    console.log(profilePic);
    if (profilePic) {
      await UserAdditional.update({
        profilepic: profilePic ? profilePic[0].location : null,
      }, { where: { id: userId } });
    }

    res.status(200).json({ message: 'Profile Updated successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating profile', error: error });
  }
});
router.post('/car', authenticate, async (req, res) => {
  const {
    carModel,
    type,
    variant,
    color,
    brand,
    chassisNo,
    rcNumber,
    mileage,
    engineNumber,
    registrationYear,
    bodyType,
    latitude,
    longitude,
    address,
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
      mileage: mileage,
      Enginenumber: engineNumber,
      Registrationyear: registrationYear,
      bodytype: bodyType,
      carid: carid,
      hostId: carhostid,
      timestamp: timeStamp
    })
    await CarAdditional.create({
      carid: car.carid,
      latitude: latitude,
      longitude: longitude,
      address: address
    });
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
      mileage: car.mileage,
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

//chat
router.post('/chat/send', chatController.sendMessage);
router.get('/chat/:bookingId', chatController.getMessagesByBookingId);

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
      sunroof,
      touchScreen,
      sevenSeater,
      reverseCamera,
      transmission,
      airBags,
      fuelType,
      petFriendly,
      powerSteering,
      abs,
      tractionControl,
      fullBootSpace,
      keylessEntry,
      airPurifier,
      cruiseControl,
      voiceControl,
      usbCharger,
      bluetooth,
      airFreshner,
      ventelatedFrontSeat,
      latitude,
      longitude,
      address,
      additionalInfo
    } = req.body;

    const car = await Car.findOne({ where: { carid: carId } });
    if (!car) {
      return res.status(400).json({ message: 'Car not found' });
    }

    const updateData = {
      HorsePower: horsePower,
      AC: ac,
      Musicsystem: musicSystem,
      Autowindow: autoWindow,
      Sunroof: sunroof,
      Touchscreen: touchScreen,
      Sevenseater: sevenSeater,
      Reversecamera: reverseCamera,
      Transmission: transmission,
      Airbags: airBags,
      FuelType: fuelType,
      PetFriendly: petFriendly,
      PowerSteering: powerSteering,
      ABS: abs,
      tractionControl: tractionControl,
      fullBootSpace: fullBootSpace,
      KeylessEntry: keylessEntry,
      airPurifier: airPurifier,
      cruiseControl: cruiseControl,
      voiceControl: voiceControl,
      usbCharger: usbCharger,
      bluetooth: bluetooth,
      airFreshner: airFreshner,
      ventelatedFrontSeat: ventelatedFrontSeat,
      latitude: latitude,
      longitude: longitude,
      address: address,
      Additionalinfo: additionalInfo,
    };

    const imageFields = {
      carImage_1: 'carimage1',
      carImage_2: 'carimage2',
      carImage_3: 'carimage3',
      carImage_4: 'carimage4',
      carImage_5: 'carimage5'
    };
    
    const carAdditional = await CarAdditional.findOne({ where: { carid: carId } });

    for (const [requestField, dbField] of Object.entries(imageFields)) {
      if (req.files[requestField]) {
        updateData[dbField] = req.files[requestField][0].location;
      } else if (req.body[requestField] == '') {
        const imageKey = carAdditional[dbField];
        console.log(imageKey);
        if (imageKey) {
          await deleteFromS3(imageKey);
          updateData[dbField] = null;
        }
      }
    }

    await CarAdditional.update(updateData, { where: { carid: carId } });

    const updatedCarAdditional = await CarAdditional.findOne({
      where: { carid: carId }
    });

    const costperhr = await pricing(car, updatedCarAdditional);
    const priceEntry = await Pricing.findOne({ where: { carid: carId } });
    if (priceEntry) {
      await Pricing.update({ costperhr }, { where: { carid: carId } });
    } else {
      await Pricing.create({ costperhr, carId });
    }

    const carAdditionals = {
      carId: updatedCarAdditional.carid,
      horsePower: updatedCarAdditional.HorsePower,
      ac: updatedCarAdditional.AC,
      musicSystem: updatedCarAdditional.Musicsystem,
      autoWindow: updatedCarAdditional.Autowindow,
      sunroof: updatedCarAdditional.Sunroof,
      touchScreen: updatedCarAdditional.Touchscreen,
      sevenSeater: updatedCarAdditional.Sevenseater,
      reverseCamera: updatedCarAdditional.Reversecamera,
      transmission: updatedCarAdditional.Transmission,
      airBags: updatedCarAdditional.Airbags,
      fuelType: updatedCarAdditional.FuelType,
      petFriendly: updatedCarAdditional.PetFriendly,
      powerSteering: updatedCarAdditional.PowerSteering,
      abs: updatedCarAdditional.ABS,
      tractionControl: updatedCarAdditional.tractionControl,
      fullBootSpace: updatedCarAdditional.fullBootSpace,
      keylessEntry: updatedCarAdditional.KeylessEntry,
      airPurifier: updatedCarAdditional.airPurifier,
      cruiseControl: updatedCarAdditional.CruiseControl,
      voiceControl: updatedCarAdditional.VoiceControl,
      usbCharger: updatedCarAdditional.UsbCharger,
      bluetooth: updatedCarAdditional.Bluetooth,
      airFreshner: updatedCarAdditional.AirFreshner,
      ventelatedFrontSeat: updatedCarAdditional.VentelatedFrontSeat,
      carImage1: updatedCarAdditional.carimage1,
      carImage2: updatedCarAdditional.carimage2,
      carImage3: updatedCarAdditional.carimage3,
      carImage4: updatedCarAdditional.carimage4,
      carImage5: updatedCarAdditional.carimage5,
      latitude: updatedCarAdditional.latitude,
      longitude: updatedCarAdditional.longitude,
      address: updatedCarAdditional.address,
      verificationStatus: updatedCarAdditional.verification_status,
    };

    res.status(201).json({ message: 'Car Additional added', carAdditionals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Adding car Additional Details' });
  }
});


router.post('/features', authenticate, async (req, res) => {

  try {
    const {
      featureid,
      carid,
      price
    } = req.body;
    const feature = await Feature.findOne({ where: { id: featureid } });
    if (!feature) {
      return res.status(400).json({ message: 'Feature not available' });
    }
    else {
      const car = await Car.findOne({ where: { carid: carid, hostId: req.user.id } });
      if (!car) {
        return res.status(400).json({ message: 'Car is not available' });
      }
      const carfeature = await carFeature.findOne({ where: { featureid: featureid, carid: carid } });
      if (carfeature) {
        return res.status(400).json({ message: 'Car feature already added' });
      }
      const updated_feature = await carFeature.create({
        featureid: featureid,
        carid: carid,
        price: price
      });
      let response = {
        carid: updated_feature.carid,
        featureid: updated_feature.featureid,
        price: updated_feature.price,
      }
      res.status(201).json({ message: 'Feature with Price added', response });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Adding car feature Details' });
  }
});
// Update Feature
router.put('/features', authenticate, async (req, res) => {
  try {
    const { featureid, carid, price } = req.body;

    const carFeatureRecord = await carFeature.findOne({ where: { featureid, carid } });
    if (!carFeatureRecord) {
      return res.status(404).json({ message: 'Feature not found for the car' });
    }

    const car = await Car.findOne({ where: { carid: carid, hostId: req.user.id } });
    if (!car) {
      return res.status(400).json({ message: 'Car is not available' });
    }

    await carFeatureRecord.update({ price });

    res.status(200).json({ message: 'Feature price updated successfully', carFeatureRecord });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating car feature details' });
  }
});

// Delete Feature
router.delete('/features', authenticate, async (req, res) => {
  try {
    const { featureid, carid } = req.body;

    const carFeatureRecord = await carFeature.findOne({ where: { featureid, carid } });
    if (!carFeatureRecord) {
      return res.status(404).json({ message: 'Feature not found for the car' });
    }

    const car = await Car.findOne({ where: { carid: carid, hostId: req.user.id } });
    if (!car) {
      return res.status(400).json({ message: 'Car is not available' });
    }

    await carFeatureRecord.destroy();

    res.status(200).json({ message: 'Feature deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting car feature' });
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
        let car = await Car.findOne({ where: { carid: lstg.carid, hostId: hostid } });
        if (!car) {
          return;
        }
        let carAdditional = await CarAdditional.findOne({ where: { carid: lstg.carid } });
        let lk = {
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
          bookingId: lstg.bookingId,
          rcNumber: car.Rcnumber,
          type: car.type,
          carModel: car.carmodel,
          carImage1: carAdditional.carimage1,
          carImage2: carAdditional.carimage2,
          carImage3: carAdditional.carimage3,
          carImage4: carAdditional.carimage4,
          carImage5: carAdditional.carimage5,
        }
        return { ...lk };
      });
      const hostListings = await Promise.all(listings);
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
router.get('/get-brand', async (req, res) => {
  try {
    const brands = [];
    const csvFilePath = path.join(__dirname, '..', 'data', 'brands.csv');

    // Check if the file exists
    if (!fs.existsSync(csvFilePath)) {
      console.log(`File not found: ${csvFilePath}`);
      return res.status(404).json({ message: 'No brands found' });
    }
    console.log(`Reading file: ${csvFilePath}`);
    let brand;
    fs.createReadStream(csvFilePath)
      .pipe(csv({ headers: false }))
      .on('data', (row) => {
        if (row[1]) {
          brand = {
            brand_name: row[0],
            logo_path:  row[1]
          };
        }
        else {
          brand = {
            brand_name: row[0],
            logo_path: null
          };

        }
        console.log(`Read row: ${JSON.stringify(brand)}`);
        brands.push(brand);
      })
      .on('end', () => {
        res.status(200).json({ brands });
      })
      .on('error', (error) => {
        console.error(`Error reading file: ${error}`);
        res.status(500).json({ message: 'Error reading CSV file', error });
      });
  } catch (error) {
    console.error(`Error in try-catch: ${error}`);
    res.status(500).json({ message: 'Error fetching brands', error });
  }
});
router.post('/pricing', async (req, res) => {
  try {
    const { carId } = req.body;
    const Price = await Pricing.findOne({ where: { carid: carId } })
    if (Price) {
      res.status(201).json({ "message": "price for the car", carId: Price.carid, costPerHr: Price.costperhr });
    }
    else {
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

router.get('/allfeatures', authenticate, async (req, res) => {
  try {
    const features = await Feature.findAll();
    res.status(200).json(features);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching features', error });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const hostId = req.user.id;
    const host = await Host.findByPk(hostId);
    if (!host) {
      return res.status(404).json({ message: 'Host not found' });
    }

    // Update additional user information
    const { fullName, aadharId, email, address } = req.body;
    await UserAdditional.update({
      id: hostId,
      FullName: fullName,
      AadharVfid: aadharId,
      Email: email,
      Address: address,
    }, { where: { id: hostId } });

    res.status(200).json({ message: 'Profile Updated successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating profile', error: error });
  }
});

router.post('/monthly-data', authenticate, async (req, res) => {
  const { carId } = req.body;
  try {
    const monthlyData = await Booking.findAll({
      attributes: [
        [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('endTripDate')), 'month'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalAmount'],
        [Sequelize.fn('COUNT', Sequelize.col('Bookingid')), 'numberOfBookings']
      ],
      where: {
        carid: carId,
        endTripDate: {
          [Op.ne]: null // Ensure the Date is not null
        },
        status: '3',
      },
      group: [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('endTripDate'))],
      order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('endTripDate')), 'ASC']]
    });

    const formattedMonthlyData = monthlyData.map(row => ({
      month: row.get('month'),
      totalAmount: row.get('totalAmount'),
      numberOfBookings: row.get('numberOfBookings')
    }));

    res.status(200).json({
      monthlyData: formattedMonthlyData,
    });
  } catch (error) {
    console.error('Error fetching monthly data:', error);
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
        },
        {
          model: UserAdditional,
          attributes: ['FullName'] // Assuming 'fullName' is the column name in 'UserAdditional'
        }
      ],
    });
    console.log(bookings);
    if (bookings) {
      const featureList = await Feature.findAll();
      const featureMap = featureList.reduce((map, feature) => {
        map[feature.id] = feature.featureName;
        return map;
      }, {});
      const hostBooking = bookings.map(async (booking) => {
        const car = await Car.findOne({
          where: {
            carid: booking.carid,
          }
        });
        if (!car) {
          return;
        }
        const featureDetails = (booking.features || []).map(featureId => ({
          featureId,
          featureName: featureMap[featureId] || 'Unknown Feature'
        }));
        const carAdditional = await CarAdditional.findOne({ where: { carid: booking.carid } });
        let bk = {
          bookingId: booking.Bookingid,
          carId: booking.carid,
          carModel: booking.Car.carmodel,
          id: booking.id,
          bookedBy: booking.UserAdditional ? booking.UserAdditional.FullName : null,
          status: booking.status,
          amount: booking.amount,
          tdsAmount: booking.TDSAmount,
          totalHostAmount: booking.totalHostAmount,
          transactionId: booking.Transactionid,
          startTripDate: booking.startTripDate,
          endTripDate: booking.endTripDate,
          startTripTime: booking.startTripTime,
          endTripTime: booking.endTripTime,
          carImage1: carAdditional.carimage1,
          carImage2: carAdditional.carimage2,
          carImage3: carAdditional.carimage3,
          carImage4: carAdditional.carimage4,
          carImage5: carAdditional.carimage5,
          latitude: carAdditional.latitude,
          longitude: carAdditional.longitude,
          cancelDate: booking.cancelDate,
          cancelReason: booking.cancelReason,
          features: featureDetails,
          createdAt: booking.createdAt,
        }
        return { ...bk };
      });
      const hostBookings = await Promise.all(hostBooking);
      res.status(201).json({ hostBookings: hostBookings });
    }
    else {
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
        status: 3,
      }
    });
    let new_rating;
    if( bookingCount == 1 ){
      new_rating = parseFloat(rating);     
    }
    else{
      new_rating = (parseFloat(rating) + parseFloat(user.rating * (bookingCount - 1))) / (bookingCount);
    }
    user.update({ rating: new_rating });
    res.status(201).json('Thank you for your response');
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/booking-request', authenticate, async (req, res) => {
  try {
    let bk = req.body;
    console.log(bk.bookingId);
    const booking = await Booking.findOne({
      where: {
        Bookingid: bk.bookingId,
        status: 5,
      }
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or already processed' });
    }
    if (bk.status == '1') {
      await booking.update({
        status: 1,
      });
      return res.status(201).json({ message: 'Booking confirmed by host' });
    }
    if (bk.status == '4') {
      const today = new Date();
      const cancelDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      await booking.update({
        status: 4,
        cancelDate: cancelDate,
        cancelReason: bk.CancelReason
      });
      return res.status(201).json({ message: 'Booking cancelled by host' });
    }
    return res.status(404).json({ message: 'No Action performed' });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/getFeedback', authenticate, async (req, res) => {
  try {
    const { carId } = req.body;
    const feedback = await Feedback.findAll(
      { where: { carId: carId } }
    );
    if (feedback) {
      res.status(201).json({ message: feedback });
    }
    else {
      res.status(404).json({ message: 'No Feedback present' });
    }
  }
  catch (err) {
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
    const features = await carFeature.findAll({ where: { carid: carId } });
    if (!carAdditional) {
      return res.status(404).json({ message: 'Car additional information not found' });
    }
    
    const featureList = await Feature.findAll();
    const featureMap = featureList.reduce((map, f) => (map[f.id] = f.featureName, map), {});
    
    const updatedFeatures = features.map(f => ({
      ...f.dataValues,
      featureName: featureMap[f.featureid]
    }));    


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
      petFriendly: carAdditional.PetFriendly,
      powerSteering: carAdditional.PowerSteering,
      abs: carAdditional.ABS,
      tractionControl: carAdditional.tractionControl,
      fullBootSpace: carAdditional.fullBootSpace,
      keylessEntry: carAdditional.KeylessEntry,
      airPurifier: carAdditional.airPurifier,
      cruiseControl: carAdditional.cruiseControl,
      voiceControl: carAdditional.voiceControl,
      usbCharger: carAdditional.usbCharger,
      bluetooth: carAdditional.bluetooth,
      airFreshner: carAdditional.airFreshner,
      ventelatedFrontSeat: carAdditional.ventelatedFrontSeat,
      carImage1: carAdditional.carimage1,
      carImage2: carAdditional.carimage2,
      carImage3: carAdditional.carimage3,
      carImage4: carAdditional.carimage4,
      carImage5: carAdditional.carimage5,
      verificationStatus: carAdditional.verification_status,
      latitude: carAdditional.latitude,
      longitude: carAdditional.longitude,
      rcNumber: car.Rcnumber,
      type: car.type,
      carModel: car.carmodel,
      brand: car.brand,
      mileage: car.mileage,
      registrationYear: car.Registrationyear
    };
    const carImages = [];
    if (carAdditional.carimage1) carImages.push(carAdditional.carimage1);
    if (carAdditional.carimage2) carImages.push(carAdditional.carimage2);
    if (carAdditional.carimage3) carImages.push(carAdditional.carimage3);
    if (carAdditional.carimage4) carImages.push(carAdditional.carimage4);
    if (carAdditional.carimage5) carImages.push(carAdditional.carimage5);
    if (carImages) {
      res.status(200).json({
        message: "Car Additional data",
        carAdditionals,
        carImages,
        updatedFeatures
      });
    }
    else {
      res.status(200).json({
        message: "Car Additional data, no image found",
        carAdditionals,
        updatedFeatures
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
          <web:username>Pratyay</web:username>
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

    parseString(responseBody, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        res.status(500).json({ error: 'Error parsing XML' });
        return;
      }
      try {
        console.log(result);
        const payload = result; // the parsed XML structure
        const vehicle_json_str = payload["soap:Envelope"]["soap:Body"]["CheckIndiaResponse"]["CheckIndiaResult"]["vehicleJson"];

        const vehicle_json = JSON.parse(vehicle_json_str);

        const vehicle_data = payload["soap:Envelope"]["soap:Body"]["CheckIndiaResponse"]["CheckIndiaResult"]["vehicleData"];
        const final_json = {
          Description: vehicle_data.Description,
          RegistrationYear: vehicle_data.RegistrationYear,
          CarMake: vehicle_data.CarMake.CurrentTextValue,
          CarModel: vehicle_data.CarModel,
          EngineSize: vehicle_data.EngineSize.CurrentTextValue
        };

        console.log(JSON.stringify(final_json, null, 4));
        res.status(200).json(final_json);
      } catch (error) {
        console.error('Error processing data:', error);
        res.status(500).json({ error: 'Error processing data' });
      }
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

//Support for host
// Create a support ticket
router.post('/support', authenticate, createSupportTicket);

// Add a message to a support ticket
router.post('/support/message', authenticate, addSupportMessage);

router.post('/support/supportChat', authenticate, viewSupportChats);

router.get('/support', authenticate, viewUserSupportTickets);

router.get('/view-blog',authenticate, getAllBlogs );
module.exports = router;

