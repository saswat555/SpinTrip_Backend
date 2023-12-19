// userRoutes.js
const express = require('express');
const { authenticate, generateToken } = require('../Middleware/authMiddleware');
const bcrypt = require('bcrypt');
const { User, Car, UserAdditional, Listing, sequelize, Booking} = require('../Models');
const { Op } = require('sequelize');

const router = express.Router();
const generateOTP = () => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  return otp;
};

const sendOTP = (phone, otp) => {
  // Replace this with a code to send OTP via SMS using a free SMS service for India
  // You'll need to use an external service or library to send SMS, like Twilio
  // Here, we'll simulate sending the OTP to the console for demonstration purposes
  console.log(`Sending OTP ${otp} to phone number ${phone}`);
};
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
  await user.update({otp:otp})

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
    res.json({ phone: user.phone, role: user.id , additionalinfo: additionalinfo});

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile',authenticate, async (req,res)=>{
try{
  const userId = req.user.id;
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const additionalinfo = await UserAdditional.findByPk(userId);
  const {id , DlVerification, FullName , AadharVfid,Address,CurrentAddressVfid,ml_data } = req.body;
  await additionalinfo.update({
    id:id,
    DlVerification:DlVerification,
    FullName:FullName,
    AadharVfid:AadharVfid,
    Address:Address,
    CurrentAddressVfid:CurrentAddressVfid,
    ml_data:ml_data
  })
  res.status(200).json({message: 'Profile Updated successfully', updatedProfile: UserAdditional})
}
catch(error){
  console.log(error);
  res.status(500).json({message: 'Error updating profile', error : error})
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
      user = await User.create({ phone, password: hashedPassword  });
    } else if (role === 'host') {
      user = await Host.create({ phone, password: hashedPassword });
    } else if (role === 'admin') {
      user = await Admin.create({ phone, password: hashedPassword });
    }


    UserAdditional.create({id:user.id});
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

router.post('/findcars', async (req, res) => {
  const { startDate, endDate } = req.body;
  try {
    const availableListings = await Listing.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              // Check if pausetime_start_date is after user's end_date or is null (not paused)
              {
                [Op.or]: [
                  { pausetime_start_date: { [Op.gt]: endDate } },
                  { pausetime_start_date: null },
                ],
              },
              // Check if pausetime_end_date is before user's start_date or is null (not paused)
              {
                [Op.or]: [
                  { pausetime_end_date: { [Op.lt]: startDate } },
                  { pausetime_end_date: null },
                ],
              },
            ],
          },
          {
            // Check if start_date is before or equal to user's end_date 
            [Op.or]: [
              { start_date: { [Op.lte]: startDate } },                  //Code changed Pratyay
              { start_date: null },
            ],
            // Check if end_date is after or equal to user's start_date
          },
          {
            [Op.or]: [
              { end_date: { [Op.gte]: endDate } },                        //Code changed Pratyay
              { end_date: null },
            ],
          },
          {
            bookingId: { [Op.eq]: null },                                 //Code changed Pratyay
          },
        ],
      },
      include: [Car], // Include associated car details
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
    const { carid, startDate, endDate } = req.body;
    const userId = req.user.id;
    const isCarAvailable = await Listing.findOne({
      where: {
        carid: carid,
        [Op.and]: [
          {
            [Op.or]: [
              {
                [Op.or]: [
                  { pausetime_start_date: { [Op.gt]: endDate } },
                  { pausetime_start_date: null },
                ],
              },
              {
                [Op.or]: [
                  { pausetime_end_date: { [Op.lt]: startDate } },
                  { pausetime_end_date: null },
                ],
              },
            ],
          },
          {
            [Op.or]: [
              { start_date: { [Op.lte]: startDate } },
              { start_date: null },
            ],
          },
          {
            [Op.or]: [
              { end_date: { [Op.gte]: endDate } },
              { end_date: null },
            ],
          },
          {
            bookingId: { [Op.eq]: null },
          }
        ],
      },
    });
    if (!isCarAvailable) {
      return res.status(400).json({ message: 'Selected car is not available for the specified dates' });
    }
    try {
      let booking = await Booking.create({
        carid: carid,
        startTripDate: startDate,
        endTripDate: endDate,
        id: userId,
      });

      console.log(booking);
      await Listing.update(
        { bookingId: booking.Bookingid},
        { where: { carid: carid }}
      );


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
router.post('/booking-completed', authenticate, async (req, res) => {
  try{

    const { BookingId } = req.body;
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
      { bookingId: null},
      { where: { carid: car.carid }}
    );
    return res.json({ message: 'booking complete', redirectTo: '/rating', BookingId });
  }catch(error){
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/rating', authenticate, async (req, res) => {
  try {
    let { BookingId , rating } = req.body;
    if (!rating) {
      rating = 5 ;
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
    
    let new_rating = ( parseFloat(rating) + parseFloat(car.rating * ( bookingCount - 1) ))/bookingCount;
    car.update({ rating:new_rating });
    res.status(201).json(car);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
