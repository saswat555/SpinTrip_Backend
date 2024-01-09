module.exports = (sequelize, DataTypes) => {
    const Pricing = sequelize.define("Pricing", {
      costperhr: { type: DataTypes.FLOAT },
      carid: { type: DataTypes.INTEGER, primaryKey: true },
    });
    return Pricing;
  };