module.exports = (sequelize, DataTypes) => {
    const CarAdditional = sequelize.define("CarAdditional", {
      carid: { type: DataTypes.INTEGER, primaryKey: true },
      HorsePower: DataTypes.INTEGER,
      AC: DataTypes.BOOLEAN,
      Musicsystem: DataTypes.BOOLEAN,
      Autowindow: DataTypes.BOOLEAN,
      Sunroof: DataTypes.BOOLEAN,
      Touchscreen: DataTypes.BOOLEAN,
      Sevenseater: DataTypes.BOOLEAN,
      Reversecamera: DataTypes.BOOLEAN,
      Transmission: DataTypes.BOOLEAN,
      Airbags: DataTypes.BOOLEAN,
      FuelType: DataTypes.BOOLEAN,
      Additionalinfo: DataTypes.TEXT,
      timestamp: DataTypes.DATE,
    });
  

  
    return CarAdditional;
  };
  