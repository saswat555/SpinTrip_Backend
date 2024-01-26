module.exports = (sequelize, DataTypes) => {
    const CarAdditional = sequelize.define("CarAdditional", {
      carid: { type: DataTypes.STRING(36), primaryKey: true },
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
      carimage1: DataTypes.STRING,
      carimage2: DataTypes.STRING,
      carimage3: DataTypes.STRING,
      carimage4: DataTypes.STRING,
      carimage5: DataTypes.STRING,
      verification_status: DataTypes.INTEGER,
      timestamp: DataTypes.DATE,

    });
  

  
    return CarAdditional;
  };
  