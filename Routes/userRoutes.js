// userRoutes.js
const express = require('express');
const uuid = require('uuid');
const { authenticate, generateToken } = require('../Middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { User, Car, Chat, UserAdditional, Listing, sequelize, Booking, Pricing, CarAdditional, Feedback, Host } = require('../Models');
const { sendOTP, generateOTP, razorpay } = require('../Controller/userController');
const { initiatePayment,checkPaymentStatus } = require('../Controller/paymentController');
const chatController = require('../Controller/chatController');

const { Op } = require('sequelize');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user.id; // Assuming req.user.id contains the user ID
    const uploadPath = path.join(__dirname, '../uploads', userId.toString());
    fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Use field name as file name
    let filename = file.fieldname + path.extname(file.originalname);
    cb(null, filename);
  }
});
const fs = require('fs');


const upload = multer({ storage: storage });
//Login
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
  await user.update({ otp: otp })
  // Redirect to verify OTP route
  return res.json({ message: 'OTP sent successfully', redirectTo: '/verify-otp', phone, otp });
});

//Verify-OTP
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ where: { phone } })
  const fixed_otp = user.otp;
  if (fixed_otp === otp) {
    const user = await User.findOne({ where: { phone } });
    const token = generateToken(user);
    const id = user.id;

    return res.json({ message: 'OTP verified successfully', id, token });
  } else {
    return res.status(401).json({ message: 'Invalid OTP' });
  }
});

//Profile


router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const additionalInfo = await UserAdditional.findByPk(userId);

    // Check if a folder exists for the user in the uploads directory

    const userFolder = path.join('./uploads', String(userId));
    if (fs.existsSync(userFolder)) {
      // List all files in the user's folder
      const files = fs.readdirSync(userFolder);
      if (files) {

        // Filter and create URLs for Aadhar and DL files
        const aadharFile = files.filter(file => file.includes('aadharFile')).map(file => `${process.env.BASE_URL}/uploads/${userId}/${file}`);
        const dlFile = files.filter(file => file.includes('dlFile')).map(file => `${process.env.BASE_URL}/uploads/${userId}/${file}`);
        const profilePic = files.filter(file => file.includes('profilePic')).map(file => `${process.env.BASE_URL}/uploads/${userId}/${file}`);
        let profile = {
          id: additionalInfo.id,
          dlNumber: additionalInfo.Dlverification,
          fullName: additionalInfo.FullName,
          email: additionalInfo.Email,
          aadharNumber: additionalInfo.AadharVfid,
          address: additionalInfo.Address,
          verificationStatus: additionalInfo.verification_status,
          dl: dlFile,
          aadhar: aadharFile,
          profilePic: profilePic
        }
        res.json({
          user: user,
          profile,
          aadharFile,
          dlFile,
          profilePic
        });
      }
      else {
        let profile = {
          id: additionalInfo.id,
          dlNumber: additionalInfo.Dlverification,
          fullName: additionalInfo.FullName,
          email: additionalInfo.Email,
          aadharNumber: additionalInfo.AadharVfid,
          address: additionalInfo.Address,
          verificationStatus: additionalInfo.verification_status,
          dl: 'null',
          aadhar: 'null',
          profilePic: 'null'
        }
        res.json({
          phone: user.phone,
          role: user.role,
          profile,

        });
      }
    }
    else {
      let profile = {
        id: additionalInfo?.id || null,
        dlNumber: additionalInfo?.Dlverification || null,
        fullName: additionalInfo?.FullName || null,
        email: additionalInfo?.Email || null,
        aadharNumber: additionalInfo?.AadharVfid || null,
        address: additionalInfo?.Address || null,
        verificationStatus: additionalInfo?.verification_status || null,
        dl: 'null',
        aadhar: 'null',
        profilePic: 'null'
      };
      res.json({
        phone: user?.phone || null,
        role: user?.role || null,
        profile,
      });
    }


  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


//Update Profile

