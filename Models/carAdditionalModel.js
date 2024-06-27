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
      PetFriendly: DataTypes.BOOLEAN,
      PowerSteering: DataTypes.BOOLEAN,
      ABS: DataTypes.BOOLEAN,
      tractionControl: DataTypes.BOOLEAN,
      fullBootSpace:  DataTypes.BOOLEAN,
      KeylessEntry: DataTypes.BOOLEAN,
      airPurifier: DataTypes.BOOLEAN,
      cruiseControl: DataTypes.BOOLEAN,
      voiceControl: DataTypes.BOOLEAN,
      usbCharger: DataTypes.BOOLEAN,
      bluetooth: DataTypes.BOOLEAN,
      airFreshner: DataTypes.BOOLEAN,
      ventelatedFrontSeat: DataTypes.BOOLEAN,
      Additionalinfo: DataTypes.TEXT,
      carimage1: DataTypes.STRING,
      carimage2: DataTypes.STRING,
      carimage3: DataTypes.STRING,
      carimage4: DataTypes.STRING,
      carimage5: DataTypes.STRING,
      verification_status: DataTypes.INTEGER,
      latitude: DataTypes.FLOAT,
      longitude: DataTypes.FLOAT,
      address: DataTypes.TEXT,
      timestamp: DataTypes.DATE,

    });
  

  
    return CarAdditional;
  };
  