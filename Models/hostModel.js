module.exports = (sequelize, DataTypes) => {
  const Host = sequelize.define("Host", {
    id: { type: DataTypes.STRING(36), primaryKey: true }
  });

  return Host;
};