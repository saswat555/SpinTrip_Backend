module.exports = (sequelize, DataTypes) => {
  const Tax = sequelize.define("Tax", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    GST: DataTypes.FLOAT,
    TDS: DataTypes.FLOAT,
  });
  return Tax;
};
