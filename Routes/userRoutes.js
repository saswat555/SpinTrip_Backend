// userRoutes.js
const express = require('express');
const { authenticate, generateToken } = require('../Middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { User, Car, UserAdditional, Listing, sequelize, Booking, Pricing } = require('../Models');
const { sendOTP, generateOTP } = require('../Controller/userController');
const { Op } = require('sequelize');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: 'RAZORPAY_KEY_ID',
  key_secret: 'RAZORPAY_KEY_SECRET',
});

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

router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const additionalinfo = await UserAdditional.findByPk(userId);
    const { id, DlVerification, FullName, AadharVfid, Address, CurrentAddressVfid, ml_data } = req.body;
    await additionalinfo.update({
      id: id,
      DlVerification: DlVerification,
      FullName: FullName,
      AadharVfid: AadharVfid,
      Address: Address,
      CurrentAddressVfid: CurrentAddressVfid,
      ml_data: ml_data
    })
    res.status(200).json({ message: 'Profile Updated successfully', updatedProfile: UserAdditional })
  }
  catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error updating profile', error: error })
  }
})

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

router.get('/cars', async (req, res) => {
  const cars = await Car.findAll();
  res.status(200).json({ "message": "All available cars", cars })
})

router.post('/pricing', async (req, res) => {
  const { year,
    kmTravelled,
    costPerKm,
    carid,
    carhostid } = req.body;

  const pricing = await Pricing.create({
    year,
    kmTravelled,
    costPerKm,
    carid,
    carhostid
  })

  res.status(201).json({ "message": "price for the car", pricing })
})

router.get('/pricing', async (req, res) => {
  const pricing = await Pricing.findAll();
  res.status(200).json({ "message": "Car pricing asscoiated", pricing })
})

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
          [Op.and]: [
            {
              [Op.or]: [
                { start_date: { [Op.lte]: startDate } },                  //Code changed Pratyay
                { start_date: null },
              ],
            },
            {
              [Op.or]: [
                { start_time: { [Op.lte]: startTime } },                  //Code changed Pratyay
                { start_time: null },
              ],
            }
          ],
          },
          {
            [Op.and]: [
              {
                [Op.or]: [
                  { end_date: { [Op.gte]: endDate } },
                  { end_date: null },
                ],
              },
              {
                [Op.or]: [
                  { end_time: { [Op.gte]: endTime } },                  //Code changed Pratyay
                  { end_time: null },
                ],
              }
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

router.post('/booking', authenticate, async (req, res) => {
  try {
    const { carid, startDate, endDate, startTime, endTime } = req.body;
    const userId = req.user.id;
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
          [Op.and]: [
            {
              [Op.or]: [
                { start_date: { [Op.lte]: startDate } },                  //Code changed Pratyay
                { start_date: null },
              ],
            },
            {
              [Op.or]: [
                { start_time: { [Op.lte]: startTime } },                  //Code changed Pratyay
                { start_time: null },
              ],
            }
          ],
          },
          {
            [Op.and]: [
              {
                [Op.or]: [
                  { end_date: { [Op.gte]: endDate } },
                  { end_date: null },
                ],
              },
              {
                [Op.or]: [
                  { end_time: { [Op.gte]: endTime } },                  //Code changed Pratyay
                  { end_time: null },
                ],
              }
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
          [Op.or]: [
            {
              [Op.and]: [
                { startTripDate: { [Op.gte]: startDate } },
                { startTripDate: { [Op.lte]: endDate } },
              ],
            },
            {
              [Op.and]: [
                { endTripDate: { [Op.gte]: startDate } },
                { endTripDate: { [Op.lte]: endDate } },
              ],
            },
          ],
        },
      });
      if (check_booking) {
        return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
      }
    }
    else {
      return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
    }
    try {
      let booking = await Booking.create({
        carid: carid,
        startTripDate: startDate,
        endTripDate: endDate,
        startTripTime: startTime,
        endTripTime: endTrip,
        id: userId,
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
router.post('/Trip-Started', authenticate, async (req, res) => {
  try {
    const { Bookingid } = req.body;
    const booking = await Booking.findOne(
      { where: { Bookingid: Bookingid } }
    );
    await Listing.update(
      { bookingId: Bookingid },
      { where: { carid: booking.carid } }
    );
    await Booking.update(
      { status: 'In Progress' },
      { where: { Bookingid: Bookingid } }
    );
    res.status(201).json({ message: 'Trip Has Started' });
  }
  catch (err) {
    res.status(500).json({ message: 'Server error' });
  }

});
router.post('/booking-completed', authenticate, async (req, res) => {
  try {
    const { BookingId } = req.body;
    // if (payment.status === 'captured') {
    const booking = await Booking.findOne({
      where: {
        Bookingid: BookingId,
        //id: userId,
      }
    });
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
      { status: 'Completed' },
      { where: { Bookingid: BookingId } }
    );
    return res.json({ message: 'booking complete', redirectTo: '/rating', BookingId });
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
