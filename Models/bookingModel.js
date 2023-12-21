module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define("Booking", {
    Bookingid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Date: DataTypes.DATEONLY,
    carid: { type: DataTypes.INTEGER},    
    time: DataTypes.DATE,
    timestamp: DataTypes.DATE,
    id: {type: DataTypes.INTEGER},
    status: { type: DataTypes.STRING },
    Transactionid: { type: DataTypes.STRING, unique: true },
    startTripDate: { type: DataTypes.DATEONLY, allowNull: true },
    endTripDate: { type: DataTypes.DATEONLY, allowNull: true },
  });


  return Booking;
};
