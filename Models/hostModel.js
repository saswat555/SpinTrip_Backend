module.exports = (sequelize, DataTypes) => {
  const Host = sequelize.define("Host", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
  });

  return Host;
};