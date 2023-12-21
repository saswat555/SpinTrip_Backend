module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define("Payment", {
         id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          razorpayPaymentId: {
            type: DataTypes.STRING,
            allowNull: false,
          },
          Bookingid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true, 
          },
      });
  
      return Payment;
};