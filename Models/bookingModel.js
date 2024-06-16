module.exports = (sequelize, DataTypes) => {
  const Booking = sequelize.define("Booking", {
    Bookingid: { type: DataTypes.STRING(36), primaryKey: true },
    Date: DataTypes.DATEONLY,
    carid: { type: DataTypes.STRING(36)},   
    time: DataTypes.DATE,
    timestamp: DataTypes.DATE,
    id: {type: DataTypes.STRING(36)},
    status: { type: DataTypes.INTEGER,allowNull: true },
    amount: { type: DataTypes.FLOAT, allowNull: true },
    GSTAmount: { type: DataTypes.FLOAT, allowNull: true }, 
    totalUserAmount: { type: DataTypes.FLOAT, allowNull: true },
    TDSAmount: { type: DataTypes.FLOAT, allowNull: true },
    totalHostAmount: { type: DataTypes.FLOAT, allowNull: true },
    Transactionid: { type: DataTypes.STRING, unique: true },
    startTripDate: { type: DataTypes.DATEONLY, allowNull: true },
    endTripDate: { type: DataTypes.DATEONLY, allowNull: true },
    startTripTime: { type: DataTypes.TIME, allowNull: true },
    endTripTime: { type: DataTypes.TIME, allowNull: true },
    cancelDate: { type: DataTypes.DATE, allowNull: true },
    cancelReason: { type: DataTypes.TEXT, allowNull: true },
  });


  return Booking;
};
