module.exports = (sequelize, DataTypes) => {
  const Car = sequelize.define("Car", {
    carmodel: DataTypes.STRING,
    type: DataTypes.STRING,
    brand: DataTypes.STRING,
    variant: DataTypes.STRING,
    color: DataTypes.STRING,
    chassisno: DataTypes.STRING,
    Rcnumber: DataTypes.STRING,
    mileage: DataTypes.STRING,
    Enginenumber: DataTypes.STRING,
    Registrationyear: DataTypes.DATEONLY,
    bodytype: DataTypes.STRING,
    carid: { type: DataTypes.STRING(36), primaryKey: true },
    timestamp: DataTypes.DATE,
    rating: DataTypes.FLOAT,
    hostId: {
      type: DataTypes.STRING(36),
      references: {
        model: 'Hosts', // This should match the table name for Hosts
        key: 'id'
      }
    }
  })

  return Car;
};
