module.exports = (sequelize, DataTypes) => {
    const Pricing = sequelize.define("Pricing", {
      costPerKm: { type: DataTypes.INTEGER },
      carid: { type: DataTypes.INTEGER, primaryKey: true},
    });

    return Pricing;
  };