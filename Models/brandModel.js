module.exports = (sequelize, DataTypes) => {
    const Brand = sequelize.define("Brand", {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      type: { type: DataTypes.STRING },
      brand: { type: DataTypes.STRING },
      carmodel: { type: DataTypes.STRING },
      brand_value: { type: DataTypes.INTEGER },
      base_price: { type: DataTypes.INTEGER },
      AC: { type: DataTypes.INTEGER },
      Musicsystem: { type: DataTypes.INTEGER },
      Autowindow: { type: DataTypes.INTEGER },
      Sunroof: { type: DataTypes.INTEGER },
      Touchscreen: { type: DataTypes.INTEGER },
      Sevenseater: { type: DataTypes.INTEGER },
      Reversecamera: { type: DataTypes.INTEGER },
      Transmission: { type: DataTypes.INTEGER },
      Airbags: { type: DataTypes.INTEGER },
      FuelType: { type: DataTypes.INTEGER },
      PetFriendly: { type: DataTypes.INTEGER },
      PowerSteering: { type: DataTypes.INTEGER },
      ABS: { type: DataTypes.INTEGER },
      tractionControl: { type: DataTypes.INTEGER },
      fullBootSpace:  { type: DataTypes.INTEGER },
      KeylessEntry: { type: DataTypes.INTEGER },
      airPurifier: { type: DataTypes.INTEGER },
      cruiseControl: { type: DataTypes.INTEGER },
      voiceControl: { type: DataTypes.INTEGER },
      usbCharger: { type: DataTypes.INTEGER },
      bluetooth: { type: DataTypes.INTEGER },
      airFreshner: { type: DataTypes.INTEGER },
      ventelatedFrontSeat: { type: DataTypes.INTEGER },


    });
  
  
    return Brand;
  };