module.exports = (sequelize, DataTypes) => {
    const Pricing = sequelize.define("Pricing", {
      costperhr: { type: DataTypes.FLOAT },
      carid: { type: DataTypes.STRING(36), primaryKey: true },
    });
    return Pricing;
  };