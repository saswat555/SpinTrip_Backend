const axios = require('axios');
const crypto = require('crypto');
const { Booking } = require('../Models'); // Adjust the import as per your project structure

const initiatePayment = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    const userId = req.user.id;
    const booking = await Booking.findOne({ where: { Bookingid: bookingId } });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // if (booking.Transactionid != null) {
    //   return res.status(200).json({ message: 'Payment Already completed' });
    // }

    const merchantTransactionId = 'M' + Date.now();
    const data = {
      merchantId: process.env.MERCHANT_ID || 'PGTESTPAYUAT',
      merchantTransactionId: merchantTransactionId,
      merchantUserId: 'MUID' + userId,
      name: req.user.name,
      amount: amount * 100, // amount in paise
      redirectUrl: `http://localhost:3001/api/v1/status/${merchantTransactionId}`,
      redirectMode: 'POST',
      mobileNumber: req.user.phone,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const payload = JSON.stringify(data);
    const payloadMain = Buffer.from(payload).toString('base64');
    const keyIndex = 1; // Use the first key index
    const string = payloadMain + '/pg/v1/pay' + process.env.SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + '###' + keyIndex;

    const options = {
      method: 'POST',
      url: `${process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox'}pay`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      data: {
        request: payloadMain,
      },
    };

    await Booking.update({ Transactionid: merchantTransactionId }, { where: { Bookingid: bookingId } });

    axios.request(options).then(async (response) => {
      return res.redirect(response.data.data.instrumentResponse.redirectInfo.url);
    }).catch((error) => {
      console.error('Error initiating payment:', error);
      res.status(500).json({ message: 'Error initiating payment', error: error.message });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const checkPaymentStatus = async (req, res) => {
  try {
    const merchantTransactionId = req.params['txnId'];
    const merchantId = process.env.MERCHANT_ID || 'PGTESTPAYUAT';
    const keyIndex = 1; // Use the first key index
    const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + (process.env.SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399');
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + '###' + keyIndex;

    const options = {
      method: 'GET',
      url: `${process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox'}status/${merchantId}/${merchantTransactionId}`,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': `${merchantId}`,
      },
    };

    axios.request(options).then(async (response) => {
      if (response.data.success) {
        const booking = await Booking.findOne({ where: { Transactionid: merchantTransactionId } });
        if (booking) {
          await booking.update({ Transactionid: response.data.data.instrumentResponse.redirectInfo.token });
          return res.status(200).send({ success: true, message: "Payment Success" });
        } else {
          return res.status(404).json({ message: 'Booking not found' });
        }
      } else {
        return res.status(400).send({ success: false, message: "Payment Failure" });
      }
    }).catch((err) => {
      console.error('Error checking payment status:', err);
      res.status(500).send({ message: err.message });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send({ message: 'Server error', error: error.message });
  }
};


module.exports = {
  initiatePayment,
  checkPaymentStatus,
};
