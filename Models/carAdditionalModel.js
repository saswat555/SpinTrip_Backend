module.exports = (sequelize, DataTypes) => {
    const CarAdditional = sequelize.define("CarAdditional", {
      carid: { type: DataTypes.INTEGER, primaryKey: true },
      AC: DataTypes.BOOLEAN,
      Musicsystem:DataTypes.BOOLEAN,
      Autowindow:DataTypes.BOOLEAN,
      Sunroof:DataTypes.BOOLEAN,
      Touchscreen:DataTypes.BOOLEAN,
      Sevenseater:DataTypes.BOOLEAN,
      Reversecamera:DataTypes.BOOLEAN,
      Airbags: DataTypes.BOOLEAN,
      SpareTyre: DataTypes.BOOLEAN,
      FuelType: DataTypes.BOOLEAN,
      Additionalinfo: DataTypes.TEXT,
      timestamp: DataTypes.DATE,
    });
  

  
    return CarAdditional;
  };
  