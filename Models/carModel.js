module.exports = (sequelize, DataTypes) => {
  const Car = sequelize.define("Car", {
    carmodel: DataTypes.STRING,
    chassisno: DataTypes.STRING,
    Rcnumber: DataTypes.STRING,
    Enginenumber: DataTypes.STRING,
    Registrationyear: DataTypes.DATEONLY,
    bodytype: DataTypes.STRING,
    carid: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    timestamp: DataTypes.DATE,
    hostId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Hosts', // This should match the table name for Hosts
        key: 'id'
      }
    }
  })

  return Car;
};
