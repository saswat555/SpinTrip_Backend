
const generateOTP = () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    return otp;
  };
  const sendOTP = (phone, otp) => {
    console.log(`Sending OTP ${otp} to phone number ${phone}`);
  };

  module.exports = {
    generateOTP,
    sendOTP,
   }