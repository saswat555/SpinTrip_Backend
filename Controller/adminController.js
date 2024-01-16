// Admin and Shared Utilities
const fs = require('fs');
const path = require('path');
const solr = require('solr-client');
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

// Configure Solr client
const solrClient = solr.createClient({
  host: process.env.SOLR_HOST,
  port: process.env.SOLR_PORT,
  core: process.env.SOLR_CORE_USER, // Use appropriate core based on context
  path: '/solr'
});


module.exports = {
  generateOTP,
  sendOTP,
  authAdmin,
  solrClient,
};
