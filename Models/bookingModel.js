module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define("Booking", {
    Bookingid: { type: DataTypes.INTEGER, primaryKey: true },
    Date: DataTypes.DATEONLY,
    carid: { type: DataTypes.INTEGER},    
    time: DataTypes.DATE,
    timestamp: DataTypes.DATE,
    id: {type: DataTypes.INTEGER},
    Transactionid: { type: DataTypes.STRING, unique: true },
  });


  return Booking;
};
