module.exports = (sequelize, DataTypes) => {
  const Car = sequelize.define("Car", {
    carmodel: DataTypes.STRING,
    type: DataTypes.STRING,
    brand: DataTypes.STRING,
    chassisno: DataTypes.STRING,
    Rcnumber: DataTypes.STRING,
    Enginenumber: DataTypes.STRING,
    Registrationyear: DataTypes.DATEONLY,
    bodytype: DataTypes.STRING,
    carid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
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
