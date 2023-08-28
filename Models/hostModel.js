module.exports = (sequelize, DataTypes) => {
  const Host = sequelize.define("Host", {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    listing: DataTypes.DATE,
    Pausetime: DataTypes.DATE,
    timestamp: DataTypes.DATE,
    carid: { type: DataTypes.INTEGER }
  });

 

  return Host;
};
