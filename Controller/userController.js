//importing modules
const bcrypt = require("bcrypt");
const db = require("../Models");
const jwt = require("jsonwebtoken");
const Razorpay = require('razorpay');
const { Client } = require('@elastic/elasticsearch');

// Assigning users to the variable User
const User = db.users;
const sendOTP = (phone, otp) => {
  console.log(`Sending OTP ${otp} to phone number ${phone}`);
};
const generateOTP = () => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  return otp;
};

//signing a user up
//hashing users password before its saved to the database with bcrypt
const signup = async (req, res) => {
 try {
   const { email, password } = req.body;
   const data = {
     email,
     password: await bcrypt.hash(password, 10),
   };
   //saving the user
   const user = await User.create(data);

   //if user details is captured
   //generate token with the user's id and the secretKey in the env file
   // set cookie with the token generated
   if (user) {
     let token = jwt.sign({ id: user.id }, process.env.secretKey, {
       expiresIn: 1 * 24 * 60 * 60 * 1000,
     });

     res.cookie("jwt", token, { maxAge: 1 * 24 * 60 * 60, httpOnly: true });
     //send users details
     return res.status(201).send(user);
   } else {
     return res.status(409).send("Details are not correct");
   }
 } catch (error) {
   console.log(error);
 }
};


//login authentication

const login = async (req, res) => {
 try {
const { email, password } = req.body;

   //find a user by their email
   const user = await User.findOne({
     where: {
     email: email
   } 
     
   });

   //if user email is found, compare password with bcrypt
   if (user) {
     const isSame = await bcrypt.compare(password, user.password);

     //if password is the same
      //generate token with the user's id and the secretKey in the env file

     if (isSame) {
       let token = jwt.sign({ id: user.id }, process.env.secretKey, {
         expiresIn: 1 * 24 * 60 * 60 * 1000,
       });

       //if password matches wit the one in the database
       //go ahead and generate a cookie for the user
       res.cookie("jwt", token, { maxAge: 1 * 24 * 60 * 60, httpOnly: true });
       //send user data
       return res.status(201).send(user);
     } else {
       return res.status(401).send("Authentication failed");
     }
   } else {
     return res.status(401).send("Authentication failed");
   }
 } catch (error) {
   console.log(error);
 }
};
const razorpay = new Razorpay({
  key_id: 'RAZORPAY_KEY_ID',
  key_secret: 'RAZORPAY_KEY_SECRET',
});

async function createIndex() {
  try {
    const response = await client.indices.create({
      index: 'profile',
    });

    console.log('Index created successfully:', response.body);
  } catch (error) {
    console.error('Error creating index:', error.message);
  }
}
const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: 'JYkoUkHnVXcmtRX_CBBI',
  },
  tls: {
    rejectUnauthorized: false
  }
});
module.exports = {
 signup,
 login,
 generateOTP,
 sendOTP,
 razorpay,
 client
}