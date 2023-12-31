// userRoutes.js
const express = require('express');
const { authenticate, generateToken } = require('../Middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { User, Car, UserAdditional, Listing, sequelize, Booking, Pricing } = require('../Models');
const { sendOTP, generateOTP, razorpay, client } = require('../Controller/userController');
const { Op } = require('sequelize');
const crypto = require('crypto');
const multer = require('multer');

const router = express.Router();
const upload = multer({ dest: './uploads' });

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
    return res.json({ message: 'OTP verified successfully', user, token });
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
    const additionalinfo = await UserAdditional.findByPk(userId)
    // You can include more fields as per your User model
    res.json({ phone: user.phone, role: user.id, additionalinfo: additionalinfo });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Add Profile

router.put('/profile', authenticate, upload.fields([{ name: 'aadharFile', maxCount: 1 }, { name: 'dlFile', maxCount: 1 }]), async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const additionalinfo = await UserAdditional.findByPk(userId);
    const { id, DlVerification, FullName, AadharVfid, Address, CurrentAddressVfid, ml_data } = req.body;
    let aadhar,dl;
    if (req.files && req.files.aadharFile) {
      aadhar = req.files.aadharFile[0].path;
    }
    
    if (req.files && req.files.dlFile) {
      dl = req.files.dlFile[0].path;
    }
    if(dl && aadhar){
      await client.index({
        index: 'profiles',
        id: userId,
        body: {
          aadharFilePath: aadhar,
          dlFilePath: dl,
        },
      });
      await additionalinfo.update({
        id: id,
        DlVerification: DlVerification,
        FullName: FullName,
        AadharVfid: AadharVfid,
        Address: Address,
        CurrentAddressVfid: CurrentAddressVfid,
        status: 'Pending',
        ml_data: ml_data, 
      })
      }
      else{
      await additionalinfo.update({
        id: id,
        DlVerification: DlVerification,
        FullName: FullName,
        AadharVfid: AadharVfid,
        Address: Address,
        CurrentAddressVfid: CurrentAddressVfid,
        ml_data: ml_data
      })
      }
    res.status(200).json({ message: 'Profile Updated successfully', updatedProfile: UserAdditional })
  }
  catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating profile', error: error })
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

    let user;
    // Create user based on the role
    if (role === 'user') {
      user = await User.create({ phone, password: hashedPassword });
    } else if (role === 'host') {
      user = await Host.create({ phone, password: hashedPassword });
    } else if (role === 'admin') {
      user = await Admin.create({ phone, password: hashedPassword });
    }


    UserAdditional.create({ id: user.id });
    // Respond with success message
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
});


//Get All Cars
router.get('/cars', async (req, res) => {
  const cars = await Car.findAll();
  res.status(200).json({ "message": "All available cars", cars })
})

