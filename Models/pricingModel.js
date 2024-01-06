module.exports = (sequelize, DataTypes) => {
    const Pricing = sequelize.define("Pricing", {
      costperhr: { type: DataTypes.INTEGER },
      carid: { type: DataTypes.INTEGER, primaryKey: true },
    });
    return Pricing;
  };