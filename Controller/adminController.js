const { Client } = require('@elastic/elasticsearch');
const generateOTP = () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    return otp;
  };
  const sendOTP = (phone, otp) => {
    console.log(`Sending OTP ${otp} to phone number ${phone}`);
  };

const authAdmin = async (userId) => {
    try {
      const admin = await Admin.findOne({ where: { id: userId } });
      return admin !== null;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
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
    generateOTP,
    sendOTP,
    authAdmin,
    client
}