//Find Cars
router.post('/findcars', async (req, res) => {
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
        bookingId: { [Op.eq]: null },
      },
      include: [Car],
    });


    // Extract car information from the listings
    const availableCars = availableListings.map((listing) => listing.Car);

    // Respond with the available cars
    res.status(200).json({ availableCars });
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
    const { carid, startDate, endDate, startTime, endTime } = req.body;
    const userId = req.user.userid;
    const listing = await Listing.findOne({
      where: {
        carid: carid,
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
      },
    });
    console.log(listing);
    if (listing) {
      const check_booking = await Booking.findOne({
        where: {
          carid: carid,
          [Op.and]: [{
            [Op.or]: [
              {
                [Op.and]: [
                  {
                    startTripDate: {
                      [Op.lt]: startDate,
                    },
                  },
                  {
                    endTripDate: {
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
                          { startTripDate: startDate },
                          { startTripDate: null },
                        ],
                      },
                      {

                        [Op.or]: [
                          { startTripTime: { [Op.lte]: startTime } },
                          { startTripTime: null },
                        ],
                      },
                    ],
                  },
                  {
                    [Op.and]: [
                      {
                        [Op.or]: [
                          { endTripDate: endDate },
                          { endTripDate: null },
                        ],
                      },
                      {
                        [Op.or]: [
                          { endTripTime: { [Op.gte]: endTime } },
                          { endTripTime: null },
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
              { status: { [Op.eq]: 1 } },
              { status: { [Op.eq]: 2 } },
            ],
          },
          ],
        },
      }
      );
      if (check_booking) {
        return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
      }
    }
    else {
      return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
    }
    try {
      let cph = await Pricing.findOne({where:{carid:carid}})
      let hours = calculateTripHours( startDate ,endDate, startTime, endTime );
      let amount = cph.costperhr*hours;
      let booking = await Booking.create({
        carid: carid,
        startTripDate: startDate,
        endTripDate: endDate,
        startTripTime: startTime,
        endTripTime: endTime,
        id: userId,
        status: 1,
        amount: amount
      });
      res.status(201).json({ message: 'Booking successful', booking });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing booking' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Trip-Started

router.post('/Trip-Started', authenticate, async (req, res) => {
  try {
    const { Bookingid } = req.body;
    const booking = await Booking.findOne(
      { where: { Bookingid: Bookingid, status: 1 } }
    );
    if (booking) {
      await Listing.update(
        { bookingId: Bookingid },
        { where: { carid: booking.carid } }
      );
      await Booking.update(
        { status: 2 },
        { where: { Bookingid: Bookingid } }
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
    const { Bookingid } = req.body;
    const booking = await Booking.findOne(
      { where: { Bookingid: Bookingid } }
    );
    if (booking) {
      if (booking.status === 1) {
        await Booking.update(
          { status: 4 },
          { where: { Bookingid: Bookingid } }
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

//User-Bookings
router.get('/User-Bookings', authenticate, async (req, res) => {
  try {
    let userId = req.user.userid;
    const booking = await Booking.findAll({ where: { id: userId } })
    if (booking) {
      res.status(201).json({ message: booking });
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
    const { BookingId } = req.body;
    // if (payment.status === 'captured') {
    const booking = await Booking.findOne({
      where: {
        Bookingid: BookingId,
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
        { where: { Bookingid: BookingId } }
      );
      return res.status(201).json({ message: 'booking complete', redirectTo: '/rating', BookingId });
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
    let { BookingId, rating } = req.body;
    if (!rating) {
      rating = 5;
    }
    const userId = req.user.id;
    const booking = await Booking.findOne({
      where: {
        Bookingid: BookingId,
        //id: userId,
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
    res.status(201).json(car);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

//Payment
router.post('/payment', async (req, res) => {
  try {
    const { BookingId } = req.body;
    let amount = '1';
    let currency = 'INR';
    let receipt = '1';
    razorpay.orders.create({ amount, currency, receipt },
      async (err, order) => {
        if (!err) {
          await Booking.update(
            { Transactionid: order.id },
            { amount: amount },
            { where: { Bookingid: BookingId } }
          );
          res.json(order);
        }
        else {
          res.send(err);
        }
      }
    )
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }

});

//Razorpay-webhook

router.post('/razorpay-webhook', async (req, res) => {
  try {
    const secret = 'RAZORPAY_WEBHOOK_SECRET';
    const hmac = crypto.createHmac('sha256', secret);
    const generatedSignature = hmac.update(JSON.stringify(req.body)).digest('hex');
    if (generatedSignature === req.headers['x-razorpay-signature']) {
      const Transactionid = req.body.razorpay_order_id;
      if (razorpayPaymentId) {
        try {
          const booking = await Booking.findOne({
            where: {
              Transactionid: Transactionid,
            },
          });
          if (booking) {
            res.status(200).send('Payment Successful');
          } else {
            res.status(404).send('Booking not found');
          }
        } catch (error) {
          console.error('Webhook Error:', error.message);
          res.status(500).send('Internal Server Error');
        }
      }
      else {
        res.status(404).send('Razor Payment Id not found');
      }
    }
    else {
      res.status(403).send('Invalid signature');
    }
  } catch (error) {
    console.error('Server Error');
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
