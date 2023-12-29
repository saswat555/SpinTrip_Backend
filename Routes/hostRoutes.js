const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../Middleware/authMiddleware');
const { Host, Car, User, Listing, UserAdditional, Booking } = require('../Models');
const { and, TIME } = require('sequelize');
const { sendOTP, generateOTP } = require('../Controller/hostController');

const router = express.Router();

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
    const user = await User.create({ phone, password: hashedPassword });
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
router.post('/car', async (req, res) => {
  const { carmodel, 
    chassisno,
    Rcnumber,
    Enginenumber,
    Registrationyear,
    bodytype,
    carhostid,
    timestamp } = req.body;
    
  try {
    const host = await Host.findOne({ where: { id:carhostid } });

    if (!host) {
      return res.status(401).json({ message: 'No Host found' });
    }
    const car =await Car.create({
    carmodel, 
    chassisno,
    Rcnumber,
    Enginenumber,
    Registrationyear,
    bodytype,
    carhostid,
    timestamp 
    })
    const listing = await Listing.create({
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


//Put Listing

router.put('/listing', authenticate, async (req, res) => {
  try {
    // Get the listing ID from the request body
    const { listingId, details , start_date, start_time, end_date, end_time, pausetime_start_date, pausetime_end_date, pausetime_end_time, pausetime_start_time, hourcount } = req.body;
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
      start_date:start_date,
      start_time:start_time,
      end_date:end_date,
      end_time:end_time,
      pausetime_start_date:pausetime_start_date,
      pausetime_end_date:pausetime_end_date,
      pausetime_start_time:pausetime_start_time,
      pausetime_end_time:pausetime_end_time,
      hourcount:hourcount
      
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


module.exports = router;

