module.exports = (sequelize, DataTypes) => {
    const Pricing = sequelize.define("Pricing", {
      kmTravelled: { type: DataTypes.INTEGER},  
      costPerHr: { type: DataTypes.INTEGER},
      year: DataTypes.DATE,
      carid: { type: DataTypes.INTEGER,primaryKey: true},
      carhostid: { type: DataTypes.INTEGER,primaryKey: true},
    });

    return Pricing;
  };