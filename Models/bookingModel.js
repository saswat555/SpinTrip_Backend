module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define("Booking", {
    Bookingid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Date: DataTypes.DATEONLY,
    carid: { type: DataTypes.INTEGER},    
    time: DataTypes.DATE,
    timestamp: DataTypes.DATE,
    id: {type: DataTypes.STRING(36)},
    status: { type: DataTypes.INTEGER,allowNull: true },
    amount: { type: DataTypes.FLOAT, allowNull: true },
    Transactionid: { type: DataTypes.STRING, unique: true },
    startTripDate: { type: DataTypes.DATEONLY, allowNull: true },
    endTripDate: { type: DataTypes.DATEONLY, allowNull: true },
    startTripTime: { type: DataTypes.TIME, allowNull: true },
    endTripTime: { type: DataTypes.TIME, allowNull: true },
  });


  return Booking;
};
