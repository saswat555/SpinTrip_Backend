const axios = require('axios');
const generateOTP = () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    return otp;
  };
  const sendOTP = async(phone, otp) => {
    console.log(`Sending OTP ${otp} to phone number ${phone}`);
    const url = `https://2factor.in/API/V1/${process.env.SMS_API_KEY}/SMS/${phone}//${otp}/`;
    
  
    try {
      const response = await axios.get(url);
      console.log('OTP sent successfully:', response.data);
      return response.data; 
    } catch (error) {
      console.error('Error sending OTP:', error);
    }
  };

  module.exports = {
    generateOTP,
    sendOTP,
   }