module.exports = (sequelize, DataTypes) => {
  const Host = sequelize.define("Host", {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    carid: { type: DataTypes.INTEGER}
  });

 

  return Host;
};
