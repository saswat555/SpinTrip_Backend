const axios = require('axios');
const { Booking, Transaction } = require('../Models');
require('dotenv').config();
function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
const initiatePayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findOne({ where: { Bookingid: bookingId } });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.Transactionid != null && booking.status == 1 ) {
      return res.status(200).json({ message: 'Payment Already completed' });
    }
    let amount;
    if ( booking.status == 2 ) {
      let transaction = await Transaction.findOne({ where: { Bookingid: bookingId, Transactionid: booking.Transactionid } });     
      amount = roundToTwo( booking.totalUserAmount - transaction.totalAmount );
    }
    else {
      amount = roundToTwo( booking.totalUserAmount );
    }
    const orderId = 'ORDER' + Date.now();

    const data = {
      customer_details: {
        customer_phone: '+918433745550',
        customer_email: '',
        customer_name: '',
      },
      link_notify: {
        send_sms: false,
        send_email: false,
      },
      link_amount: amount,
      link_id: orderId,
      link_currency: 'INR',
      link_purpose: 'Booking Payment',
    };
    const options = {
      method: 'POST',
      url: 'https://sandbox.cashfree.com/pg/links',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      },
      data: JSON.stringify(data),
    };
    const response = await axios.request(options);
    if (response.data.link_status === 'ACTIVE') {
      const paymentUrl = response.data.link_url;
      console.log(paymentUrl);
      await Booking.update({ Transactionid: orderId }, { where: { Bookingid: bookingId } });
      await Transaction.create({
          Transactionid: orderId,
          Bookingid: bookingId,
          id: req.user.id,
          status: 1,
          amount: booking.amount,
          GSTamount: booking.GSTAmount,
          totalAmount: booking.totalUserAmount
        });
      return res.status(200).json({ paymentUrl });
    } else {
      return res.status(400).json({ message: 'Failed to create payment link', error: response.data.message });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const checkPaymentStatus = async (req, res) => {
  try {
    const orderId = req.params['txnId'];
    console.log(orderId);
    const options = {
      method: 'GET',
      url: `https://sandbox.cashfree.com/pg/links/${orderId}`,

      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY
      }
    };

    const response = await axios.request(options);
    console.log(response);
    if (response.data.orderStatus === 'PAID') {
      const booking = await Booking.findOne({ where: { Transactionid: orderId } });
      if (booking) {
        await booking.update({ Transactionid: response.data.cf_order_id });
        return res.status(200).send({ success: true, message: "Payment Success" });
      } else {
        return res.status(404).json({ message: 'Booking not found' });
      }
    } else {
      return res.status(400).send({ success: false, message: "Payment Failure" });
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).send({ message: error.message });
  }
};


module.exports = {
  initiatePayment,
  checkPaymentStatus,
};
