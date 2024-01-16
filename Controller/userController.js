//importing modules
const bcrypt = require("bcrypt");
const db = require("../Models");
const jwt = require("jsonwebtoken");
const axios = require('axios');
const Razorpay = require('razorpay');
const client = require('solr-client'); // Adjust the path to your Solr client
const solrClient = client.createClient({
  host: process.env.SOLR_HOST,
  port: process.env.SOLR_PORT,
  core: process.env.SOLR_CORE_USER, // Use appropriate core based on context
  path: '/solr'
});

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


async function createIndex(userId, files) {
  try {
   

      var doc = { id: userId, files: [] };
      files.forEach((file, index) => {
        doc[`fileName_${index}`] = file.filename;
        doc[`filePath_${index}`] = file.path;
    });

      solrClient.add(doc, function(err, solrResponse) {
          if (err) {
              console.error('Error adding document to Solr:', err);
              throw err;
          } else {
              solrClient.commit(); // Commit changes
              console.log(solrResponse)
          }
      });
  } catch (error) {
      console.error('Error in createIndex:', error);
      throw error; // Rethrow error for the caller to handle
  }
}

module.exports = {
 signup,
 login,
 generateOTP,
 sendOTP,
 razorpay,
 createIndex
}