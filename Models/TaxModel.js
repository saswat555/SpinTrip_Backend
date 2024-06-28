module.exports = (sequelize, DataTypes) => {
  const Tax = sequelize.define("Tax", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    GST: { type: DataTypes.FLOAT, defaultValue: 18 },
    HostGST: { type: DataTypes.FLOAT, defaultValue: 5 },
    TDS: { type: DataTypes.FLOAT, defaultValue: 1 },
    Commission: { type: DataTypes.FLOAT, defaultValue: 35 },
  });
  return Tax;
};
