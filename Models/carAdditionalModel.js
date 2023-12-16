module.exports = (sequelize, DataTypes) => {
    const CarAdditional = sequelize.define("CarAdditional", {
      addid: { type: DataTypes.INTEGER, primaryKey: true },
      Airbags: DataTypes.BOOLEAN,
      SpareTyre: DataTypes.BOOLEAN,
      Additionalinfo: DataTypes.TEXT,
      timestamp: DataTypes.DATE,
    });
  

  
    return CarAdditional;
  };
  