router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update additional user information
    const { dlNumber, fullName, aadharId, email, address, currentAddressVfId, mlData } = req.body;
    await UserAdditional.update({
      id: userId,
      Dlverification: dlNumber,
      FullName: fullName,
      AadharVfid: aadharId,
      Email: email,
      Address: address,
      CurrentAddressVfid: currentAddressVfId,
      ml_data: mlData
    }, { where: { id: userId } });

    res.status(200).json({ message: 'Profile Updated successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating profile', error: error });
  }
});

router.put('/verify', authenticate, upload.fields([{ name: 'aadharFile', maxCount: 1 }, { name: 'dlFile', maxCount: 1 }, { name: 'profilePic', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let files = [];
    if (req.files) {
      if (req.files['aadharFile']) files.push(req.files['aadharFile'][0]);
      if (req.files['dlFile']) files.push(req.files['dlFile'][0]);
      if (req.files['profilePic']) files.push(req.files['profilePic'][0]);
    }


    // Update additional user information
    const { dlFile, aadharFile, profilePic } = req.files;
    if (dlFile || aadharFile) {

      // await user.update({
      //   verification_status:1
      // }, { where: { id: userId } });

      await UserAdditional.update({
        dl: dlFile[0].destination,
        aadhar: aadharFile[0].destination,
        profilepic: profilePic[0].destination,
        verification_status: 1
      }, { where: { id: userId } });
    }
    if (profilePic) {

      // await user.update({
      //   verification_status:1
      // }, { where: { id: userId } });

      await UserAdditional.update({
        profilepic: profilePic[0].destination,
      }, { where: { id: userId } });
    }

    res.status(200).json({ message: 'Profile Updated successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating profile', error: error });
  }
});

//Signup
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

    const userId = uuid.v4();
    let user;
    // Create user based on the role
    if (role === 'user') {
      user = await User.create({ id: userId, phone, password: hashedPassword, role: 'user' });
    } else if (role === 'host') {
      user = await Host.create({ id: userId, phone, password: hashedPassword, role: 'host' });
    } else if (role === 'admin') {
      user = await Admin.create({ id: userId, phone, password: hashedPassword, role: 'admin' });
    }
    let response = {
      id: user.id,
      phone: user.phone,
      role: user.role,
    }

    UserAdditional.create({ id: user.id });
    // Respond with success message
    res.status(201).json({ message: 'User created', response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
});


//Get All Cars
router.get('/cars', async (req, res) => {
  const cars = await Car.findAll();
  const pricingPromises = cars.map(async (car) => {
    const cph = await Pricing.findOne({ where: { carid: car.carid } });
    let availableCar = {
      carId: car.carid,
      carModel: car.carmodel,
      type: car.type,
      brand: car.brand,
      variant: car.variant,
      color: car.color,
      chassisNo: car.chassisno,
      mileage: car.mileage,
      registrationYear: car.Registrationyear,
      rcNumber: car.Rcnumber,
      bodyType: car.bodytype,
      hostId: car.hostId,
      rating: car.rating
    }
    if (cph) {
      const costperhr = cph.costperhr;
      // Include pricing information in the car object
      return { ...availableCar, costPerHr: costperhr };
    } else {
      return { ...availableCar, costPerHr: null };
    }
  });

  // Wait for all pricing calculations to complete
  const carsWithPricing = await Promise.all(pricingPromises);
  res.status(200).json({ "message": "All available cars", cars: carsWithPricing })
})
//chat
router.post('/chat/send', chatController.sendMessage);
router.get('/chat/:bookingId', chatController.getMessagesByBookingId);
//Find Cars
router.post('/findcars', authenticate, async (req, res) => {
  const { startDate, endDate, startTime, endTime } = req.body;
  try {
    const availableListings = await Listing.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              {
                [Op.or]: [
                  {
                    pausetime_start_date: {
                      [Op.gt]: endDate,
                    },
                  },
                  {
                    pausetime_end_date: {
                      [Op.lt]: startDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_start_date: endDate },
                          { pausetime_start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { pausetime_start_time: { [Op.gte]: endTime } },
                          { pausetime_start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_end_date: startDate },
                          { start_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { pausetime_end_time: { [Op.lte]: startTime } },
                          { pausetime_end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            [Op.or]: [
              {
                [Op.and]: [
                  {
                    start_date: {
                      [Op.lt]: startDate,
                    },
                  },
                  {
                    end_date: {
                      [Op.gt]: endDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { start_date: startDate },
                          { start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { start_time: { [Op.lte]: startTime } },
                          { start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { end_date: endDate },
                          { end_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { end_time: { [Op.gte]: endTime } },
                          { end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      include: [Car],
    });
    // Map over the listings to get cars with pricing
    const pricingPromises = availableListings.map(async (listing) => {
      // Extract carId from listing dataValues
      const carId = listing.dataValues.carid;

      // Fetch the Car data based on carId
      const car = await Car.findOne({ where: { carid: carId } });
      if (!car) {
        // Skip or handle the error appropriately if Car data is not found
        return null;
      }
      const check_booking = await Booking.findOne({
        where: {
          carid: carId,
          status: {
            [Op.in]: [1, 2]  // Assuming 1 and 2 are statuses for active bookings
          },
          [Op.or]: [
            // Case 1: The existing booking starts during the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.eq]: startDate } },
                { startTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 2: The existing booking ends during the requested period
            {
              [Op.and]: [
                { endTripDate: { [Op.eq]: endDate } },
                { endTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 3: The existing booking starts before the requested period and ends after it starts
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 4: The requested period starts during an existing booking
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: endDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: endDate } },
                        { startTripTime: { [Op.lte]: endTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 5: The existing booking completely overlaps the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: endDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: endDate } },
                        { endTripTime: { [Op.gte]: endTime } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      });
      if (check_booking) {
        return null;
      }
      const carAdditional = await CarAdditional.findOne({ where: { carid: carId } });

      // Fetch the Pricing data for the Car
      const cph = await Pricing.findOne({ where: { carid: carId } });
      let availableCar;
      const carFolder = path.join('./uploads/host/CarAdditional', carId);
      if (fs.existsSync(carFolder)) {
        const files = fs.readdirSync(carFolder);
        let carImages = files.map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${carId}/${file}`);
        availableCar = {
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
          mileage: car.mileage,
          registrationYear: car.Registrationyear,
          horsePower: carAdditional.HorsePower,
          ac: carAdditional.AC,
          musicSystem: carAdditional.Musicsystem,
          autoWindow: carAdditional.Autowindow,
          sunRoof: carAdditional.Sunroof,
          touchScreen: carAdditional.Touchscreen,
          sevenSeater: carAdditional.Sevenseater,
          reverseCamera: carAdditional.Reversecamera,
          transmission: carAdditional.Transmission,
          airBags: carAdditional.Airbags,
          latitude: '',
          longitude: '',
          fuelType: carAdditional.FuelType,
          additionalInfo: carAdditional.Additionalinfo,
          carImage1: carImages[0] ? carImages[0] : null,
          carImage2: carImages[1] ? carImages[1] : null,
          carImage3: carImages[2] ? carImages[2] : null,
          carImage4: carImages[3] ? carImages[3] : null,
          carImage5: carImages[4] ? carImages[4] : null
        }
      }
      else {
        availableCar = {
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
          mileage: car.mileage,
          registrationYear: car.Registrationyear,
          horsePower: carAdditional.HorsePower,
          ac: carAdditional.AC,
          musicSystem: carAdditional.Musicsystem,
          autoWindow: carAdditional.Autowindow,
          sunRoof: carAdditional.Sunroof,
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
          latitude: '',
          longitude: '',
          fuelType: carAdditional.FuelType,
          additionalInfo: carAdditional.Additionalinfo,
          carImage1: null,
          carImage2: null,
          carImage3: null,
          carImage4: null,
          carImage5: null
        }
      }
      if (cph) {
        const hours = calculateTripHours(startDate, endDate, startTime, endTime);
        const amount = cph.costperhr * hours;
        const costperhr = cph.costperhr;
        // Combine the Car data with the pricing information
        return { ...availableCar, pricing: { costPerHr: costperhr, hours: hours, amount: amount } };
      } else {
        // Handle the case where Pricing data is not available
        return { ...availableCar, pricing: null };
      }
    });
    const carsWithPricing = (await Promise.all(pricingPromises)).filter(car => car !== null);
    res.status(200).json({ availableCars: carsWithPricing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error finding available cars' });
  }
});


router.post('/onecar', async (req, res) => {
  const { carId, startDate, endDate, startTime, endTime } = req.body;
  try {
    const availableListings = await Listing.findOne({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              {
                [Op.or]: [
                  {
                    pausetime_start_date: {
                      [Op.gt]: endDate,
                    },
                  },
                  {
                    pausetime_end_date: {
                      [Op.lt]: startDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_start_date: endDate },
                          { pausetime_start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { pausetime_start_time: { [Op.gte]: endTime } },
                          { pausetime_start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_end_date: startDate },
                          { start_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { pausetime_end_time: { [Op.lte]: startTime } },
                          { pausetime_end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            [Op.or]: [
              {
                [Op.and]: [
                  {
                    start_date: {
                      [Op.lt]: startDate,
                    },
                  },
                  {
                    end_date: {
                      [Op.gt]: endDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { start_date: startDate },
                          { start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { start_time: { [Op.lte]: startTime } },
                          { start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { end_date: endDate },
                          { end_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { end_time: { [Op.gte]: endTime } },
                          { end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        bookingId: { [Op.eq]: null },
        carid: carId,
      },
      include: [Car],
    });
    if (availableListings) {
      // Extract car information from the listings
      const availableCars = await Car.findOne({
        where: {
          carid: availableListings.carid,
        }
      });
      const check_booking = await Booking.findOne({
        where: {
          carid: carId,
          status: {
            [Op.in]: [1, 2]  // Assuming 1 and 2 are statuses for active bookings
          },
          [Op.or]: [
            // Case 1: The existing booking starts during the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.eq]: startDate } },
                { startTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 2: The existing booking ends during the requested period
            {
              [Op.and]: [
                { endTripDate: { [Op.eq]: endDate } },
                { endTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 3: The existing booking starts before the requested period and ends after it starts
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 4: The requested period starts during an existing booking
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: endDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: endDate } },
                        { startTripTime: { [Op.lte]: endTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 5: The existing booking completely overlaps the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: endDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: endDate } },
                        { endTripTime: { [Op.gte]: endTime } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      });
      if (check_booking) {
        return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
      }
      // Calculate pricing for each available car
      const cph = await Pricing.findOne({ where: { carid: availableCars.carid } });
      let cars = {
        carId: availableCars.carid,
        carModel: availableCars.carmodel,
        type: availableCars.type,
        brand: availableCars.brand,
        variant: availableCars.variant,
        color: availableCars.color,
        chassisNo: availableCars.chassisno,
        rcNumber: availableCars.Rcnumber,
        bodyType: availableCars.bodytype,
        hostId: availableCars.hostId,
        rating: availableCars.rating,
        mileage: availableCars.mileage,
      }
      if (cph) {
        const hours = calculateTripHours(startDate, endDate, startTime, endTime);
        const amount = cph.costperhr * hours;
        const costperhr = cph.costperhr;
        // Include pricing information in the car object
        res.status(200).json({ cars, pricing: { costPerHr: costperhr, hours: hours, amount: amount } });
      } else {
        res.status(200).json({ cars, pricing: null });
      }
    }
    else {
      res.status(400).json({ message: 'Car is not available' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error finding available cars' });
  }
});

function calculateTripHours(startTripDate, endTripDate, startTripTime, endTripTime) {
  // Combine date and time into a single string for both start and end
  const startDateTimeStr = `${startTripDate} ${startTripTime}`;
  const endDateTimeStr = `${endTripDate} ${endTripTime}`;

  // Parse the date and time strings into Date objects
  const startDateTime = new Date(startDateTimeStr);
  const endDateTime = new Date(endDateTimeStr);

  // Calculate the difference in milliseconds and then convert to hours
  const diffMilliseconds = endDateTime - startDateTime;
  const diffHours = diffMilliseconds / (1000 * 60 * 60);

  return diffHours;
}

//Booking
router.post('/booking', authenticate, async (req, res) => {
  try {
    const { carId, startDate, endDate, startTime, endTime } = req.body;
    const userId = req.user.userid;
    const userAdd = await UserAdditional.findOne({
      where: {
        id: userId,
      }
    });
    // if (userAdd.verification_status != 2) {
    //   return res.status(400).json({ message: 'Your DL and Aadhar is not Approved' });
    // }
    const listing = await Listing.findOne({
      where: {
        carid: carId,
        [Op.and]: [
          {
            [Op.or]: [
              {
                [Op.or]: [
                  {
                    pausetime_start_date: {
                      [Op.gt]: endDate,
                    },
                  },
                  {
                    pausetime_end_date: {
                      [Op.lt]: startDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_start_date: endDate },
                          { pausetime_start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { pausetime_start_time: { [Op.gte]: endTime } },
                          { pausetime_start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_end_date: startDate },
                          { start_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { pausetime_end_time: { [Op.lte]: startTime } },
                          { pausetime_end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            [Op.or]: [
              {
                [Op.and]: [
                  {
                    start_date: {
                      [Op.lt]: startDate,
                    },
                  },
                  {
                    end_date: {
                      [Op.gt]: endDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { start_date: startDate },
                          { start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { start_time: { [Op.lte]: startTime } },
                          { start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { end_date: endDate },
                          { end_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { end_time: { [Op.gte]: endTime } },
                          { end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    if (listing) {
      const check_booking = await Booking.findOne({
        where: {
          carid: carId,
          status: {
            [Op.in]: [1, 2]  // Assuming 1 and 2 are statuses for active bookings
          },
          [Op.or]: [
            // Case 1: The existing booking starts during the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.eq]: startDate } },
                { startTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 2: The existing booking ends during the requested period
            {
              [Op.and]: [
                { endTripDate: { [Op.eq]: endDate } },
                { endTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 3: The existing booking starts before the requested period and ends after it starts
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 4: The requested period starts during an existing booking
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: endDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: endDate } },
                        { startTripTime: { [Op.lte]: endTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 5: The existing booking completely overlaps the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: endDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: endDate } },
                        { endTripTime: { [Op.gte]: endTime } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      });
      if (check_booking) {
        return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
      }
    }
    else {
      return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
    }
    try {
      let cph = await Pricing.findOne({ where: { carid: carId } })
      let hours = calculateTripHours(startDate, endDate, startTime, endTime);
      let amount = cph.costperhr * hours;
      const bookingid = uuid.v4();
      let booking = await Booking.create({
        Bookingid: bookingid,
        carid: carId,
        startTripDate: startDate,
        endTripDate: endDate,
        startTripTime: startTime,
        endTripTime: endTime,
        id: userId,
        status: 1,
        amount: amount
      });

      const bookings = {
        bookingId: booking.Bookingid,
        carId: booking.carid,
        id: booking.id,
        status: booking.status,
        amount: booking.amount,
        Transactionid: booking.Transactionid,
        startTripDate: booking.startTripDate,
        endTripDate: booking.endTripDate,
        startTripTime: booking.startTripTime,
        endTripTime: booking.endTripTime
      }
      req.body.bookingId = booking.Bookingid;
      req.body.userId = userId;
      req.body.amount = amount;
      //const paymentUrl = await initiatePayment(req);
      //res.status(201).json({ message: 'Booking successful', booking, paymentUrl });
      res.status(201).json({ message: 'Booking successful', bookings });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing booking' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/getCarAdditional', async (req, res) => {
  const { carId } = req.body;

  try {
    // Check if the host owns the car
    const car = await Car.findOne({ where: { carid: carId } });
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
      fuelType: carAdditional.FuelType,
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
    }
    // Path to the car's folder in the uploads directory
    const carFolder = path.join('./uploads/host/CarAdditional', carId);
    if (fs.existsSync(carFolder)) {
      // List all files in the car's folder
      const files = fs.readdirSync(carFolder);
      const carImages = files.map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${carId}/${file}`);

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

router.post('/extend-booking', authenticate, async (req, res) => {
  try {
    const { bookingId, newEndDate, newEndTime } = req.body;
    const userId = req.user.userid;

    // Check if the booking exists
    const booking = await Booking.findOne({
      where: {
        Bookingid: bookingId,
        id: userId,
        status: 2
      }
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or not active' });
    }

    // Check if the booking can be extended
    const currentEndDate = booking.endTripDate;
    const currentEndTime = booking.endTripTime;

    if (newEndDate < currentEndDate || (newEndDate === currentEndDate && newEndTime <= currentEndTime)) {
      return res.status(400).json({ message: 'New end date and time must be after the current end date and time' });
    }

    const listing = await Listing.findOne({
      where: {
        carid: booking.carid,
        [Op.and]: [
          {
            [Op.or]: [
              {
                [Op.or]: [
                  {
                    pausetime_start_date: {
                      [Op.gt]: newEndDate,
                    },
                  },
                  {
                    pausetime_end_date: {
                      [Op.lt]: booking.startTripDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_start_date: newEndDate },
                          { pausetime_start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { pausetime_start_time: { [Op.gte]: newEndTime } },
                          { pausetime_start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { pausetime_end_date: booking.startTripDate },
                          { start_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { pausetime_end_time: { [Op.lte]: booking.startTripTime } },
                          { pausetime_end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            [Op.or]: [
              {
                [Op.and]: [
                  {
                    start_date: {
                      [Op.lt]: booking.startTripDate,
                    },
                  },
                  {
                    end_date: {
                      [Op.gt]: newEndDate,
                    },
                  },
                ],
              },
              {
                [Op.or]: [
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { start_date: booking.startTripDate },
                          { start_date: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { start_time: { [Op.lte]: booking.startTripTime } },
                          { start_time: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { end_date: newEndDate },
                          { end_date: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { end_time: { [Op.gte]: newEndTime } },
                          { end_time: null },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    if (listing) {
      const check_booking = await Booking.findOne({
        where: {
          carid: carId,
          status: {
            [Op.in]: [1, 2]  // Assuming 1 and 2 are statuses for active bookings
          },
          [Op.or]: [
            // Case 1: The existing booking starts during the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.eq]: startDate } },
                { startTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 2: The existing booking ends during the requested period
            {
              [Op.and]: [
                { endTripDate: { [Op.eq]: endDate } },
                { endTripTime: { [Op.between]: [startTime, endTime] } }
              ]
            },
            // Case 3: The existing booking starts before the requested period and ends after it starts
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 4: The requested period starts during an existing booking
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: endDate } },
                { endTripDate: { [Op.gte]: startDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: endDate } },
                        { startTripTime: { [Op.lte]: endTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: startDate } },
                        { endTripTime: { [Op.gte]: startTime } }
                      ]
                    }
                  ]
                }
              ]
            },
            // Case 5: The existing booking completely overlaps the requested period
            {
              [Op.and]: [
                { startTripDate: { [Op.lte]: startDate } },
                { endTripDate: { [Op.gte]: endDate } },
                {
                  [Op.or]: [
                    {
                      [Op.and]: [
                        { startTripDate: { [Op.eq]: startDate } },
                        { startTripTime: { [Op.lte]: startTime } }
                      ]
                    },
                    {
                      [Op.and]: [
                        { endTripDate: { [Op.eq]: endDate } },
                        { endTripTime: { [Op.gte]: endTime } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      });
      if (check_booking) {
        return res.status(400).json({ message: 'Selected car is not available for extension' });
      }
    }
    else {
      return res.status(400).json({ message: 'Car is not available' })
    }
    // Calculate additional hours
    const additionalHours = calculateTripHours(currentEndDate, newEndDate, currentEndTime, newEndTime);

    // Retrieve pricing information for the car
    const cph = await Pricing.findOne({ where: { carid: booking.carid } });

    // Calculate the additional amount
    if (!cph) {
      return res.status(400).json({ message: 'Car pricing is not available' });
    }

    const additionalAmount = cph.costperhr * additionalHours;

    // Update booking with new end date, end time, and amount
    booking.endTripDate = newEndDate;
    booking.endTripTime = newEndTime;
    booking.amount += additionalAmount; // Assuming amount field exists in the Booking model

    await Booking.update(
      { endTripDate: booking.endTripDate, endTripTime: booking.endTripTime, amount: booking.amount },
      { where: { Bookingid: bookingId } });

    const bookings = {
      bookingId: booking.Bookingid,
      carId: booking.carid,
      id: booking.id,
      status: booking.status,
      amount: booking.amount,
      transactionId: booking.Transactionid,
      startTripDate: booking.startTripDate,
      endTripDate: booking.endTripDate,
      startTripTime: booking.startTripTime,
      endTripTime: booking.endTripTime,
    }

    res.status(200).json({ message: 'Booking extended successfully', bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing extend booking request' });
  }
});
//Trip-Started

router.post('/Trip-Started', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findOne(
      { where: { Bookingid: bookingId, status: 1 } }
    );
    if (booking) {
      await Listing.update(
        { bookingId: bookingId },
        { where: { carid: booking.carid } }
      );
      await Booking.update(
        { status: 2 },
        { where: { Bookingid: bookingId } }
      );
      res.status(201).json({ message: 'Trip Has Started' });
    }
    else {
      res.status(404).json({ message: 'Trip Already Started or not present' });
    }
  }
  catch (err) {
    res.status(500).json({ message: 'Server error' });
  }

});

//Cancel-Booking
router.post('/Cancel-Booking', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findOne(
      { where: { Bookingid: bookingId } }
    );
    if (booking) {
      if (booking.status === 1) {
        await Booking.update(
          { status: 4 },
          { where: { Bookingid: bookingId } }
        );
        res.status(201).json({ message: 'Trip Has been Cancelled' });
      }
      else {
        res.status(404).json({ message: 'Ride Already Started' });
      }
    }
    else {
      res.status(404).json({ message: 'Booking Not found' });
    }
  }
  catch (err) {
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
//User-Bookings
router.get('/User-Bookings', authenticate, async (req, res) => {
  try {
    let userId = req.user.userid;
    const booking = await Booking.findAll({ where: { id: userId } })
    if (booking) {
      const userBooking = booking.map(async (bookings) => {
        const carFolder = path.join('./uploads/host/CarAdditional', bookings.carid);
        const car = await Car.findOne({
          where: {
            carid: bookings.carid,
          }
        });
        if (!car) {
          return;
        }
        let bk;
        if (fs.existsSync(carFolder)) {
          const files = fs.readdirSync(carFolder);
          let carImages = files.map(file => `${process.env.BASE_URL}/uploads/host/CarAdditional/${bookings.carid}/${file}`);
          bk = {
            bookingId: bookings.Bookingid,
            carId: bookings.carid,
            id: bookings.id,
            status: bookings.status,
            amount: bookings.amount,
            transactionId: bookings.Transactionid,
            startTripDate: bookings.startTripDate,
            endTripDate: bookings.endTripDate,
            startTripTime: bookings.startTripTime,
            endTripTime: bookings.endTripTime,
            carModel: car.carmodel,
            hostId: car.hostId,
            carImage1: carImages[0] ? carImages[0] : null,
            carImage2: carImages[1] ? carImages[1] : null,
            carImage3: carImages[2] ? carImages[2] : null,
            carImage4: carImages[3] ? carImages[3] : null,
            carImage5: carImages[4] ? carImages[4] : null
          }
        }
        else {
          bk = {
            bookingId: bookings.Bookingid,
            carId: bookings.carid,
            id: bookings.id,
            status: bookings.status,
            amount: bookings.amount,
            transactionId: bookings.Transactionid,
            startTripDate: bookings.startTripDate,
            endTripDate: bookings.endTripDate,
            startTripTime: bookings.startTripTime,
            endTripTime: bookings.endTripTime,
            carModel: car.carmodel,
            hostId: car.hostId,
            carImage1: null,
            carImage2: null,
            carImage3: null,
            carImage4: null,
            carImage5: null
          }
        }
        return { ...bk };
      });
      const userBookings = await Promise.all(userBooking);
      res.status(201).json({ message: userBookings });
    }
    else {
      res.status(404).json({ message: 'Booking Not found' });
    }
  }
  catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//Booking-Completed
router.post('/booking-completed', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.body;
    // if (payment.status === 'captured') {
    const booking = await Booking.findOne({
      where: {
        Bookingid: bookingId,
        status: 2,
        //id: userId,
      }
    });
    if (booking) {
      const car = await Car.findOne({
        where: {
          carid: booking.carid,
        }
      });
      await Listing.update(
        { bookingId: null },
        { where: { carid: car.carid } }
      );
      await Booking.update(
        { status: 3 },
        { where: { Bookingid: bookingId } }
      );
      return res.status(201).json({ message: 'booking complete', redirectTo: '/rating', bookingId });
    }
    else {
      return res.status(404).json({ message: 'Start the ride to Complete Booking' });
    }
    // }
    // else {
    // Payment not successful
    // return res.status(400).json({ message: 'Payment failed' });
    // }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Rating
router.post('/rating', authenticate, async (req, res) => {
  try {
    let { bookingId, rating, feedback } = req.body;
    if (!rating) {
      rating = 5;
    }
    const userId = req.user.id;
    const user = await UserAdditional.findOne({
      where: {
        id: userId,
      }
    });
    const booking = await Booking.findOne({
      where: {
        Bookingid: bookingId,
      }
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const car = await Car.findOne({
      where: {
        carid: booking.carid,
      }
    });
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    const bookingCount = await Booking.count({
      where: {
        carid: booking.carid,
      }
    });

    let new_rating = (parseFloat(rating) + parseFloat(car.rating * (bookingCount - 1))) / bookingCount;
    car.update({ rating: new_rating });
    const car_ratings = await Car.sum('rating', {
      where: {
        hostId: car.hostId,
      }
    });
    const host = await User.update(
      { rating: car_ratings },
      { where: { id: car.hostId } }
    );
    if (feedback) {
      Feedback.create({
        carId: car.carid,
        userId: userId,
        userName: user.FullName,
        hostId: car.hostId,
        rating: rating,
        comment: feedback
      }).then(feedback => {
        res.status(201).json({ message: 'Thank you for your response' });
      }).catch(error => {
        res.status(400).json({ message: 'Error creating feedback' })
      });

    }
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Payment

// Initiate Payment Route
router.post('/payment', authenticate, initiatePayment);

// Payment Status Check Route
router.post('/status/:txnId', checkPaymentStatus);

//chat
router.get('/chat/history', authenticate, async (req, res) => {
  const { hostId } = req.query;
  const userId = req.user.id;

  try {
    const chats = await Chat.findAll({
      where: { userId, hostId },
      order: [['timestamp', 'ASC']],
    });

    res.status(200).json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

// Create a new chat message from user to host
router.post('/chat', authenticate, async (req, res) => {
  const { hostId, message } = req.body;
  const userId = req.user.id;
  let imagePath = null;

  if (req.file) {
    imagePath = `http://localhost:5000/uploads/${userId}/${req.file.filename}`;
  }

  try {
    const chat = await Chat.create({
      userId,
      hostId,
      message,
      imagePath,
    });

    res.status(201).json({ message: 'Chat message sent', chat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending chat message' });
  }
});

module.exports = router;
