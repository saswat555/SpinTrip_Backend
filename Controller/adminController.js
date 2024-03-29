// Admin and Shared Utilities
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Admin, User } = require('../Models');
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



module.exports = {
  generateOTP,
  sendOTP,
  authAdmin,
};
